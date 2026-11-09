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
import { contracts, elysium, hyperEvm, sourceChains } from "./config";
import { depositAbi, vaultAbi } from "./abis";
import { depositKey } from "./format";
import { getUsdPrices, type UsdPrices } from "./prices";

const viemChains: Record<number, Chain> = { 1: mainnet, 8453: base, 42161: arbitrum, 56: bsc, 999: hyperEvm };
/** Errors after which the deposit can never be delivered as-is, so it is refunded. */
const REFUND_ON = new Set(["OverTxCap", "OverWalletCap", "OverDailyCap", "InsufficientStock", "TransferFailed", "ZeroAddress"]);
const MAX_PER_RUN = 20;

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
  try {
    const d = await pub.readContract({ address: deposit, abi: depositAbi, functionName: "getDeposit", args: [id] });
    if (d.status !== 1) return undefined; // not pending

    const key = depositKey(src.id, deposit, id);
    const already = await ctx.elyPublic.readContract({ address: ctx.vault, abi: vaultAbi, functionName: "processed", args: [key] });
    if (already) {
      await markFulfilled("0x0000000000000000000000000000000000000000000000000000000000000000");
      return { ...tag, action: "marked" };
    }

    const amount = hypeFor(d.token, d.amount, src.id, src.usdc, ctx.prices, ctx.feeBps);
    let elyTx: Hash;
    try {
      elyTx = await ctx.elyWallet.writeContract({ address: ctx.vault, abi: vaultAbi, functionName: "dispense", args: [key, d.recipient, amount] });
      const r = await ctx.elyPublic.waitForTransactionReceipt({ hash: elyTx });
      if (r.status !== "success") throw new Error("dispense reverted");
    } catch (e) {
      const name = revertName(e);
      if (name && REFUND_ON.has(name)) {
        const h = await wallet.writeContract({ address: deposit, abi: depositAbi, functionName: "refund", args: [id] });
        await pub.waitForTransactionReceipt({ hash: h });
        return { ...tag, action: "refunded", detail: name };
      }
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
  return processOne(ctx, sc, id);
}

/** Sweeps recent deposits on every source chain. Called by cron as a safety net. */
export async function runRelayer(): Promise<RelayResult[]> {
  const ctx = await context();
  const lookback = BigInt(process.env.RELAYER_LOOKBACK_BLOCKS ?? "3000");
  const results: RelayResult[] = [];
  for (const src of sourceChains) {
    const sc = sourceClients(src.id, ctx.account);
    if (!sc) continue;
    const latest = await sc.pub.getBlockNumber();
    const fromBlock = latest > lookback ? latest - lookback : 0n;
    const logs = await sc.pub.getContractEvents({ address: sc.deposit, abi: depositAbi, eventName: "Deposited", fromBlock, toBlock: latest });
    for (const log of logs) {
      if (results.length >= MAX_PER_RUN) return results;
      const id = log.args.id;
      if (id === undefined) continue;
      const r = await processOne(ctx, sc, id);
      if (r) results.push(r);
    }
  }
  return results;
}
