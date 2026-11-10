import "server-only";
import { unstable_cache } from "next/cache";
import { erc20Abi, formatUnits, type Address } from "viem";
import { contracts } from "./config";
import { lockerAbi } from "./abis";
import { elysiumPublic } from "./chainClients";

const SCAN = 100n; // newest locks to look at
const SHOW = 6; // tokens to show

const pairAbi = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export type RecentLockedToken = {
  token: Address;
  label: string;
  name: string | null;
  isLP: boolean;
  locks: number;
  latestLockId: string;
  lockedAt: number;
  amount: string; // human-readable token units
  ofSupply: number | null; // percent
  nextUnlock: number;
};

type Lock = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };

async function load(): Promise<RecentLockedToken[]> {
  if (!contracts.locker) return [];
  const c = elysiumPublic();
  const [page, ids] = (await c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "getLocks", args: [0n, SCAN, true] })) as readonly [
    readonly Lock[],
    readonly bigint[],
  ];
  const now = Math.floor(Date.now() / 1000);

  // One entry per token: active locks only, newest first.
  const groups = new Map<string, { token: Address; isLP: boolean; ids: bigint[]; amount: bigint; lockedAt: number; nextUnlock: number }>();
  page.forEach((l, i) => {
    if (l.withdrawn || Number(l.unlockAt) <= now) return;
    const k = l.token.toLowerCase();
    const g = groups.get(k);
    if (g) {
      g.ids.push(ids[i]);
      g.amount += l.amount;
      g.lockedAt = Math.max(g.lockedAt, Number(l.createdAt));
      g.nextUnlock = Math.min(g.nextUnlock, Number(l.unlockAt));
    } else {
      groups.set(k, { token: l.token, isLP: l.isLP, ids: [ids[i]], amount: l.amount, lockedAt: Number(l.createdAt), nextUnlock: Number(l.unlockAt) });
    }
  });
  const top = [...groups.values()].sort((a, b) => b.lockedAt - a.lockedAt).slice(0, SHOW);
  if (top.length === 0) return [];

  const meta = await c.multicall({
    contracts: top.flatMap((g) => [
      { address: g.token, abi: erc20Abi, functionName: "symbol" as const },
      { address: g.token, abi: erc20Abi, functionName: "name" as const },
      { address: g.token, abi: erc20Abi, functionName: "decimals" as const },
      { address: g.token, abi: erc20Abi, functionName: "totalSupply" as const },
      { address: g.token, abi: pairAbi, functionName: "token0" as const },
      { address: g.token, abi: pairAbi, functionName: "token1" as const },
    ]),
    allowFailure: true,
  });

  // LP tokens: name them after their pair.
  const under = Array.from(
    new Set(
      top.flatMap((g, i) => (g.isLP ? [meta[i * 6 + 4]?.result, meta[i * 6 + 5]?.result] : [])).filter((x): x is Address => typeof x === "string"),
    ),
  );
  const underSym = under.length
    ? await c.multicall({ contracts: under.map((t) => ({ address: t, abi: erc20Abi, functionName: "symbol" as const })), allowFailure: true })
    : [];
  const symOf = (a: unknown) => {
    const i = typeof a === "string" ? under.indexOf(a as Address) : -1;
    return i >= 0 ? (underSym[i]?.result as string | undefined) : undefined;
  };

  return top.map((g, i) => {
    const symbol = (meta[i * 6]?.result as string | undefined)?.slice(0, 16);
    const name = (meta[i * 6 + 1]?.result as string | undefined)?.slice(0, 40) ?? null;
    const decimals = (meta[i * 6 + 2]?.result as number | undefined) ?? 18;
    const supply = meta[i * 6 + 3]?.result as bigint | undefined;
    const a = symOf(meta[i * 6 + 4]?.result);
    const b = symOf(meta[i * 6 + 5]?.result);
    const short = `${g.token.slice(0, 6)}…${g.token.slice(-4)}`;
    const label = g.isLP ? (a && b ? `${a}/${b} LP` : `${symbol ?? short} LP`) : (symbol ?? short);
    return {
      token: g.token,
      label,
      name: g.isLP ? null : name,
      isLP: g.isLP,
      locks: g.ids.length,
      latestLockId: g.ids[0].toString(),
      lockedAt: g.lockedAt,
      amount: formatUnits(g.amount, decimals),
      ofSupply: supply && supply > 0n ? Number((g.amount * 1_000_000n) / supply) / 10_000 : null,
      nextUnlock: g.nextUnlock,
    };
  });
}

const cached = unstable_cache(() => load().catch(() => null), ["recent-locks-v1"], { revalidate: 60 });

/** Tokens with the newest active locks, one card per token. Null if the chain could not be read. */
export async function getRecentLocks(): Promise<RecentLockedToken[] | null> {
  return cached();
}
