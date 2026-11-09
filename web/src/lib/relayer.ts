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

export async function runRelayer(): Promise<RelayResult[]> {
  const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk || !contracts.refuelVault) throw new Error("Relayer is not configured (RELAYER_PRIVATE_KEY / vault address).");
  const vault = contracts.refuelVault;
  const account = privateKeyToAccount(pk);
  const feeBps = Number(process.env.REFUEL_FEE_BPS ?? "50");
  const lookback = BigInt(process.env.RELAYER_LOOKBACK_BLOCKS ?? "3000");
  const elysiumRpc = process.env.ELYSIUM_RPC_URL_SERVER || elysium.rpcUrls.default.http[0];

  const elyPublic = createPublicClient({ chain: elysium, transport: http(elysiumRpc) });
  const elyWallet = createWalletClient({ chain: elysium, transport: http(elysiumRpc), account });
  const prices = await getUsdPrices();
  const results: RelayResult[] = [];

  for (const src of sourceChains) {
    const rpc = process.env[`RPC_URL_${src.id}`];
    const deposit = src.deposit;
    const chain = viemChains[src.id];
    if (!rpc || !deposit || !chain) continue;

    const pub = createPublicClient({ chain, transport: http(rpc) });
    const wallet = createWalletClient({ chain, transport: http(rpc), account });
    const latest = await pub.getBlockNumber();
    const fromBlock = latest > lookback ? latest - lookback : 0n;
    const logs = await pub.getContractEvents({ address: deposit, abi: depositAbi, eventName: "Deposited", fromBlock, toBlock: latest });
    const markFulfilled = async (id: bigint, elysiumTx: Hash) => {
      const h = await wallet.writeContract({ address: deposit, abi: depositAbi, functionName: "markFulfilled", args: [[id], [elysiumTx]] });
      await pub.waitForTransactionReceipt({ hash: h });
    };

    for (const log of logs) {
      if (results.length >= MAX_PER_RUN) return results;
      const id = log.args.id;
      if (id === undefined) continue;
      const tag = { chain: src.name, id: id.toString() };
      try {
        const d = await pub.readContract({ address: deposit, abi: depositAbi, functionName: "getDeposit", args: [id] });
        if (d.status !== 1) continue; // not pending

        const key = depositKey(src.id, deposit, id);
        const already = await elyPublic.readContract({ address: vault, abi: vaultAbi, functionName: "processed", args: [key] });
        if (already) {
          await markFulfilled(id, "0x0000000000000000000000000000000000000000000000000000000000000000");
          results.push({ ...tag, action: "marked" });
          continue;
        }

        const amount = hypeFor(d.token, d.amount, src.id, src.usdc, prices, feeBps);
        let elyTx: Hash;
        try {
          elyTx = await elyWallet.writeContract({ address: vault, abi: vaultAbi, functionName: "dispense", args: [key, d.recipient, amount] });
          const r = await elyPublic.waitForTransactionReceipt({ hash: elyTx });
          if (r.status !== "success") throw new Error("dispense reverted");
        } catch (e) {
          const name = revertName(e);
          if (name && REFUND_ON.has(name)) {
            const h = await wallet.writeContract({ address: deposit, abi: depositAbi, functionName: "refund", args: [id] });
            await pub.waitForTransactionReceipt({ hash: h });
            results.push({ ...tag, action: "refunded", detail: name });
            continue;
          }
          throw e;
        }
        await markFulfilled(id, elyTx);
        results.push({ ...tag, action: "dispensed", detail: elyTx });
      } catch (e) {
        results.push({ ...tag, action: "error", detail: (e as Error).message?.slice(0, 200) });
      }
    }
  }
  return results;
}
