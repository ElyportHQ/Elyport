import "server-only";
import { erc20Abi, type Address } from "viem";
import { contracts } from "./config";
import { lockerAbi } from "./abis";
import { elysiumClient } from "./og";
import { verifyPairs } from "./verifyPairs";

type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };

export type Safety = {
  symbol: string;
  /** Share of the token's own supply locked directly, 0..1 */
  tokenLocked: number;
  /** Best share of an LP pair's supply that is locked, 0..1 (undefined when no LP locks) */
  lpLocked?: number;
  /** Earliest unlock date among active locks (seconds) */
  nextUnlock?: number;
  /** Latest unlock date among active LP locks (seconds) */
  lpUntil?: number;
  activeLocks: number;
  /** True when LP locks exist but none of their pairs comes from a known DEX. */
  unverifiedLpOnly?: boolean;
};

const ratio = (a: bigint, b: bigint) => (b > 0n ? Number((a * 1_000_000n) / b) / 1_000_000 : 0);

/** Reads every active Elyport lock behind a token. Used by the embeddable badge. */
export async function tokenSafety(token: Address): Promise<Safety> {
  const c = elysiumClient();
  const [symbol, supply] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }).catch(() => 0n),
  ]);
  const empty: Safety = { symbol: String(symbol), tokenLocked: 0, activeLocks: 0 };
  if (!contracts.locker) return empty;
  const ids = (await c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] })).slice(-200);
  if (ids.length === 0) return empty;
  const res = await c.multicall({
    contracts: ids.map((id) => ({ address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    allowFailure: true,
  });
  const now = Math.floor(Date.now() / 1000);
  const locks = res.map((r) => r.result as LockT | undefined).filter((l): l is LockT => !!l && !l.withdrawn && Number(l.unlockAt) > now);
  const own = locks.filter((l) => l.token.toLowerCase() === token.toLowerCase());
  const lpAll = locks.filter((l) => l.isLP && l.token.toLowerCase() !== token.toLowerCase());
  const checks = await verifyPairs(c, Array.from(new Set(lpAll.map((l) => l.token.toLowerCase()))) as Address[]);
  // Only pairs from a known DEX count as liquidity; a fake pair contract could claim anything.
  const lp = lpAll.filter((l) => checks.get(l.token.toLowerCase())?.verified);

  const byPair = new Map<string, { amount: bigint; until: number }>();
  for (const l of lp) {
    const k = l.token.toLowerCase();
    const cur = byPair.get(k) ?? { amount: 0n, until: 0 };
    byPair.set(k, { amount: cur.amount + l.amount, until: Math.max(cur.until, Number(l.unlockAt)) });
  }
  let lpLocked: number | undefined;
  let lpUntil: number | undefined;
  if (byPair.size) {
    const pairs = Array.from(byPair.entries());
    const sups = await c.multicall({
      contracts: pairs.map(([p]) => ({ address: p as Address, abi: erc20Abi, functionName: "totalSupply" as const })),
      allowFailure: true,
    });
    pairs.forEach(([, v], i) => {
      const s = (sups[i]?.result as bigint | undefined) ?? 0n;
      const r = Math.min(1, ratio(v.amount, s));
      if (lpLocked === undefined || r > lpLocked) {
        lpLocked = r;
        lpUntil = v.until;
      }
    });
  }
  return {
    symbol: String(symbol).slice(0, 12),
    tokenLocked: Math.min(1, ratio(own.reduce((a, l) => a + l.amount, 0n), supply as bigint)),
    lpLocked,
    lpUntil,
    nextUnlock: locks.length ? Math.min(...locks.map((l) => Number(l.unlockAt))) : undefined,
    activeLocks: locks.length,
    unverifiedLpOnly: lpAll.length > 0 && lp.length === 0,
  };
}
