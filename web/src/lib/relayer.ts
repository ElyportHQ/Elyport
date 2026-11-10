import "server-only";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  zeroAddress,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, base, bsc, mainnet } from "viem/chains";
import { contracts, elysium, hyperEvm, robinhoodChain, sourceChains } from "./config";
import { depositAbi, vaultAbi } from "./abis";
import { depositKey } from "./format";
import { getUsdPrices, type UsdPrices } from "./prices";

const viemChains: Record<number, Chain> = { 1: mainnet, 8453: base, 42161: arbitrum, 4663: robinhoodChain, 56: bsc, 999: hyperEvm };
/** Errors after which the deposit can never be delivered as-is, so it is refunded. */
const REFUND_ON = new Set(["OverTxCap", "OverWalletCap", "OverDailyCap", "InsufficientStock", "TransferFailed", "ZeroAddress"]);
const MAX_PER_RUN = 20;
/** How many of the newest deposits each sweep looks at, per chain. Pending ones are found by id, not by block range. */
const SCAN_DEPTH = BigInt(process.env.RELAYER_SCAN_DEPTH ?? "300");
/** Blocks a deposit must be buried under before HYPE is sent, per source chain. */
const CONFIRMATIONS: Record<number, bigint> = { 1: 3n, 8453: 10n, 42161: 20n, 4663: 10n, 56: 5n, 999: 5n };
/** Must match ElyportRefuelDeposit.REFUND_DELAY. */
const REFUND_DELAY = 24 * 3600;
/** Stop delivering this long before the sender may self-refund, so a deposit is never both delivered and refunded. */
const DELIVERY_CUTOFF = REFUND_DELAY - 4 * 3600;

export type RelayResult = { chain: string; id: string; action: "dispensed" | "marked" | "refunded" | "skipped" | "error"; detail?: string };

function revertName(e: unknown): string | undefined {
  if (e instanceof BaseError) {
    const r = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName;
  }
  return undefined;
}

function hypeFor(token: Address, amount: bigint, chainId: number, usdc: Address | undefined, prices: UsdPrices, feeBps: number): bigint {
  const keep = 1 - feeBps / 10_000;
  let hype: number;
  if (chainId === 999 && token === zeroAddress) {
    hype = (Number(amount) / 1e18) * keep; // HYPE in, HYPE out
  } else {
    let usd: number;
    if (usdc && token.toLowerCase() === usdc.toLowerCase()) usd = Number(amount) / 1e6;
    else if (token === zeroAddress) {
      const native = sourceChains.find((c) => c.id === chainId)?.coingeckoId as keyof UsdPrices;
      usd = (Number(amount) / 1e18) * prices[native];
    } else throw new Error("Unsupported token");
    hype = (usd * keep) / prices.hyperliquid;
  }
  return parseEther(hype.toFixed(12));
}

async function context() {
  const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk || !contracts.refuelVault) throw new Error("Relayer is not configured (RELAYER_PRIVATE_KEY / vault address).");
  const account = privateKeyToAccount(pk);
  const elysiumRpc = process.env.ELYSIUM_RPC_URL_SERVER || elysium.rpcUrls.default.http[0];
  return {
    account,
    vault: contracts.refuelVault as Address,
    feeBps: Number(process.env.REFUEL_FEE_BPS ?? "50"),
    prices: await getUsdPrices(),
    elyPublic: createPublicClient({ chain: elysium, transport: http(elysiumRpc) }),
    elyWallet: createWalletClient({ chain: elysium, transport: http(elysiumRpc), account }),
  };
}

type Ctx = Awaited<ReturnType<typeof context>>;

function sourceClients(chainId: number, account: Ctx["account"]) {
  const src = sourceChains.find((c) => c.id === chainId);
  const rpc = process.env[`RPC_URL_${chainId}`];
  const chain = viemChains[chainId];
  if (!src || !src.deposit || !rpc || !chain) return undefined;
  return {
    src,
    deposit: src.deposit,
    pub: createPublicClient({ chain, transport: http(rpc) }),
    wallet: createWalletClient({ chain, transport: http(rpc), account }),
  };
}

