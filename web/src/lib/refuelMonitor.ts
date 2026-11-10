import "server-only";
import { parseAbiItem, type Address, type Hex } from "viem";
import { depositAbi } from "./abis";
import { elysiumPublic, MULTICALL3, sourcePublic } from "./chainClients";
import { contracts } from "./config";
import { depositContracts } from "./docs";
import { depositKey } from "./format";
import { statusAbi } from "./statusAbi";

/**
 * Independent check of the relayer, run by cron and shown on /status.
 *
 * The relayer key can mark a deposit as delivered and can pay out of the vault. If that key were
 * ever misused, one of these would show up:
 *  - a deposit marked Fulfilled whose HYPE was never paid by the vault ("undelivered"),
 *  - a vault payout that matches no deposit on any chain ("unmatched"),
 *  - a deposit still pending long after it should have been delivered or refunded ("stuck").
 * The first two mean something is wrong and fail the check. "stuck" is a warning: the sender
 * can already refund themselves after 24 hours.
 */

const DEPTH = Number(process.env.MONITOR_DEPTH || 300); // newest deposits checked per chain
const LOG_BLOCKS = BigInt(process.env.MONITOR_LOG_BLOCKS || 200_000); // vault payouts checked, in Elysium blocks
const LOG_CHUNK = 20_000n;
const STUCK_AFTER = 24 * 3600;

const dispensed = parseAbiItem("event Dispensed(bytes32 indexed depositKey, address indexed to, uint256 amount)");
const VAULT_V3 = "0x259EB6eD99225907cB839C73FD2556CF6cBd9456" as Address;

export type ChainMonitor = {
  chainId: number;
  chain: string;
  address: Address;
  deposits: number;
  checked: number;
  pending: number;
  fulfilled: number;
  refunded: number;
  stuck: number[];
  undelivered: number[];
  error?: string;
};

export type MonitorReport = {
  ok: boolean;
  checkedAt: string;
  vault: Address;
  chains: ChainMonitor[];
  payouts: { scanned: string; count: number; unmatched: Hex[]; error?: string };
  problems: string[];
  warnings: string[];
};

type DepositRow = { sender: Address; recipient: Address; token: Address; amount: bigint; minOut: bigint; createdAt: bigint; status: number };

async function readChain(chainId: number, chain: string, address: Address, keys: Map<Hex, string>): Promise<ChainMonitor & { fulfilledKeys: { id: number; key: Hex }[] }> {
  const base = { chainId, chain, address, deposits: 0, checked: 0, pending: 0, fulfilled: 0, refunded: 0, stuck: [] as number[], undelivered: [] as number[], fulfilledKeys: [] as { id: number; key: Hex }[] };
  try {
    const pub = sourcePublic(chainId);
    const count = Number(await pub.readContract({ address, abi: depositAbi, functionName: "depositCount" }));
    base.deposits = count;
    const from = Math.max(0, count - DEPTH);
    const ids = Array.from({ length: count - from }, (_, i) => BigInt(from + i));
    if (!ids.length) return base;
    const res = await pub.multicall({
      contracts: ids.map((id) => ({ address, abi: depositAbi, functionName: "getDeposit" as const, args: [id] as const })),
      allowFailure: true,
      multicallAddress: MULTICALL3,
    });
    const now = Math.floor(Date.now() / 1000);
    res.forEach((r, i) => {
      if (r.status !== "success") return;
      const d = r.result as unknown as DepositRow;
      const id = Number(ids[i]);
      base.checked++;
      const key = depositKey(chainId, address, ids[i], d);
      keys.set(key.toLowerCase() as Hex, `${chain} #${id}`);
      if (d.status === 1) {
        base.pending++;
        if (now - Number(d.createdAt) > STUCK_AFTER) base.stuck.push(id);
      } else if (d.status === 2) {
        base.fulfilled++;
        base.fulfilledKeys.push({ id, key });
      } else if (d.status === 3) base.refunded++;
    });
  } catch (e) {
    return { ...base, error: (e as Error).message?.slice(0, 160) || "read failed" };
  }
  return base;
}

export async function runMonitor(): Promise<MonitorReport> {
  const vault = contracts.refuelVault ?? VAULT_V3;
  const ely = elysiumPublic();
  const keys = new Map<Hex, string>();

  const chains = await Promise.all(depositContracts.map((c) => readChain(c.chainId, c.chain, c.address as Address, keys)));

  // Every deposit marked Fulfilled must have been paid by the vault.
  const toCheck = chains.flatMap((c) => c.fulfilledKeys.map((f) => ({ c, ...f })));
  if (toCheck.length) {
    try {
      const res = await ely.multicall({
        contracts: toCheck.map((f) => ({ address: vault, abi: statusAbi, functionName: "processed" as const, args: [f.key] as const })),
        allowFailure: true,
        multicallAddress: MULTICALL3,
      });
      res.forEach((r, i) => {
        if (r.status === "success" && r.result === false) toCheck[i].c.undelivered.push(toCheck[i].id);
      });
    } catch (e) {
      chains.forEach((c) => (c.error ??= `vault check failed: ${(e as Error).message?.slice(0, 120)}`));
    }
  }

  // Every recent vault payout must match a deposit.
  const payouts: MonitorReport["payouts"] = { scanned: "", count: 0, unmatched: [] };
  try {
    const latest = await ely.getBlockNumber();
    const start = latest > LOG_BLOCKS ? latest - LOG_BLOCKS : 0n;
    payouts.scanned = `${start}–${latest}`;
    for (let from = start; from <= latest; from += LOG_CHUNK) {
      const to = from + LOG_CHUNK - 1n > latest ? latest : from + LOG_CHUNK - 1n;
      const logs = await ely.getLogs({ address: vault, event: dispensed, fromBlock: from, toBlock: to });
      for (const l of logs) {
        payouts.count++;
        const k = (l.args.depositKey ?? "0x").toLowerCase() as Hex;
        if (!keys.has(k)) payouts.unmatched.push(k);
      }
    }
  } catch (e) {
    payouts.error = (e as Error).message?.slice(0, 160) || "log scan failed";
  }

  const problems: string[] = [];
  const warnings: string[] = [];
  for (const c of chains) {
    if (c.undelivered.length) problems.push(`${c.chain}: deposit ${c.undelivered.map((i) => `#${i}`).join(", ")} marked delivered but never paid`);
    if (c.stuck.length) warnings.push(`${c.chain}: deposit ${c.stuck.map((i) => `#${i}`).join(", ")} pending over 24h (sender can self-refund)`);
    if (c.error) warnings.push(`${c.chain}: ${c.error}`);
  }
  if (payouts.unmatched.length) problems.push(`${payouts.unmatched.length} vault payout(s) match no deposit`);
  if (payouts.error) warnings.push(`Vault payouts: ${payouts.error}`);

  return {
    ok: problems.length === 0,
    checkedAt: new Date().toISOString(),
    vault,
    chains: chains.map((c) => {
      const { fulfilledKeys, ...rest } = c;
      void fulfilledKeys;
      return rest;
    }),
    payouts,
    problems,
    warnings,
  };
}