/** Delivers (or refunds) one pending deposit. Safe to call repeatedly: the vault never pays a key twice. */
async function processOne(ctx: Ctx, sc: NonNullable<ReturnType<typeof sourceClients>>, id: bigint): Promise<RelayResult | undefined> {
  const { src, deposit, pub, wallet } = sc;
  const tag = { chain: src.name, id: id.toString() };
  const markFulfilled = async (elysiumTx: Hash) => {
    const h = await wallet.writeContract({ address: deposit, abi: depositAbi, functionName: "markFulfilled", args: [[id], [elysiumTx]] });
    await pub.waitForTransactionReceipt({ hash: h });
  };
  const refund = async (reason: string): Promise<RelayResult> => {
    const h = await wallet.writeContract({ address: deposit, abi: depositAbi, functionName: "refund", args: [id] });
    await pub.waitForTransactionReceipt({ hash: h });
    return { ...tag, action: "refunded", detail: reason };
  };
  try {
    const d = await pub.readContract({ address: deposit, abi: depositAbi, functionName: "getDeposit", args: [id] });
    if (d.status !== 1) return undefined; // not pending

    // Wait for confirmations: the deposit must already exist, unchanged, a few blocks back.
    const latest = await pub.getBlockNumber();
    const conf = CONFIRMATIONS[src.id] ?? 10n;
    const settled = await pub
      .readContract({ address: deposit, abi: depositAbi, functionName: "getDeposit", args: [id], blockNumber: latest > conf ? latest - conf : 0n })
      .catch(() => undefined);
    if (!settled || settled.status !== 1 || settled.sender !== d.sender || settled.amount !== d.amount || settled.recipient !== d.recipient) {
      return { ...tag, action: "skipped", detail: "waiting for confirmations" };
    }

    const key = depositKey(src.id, deposit, id, d);
    const already = await ctx.elyPublic.readContract({ address: ctx.vault, abi: vaultAbi, functionName: "processed", args: [key] });
    if (already) {
      await markFulfilled("0x0000000000000000000000000000000000000000000000000000000000000000");
      return { ...tag, action: "marked" };
    }

    // Close to the sender's own refund window: refund instead of racing it.
    if (Math.floor(Date.now() / 1000) - Number(d.createdAt) > DELIVERY_CUTOFF) return await refund("too old to deliver safely");

    const amount = hypeFor(d.token, d.amount, src.id, src.usdc, ctx.prices, ctx.feeBps);
    // The sender locked in a minimum when paying; if prices moved below it, refund instead of underpaying.
    if (amount < d.minOut) return await refund("below the sender's minimum");
    let elyTx: Hash;
    try {
      elyTx = await ctx.elyWallet.writeContract({ address: ctx.vault, abi: vaultAbi, functionName: "dispense", args: [key, d.recipient, amount] });
      const r = await ctx.elyPublic.waitForTransactionReceipt({ hash: elyTx });
      if (r.status !== "success") throw new Error("dispense reverted");
    } catch (e) {
      const name = revertName(e);
      if (name && REFUND_ON.has(name)) return await refund(name);
      throw e;
    }
    await markFulfilled(elyTx);
    return { ...tag, action: "dispensed", detail: elyTx };
  } catch (e) {
    return { ...tag, action: "error", detail: (e as Error).message?.slice(0, 200) };
  }
}

/** Processes a single deposit right after the user makes it, so refuels land without waiting for cron. */
export async function relayDeposit(chainId: number, id: bigint): Promise<RelayResult | undefined> {
  const ctx = await context();
  const sc = sourceClients(chainId, ctx.account);
  if (!sc) throw new Error("Unsupported chain.");
  // Right after payment the deposit is usually a few blocks short of confirmed: keep checking
  // for up to ~45 seconds so the user still gets HYPE quickly. Cron covers anything slower.
  const until = Date.now() + 45_000;
  for (;;) {
    const r = await processOne(ctx, sc, id);
    if (r?.action !== "skipped" || Date.now() > until) return r;
    await new Promise((res) => setTimeout(res, 4000));
  }
}

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

/** Status of each deposit id: one multicall where Multicall3 exists, small batches of plain reads otherwise. */
async function depositStatuses(sc: NonNullable<ReturnType<typeof sourceClients>>, ids: bigint[]): Promise<(number | undefined)[]> {
  const calls = ids.map((id) => ({ address: sc.deposit, abi: depositAbi, functionName: "getDeposit" as const, args: [id] as const }));
  try {
    const r = await sc.pub.multicall({ contracts: calls, allowFailure: true, multicallAddress: MULTICALL3 });
    return r.map((x) => (x.status === "success" ? Number((x.result as { status: number }).status) : undefined));
  } catch {
    const out: (number | undefined)[] = [];
    for (let i = 0; i < calls.length; i += 20) {
      const part = await Promise.all(calls.slice(i, i + 20).map((c) => sc.pub.readContract(c).then((d) => Number(d.status)).catch(() => undefined)));
      out.push(...part);
    }
    return out;
  }
}

/**
 * Sweeps every source chain for pending deposits. Called by cron as a safety net.
 * Deposits are found by id from the contract itself (newest SCAN_DEPTH), so a deposit is never
 * missed because its block fell out of a log window, however long the relayer was down.
 */
export async function runRelayer(): Promise<RelayResult[]> {
  const ctx = await context();
  const results: RelayResult[] = [];
  for (const src of sourceChains) {
    const sc = sourceClients(src.id, ctx.account);
    if (!sc) continue;
    try {
      const count = await sc.pub.readContract({ address: sc.deposit, abi: depositAbi, functionName: "depositCount" });
      const from = count > SCAN_DEPTH ? count - SCAN_DEPTH : 0n;
      const ids: bigint[] = [];
      for (let i = from; i < count; i++) ids.push(i);
      const statuses = await depositStatuses(sc, ids);
      const pending = ids.filter((_, i) => statuses[i] === 1);
      for (const id of pending) {
        if (results.length >= MAX_PER_RUN) return results;
        const r = await processOne(ctx, sc, id);
        if (r) results.push(r);
      }
    } catch (e) {
      results.push({ chain: src.name, id: "-", action: "error", detail: (e as Error).message?.slice(0, 200) });
    }
  }
  return results;
}
