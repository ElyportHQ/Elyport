import "server-only";
import { erc20Abi, isAddress, type Address } from "viem";
import { contracts, elysium, siteUrl } from "./config";
import { lockerAbi, vestingAbi } from "./abis";
import { elysiumClient } from "./og";
import { verifyPairs } from "./verifyPairs";
import { getMontraLaunch } from "./montra";

type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };
type SchedT = {
  token: Address;
  creator: Address;
  beneficiary: Address;
  total: bigint;
  released: bigint;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  period: bigint;
  revocable: boolean;
  revoked: boolean;
};

export const API_VERSION = "1";
const MAX_ITEMS = 500;
const now = () => Math.floor(Date.now() / 1000);
const pct = (a: bigint, b: bigint) => (b > 0n ? Number((a * 1_000_000n) / b) / 10_000 : 0);

/** JSON response with bigint as strings, open CORS and short CDN caching. */
export function json(data: unknown, status = 200, maxAge = 30) {
  return new Response(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": status === 200 ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` : "no-store",
    },
  });
}

export const apiError = (status: number, error: string) => json({ error }, status);

export function cors() {
  return new Response(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Max-Age": "86400" },
  });
}

export const asAddr = (v: string): Address | undefined => (isAddress(v) ? (v as Address) : undefined);
export const asId = (v: string): bigint | undefined => (/^\d{1,18}$/.test(v) ? BigInt(v) : undefined);

function lockOut(id: bigint, l: LockT) {
  const t = now();
  return {
    id,
    token: l.token,
    isLP: l.isLP,
    owner: l.owner,
    amount: l.amount,
    unlockAt: Number(l.unlockAt),
    createdAt: Number(l.createdAt),
    withdrawn: l.withdrawn,
    status: l.withdrawn ? "withdrawn" : Number(l.unlockAt) <= t ? "unlocked" : "locked",
    url: `${siteUrl}/lock/${id}`,
  };
}

function schedOut(id: bigint, s: SchedT, claimable?: bigint) {
  return {
    id,
    token: s.token,
    creator: s.creator,
    recipient: s.beneficiary,
    total: s.total,
    released: s.released,
    claimable,
    start: Number(s.start),
    cliffEnd: Number(s.start + s.cliff),
    end: Number(s.start + s.duration),
    release: s.period > 1n ? "monthly" : "linear",
    cancellable: s.revocable,
    cancelled: s.revoked,
    url: `${siteUrl}/vest/${id}`,
  };
}

async function readLocks(ids: readonly bigint[]) {
  if (!contracts.locker || ids.length === 0) return [];
  const c = elysiumClient();
  const res = await c.multicall({
    contracts: ids.map((id) => ({ address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    allowFailure: true,
  });
  return ids.flatMap((id, i) => (res[i]?.result ? [lockOut(id, res[i].result as LockT)] : []));
}

async function readSchedules(ids: readonly bigint[]) {
  if (!contracts.vesting || ids.length === 0) return [];
  const c = elysiumClient();
  const res = await c.multicall({
    contracts: ids.flatMap((id) => [
      { address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const },
      { address: contracts.vesting!, abi: vestingAbi, functionName: "claimable" as const, args: [id] as const },
    ]),
    allowFailure: true,
  });
  return ids.flatMap((id, i) => {
    const s = res[i * 2]?.result as SchedT | undefined;
    return s ? [schedOut(id, s, res[i * 2 + 1]?.result as bigint | undefined)] : [];
  });
}

async function erc20Meta(token: Address) {
  const c = elysiumClient();
  const r = await c.multicall({
    contracts: [
      { address: token, abi: erc20Abi, functionName: "name" },
      { address: token, abi: erc20Abi, functionName: "symbol" },
      { address: token, abi: erc20Abi, functionName: "decimals" },
      { address: token, abi: erc20Abi, functionName: "totalSupply" },
    ],
    allowFailure: true,
  });
  return {
    address: token,
    name: (r[0]?.result as string | undefined) ?? null,
    symbol: (r[1]?.result as string | undefined) ?? null,
    decimals: (r[2]?.result as number | undefined) ?? null,
    totalSupply: (r[3]?.result as bigint | undefined) ?? null,
  };
}

export function contractsInfo() {
  return {
    chainId: elysium.id,
    locker: contracts.locker ?? null,
    vesting: contracts.vesting ?? null,
    drop: contracts.drop ?? null,
    refuelVault: contracts.refuelVault ?? null,
  };
}

export async function apiStats() {
  const c = elysiumClient();
  const [locks, schedules] = await Promise.all([
    contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockCount" }).catch(() => null) : null,
    contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleCount" }).catch(() => null) : null,
  ]);
  return { locks, schedules, contracts: contractsInfo() };
}

export async function apiLock(id: bigint) {
  return (await readLocks([id]))[0];
}

export async function apiSchedule(id: bigint) {
  return (await readSchedules([id]))[0];
}

/** Everything Elyport knows about a token: locks, LP locks per pair, supply share and vesting. */
export async function apiToken(token: Address) {
  const c = elysiumClient();
  const [meta, lockIds, schedIds] = await Promise.all([
    erc20Meta(token),
    contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] }) : Promise.resolve([] as readonly bigint[]),
    contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token] }) : Promise.resolve([] as readonly bigint[]),
  ]);
  const [locks, schedules] = await Promise.all([readLocks(lockIds.slice(-MAX_ITEMS)), readSchedules(schedIds.slice(-MAX_ITEMS))]);
  const t = now();
  const active = locks.filter((l) => l.status === "locked");
  const own = active.filter((l) => l.token.toLowerCase() === token.toLowerCase());
  const ownAmount = own.reduce((a, l) => a + l.amount, 0n);

  const pairMap = new Map<string, { amount: bigint; until: number; locks: number }>();
  for (const l of active.filter((x) => x.isLP && x.token.toLowerCase() !== token.toLowerCase())) {
    const k = l.token.toLowerCase();
    const cur = pairMap.get(k) ?? { amount: 0n, until: 0, locks: 0 };
    pairMap.set(k, { amount: cur.amount + l.amount, until: Math.max(cur.until, l.unlockAt), locks: cur.locks + 1 });
  }
  const pairs = Array.from(pairMap.entries());
  const checks = await verifyPairs(c, pairs.map(([p]) => p as Address));
  const sups = pairs.length
    ? await c.multicall({ contracts: pairs.map(([p]) => ({ address: p as Address, abi: erc20Abi, functionName: "totalSupply" as const })), allowFailure: true })
    : [];
  const liquidity = pairs.map(([pair, v], i) => {
    const supply = (sups[i]?.result as bigint | undefined) ?? 0n;
    const chk = checks.get(pair.toLowerCase());
    return {
      pair,
      dex: chk?.dex ?? null,
      verified: !!chk?.verified,
      lockedAmount: v.amount,
      pairSupply: supply,
      lockedPercent: Math.min(100, pct(v.amount, supply)),
      lockedUntil: v.until,
      locks: v.locks,
    };
  });
  const verifiedLiquidity = liquidity.filter((p) => p.verified);

  const liveSched = schedules.filter((s) => !s.cancelled);
  const montra = await getMontraLaunch(token);
  return {
    token: meta,
    summary: {
      activeLocks: active.length,
      supplyLockedAmount: ownAmount,
      supplyLockedPercent: meta.totalSupply ? Math.min(100, pct(ownAmount, meta.totalSupply)) : null,
      /** Only pairs from a known DEX factory count here. */
      bestLiquidityLockedPercent: verifiedLiquidity.length ? Math.max(...verifiedLiquidity.map((p) => p.lockedPercent)) : null,
      nextUnlock: active.length ? Math.min(...active.map((l) => l.unlockAt)) : null,
      vestingSchedules: schedules.length,
      vestingTotal: liveSched.reduce((a, s) => a + s.total, 0n),
      vestingReleased: liveSched.reduce((a, s) => a + s.released, 0n),
      updatedAt: t,
    },
    liquidity,
    /** Launch liquidity that is not an LP token, e.g. a Montra (Uniswap v4) launch pool. Verified on-chain. */
    launchLiquidity: montra ? { venue: "Montra", sealed: true, poolId: montra.poolId, launchTx: montra.launchTx } : null,
    locks,
    vesting: schedules,
    links: {
      page: `${siteUrl}/token/${token}`,
      claim: `${siteUrl}/claim/${token}`,
      badge: `${siteUrl}/badge/${token}`,
      lockWidget: `${siteUrl}/embed/lock/${token}`,
      claimWidget: `${siteUrl}/embed/claim/${token}`,
    },
  };
}

/** A wallet's locks, vesting it receives and vesting it created. */
export async function apiWallet(wallet: Address) {
  const c = elysiumClient();
  const [lockIds, recvIds, madeIds] = await Promise.all([
    contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByOwner", args: [wallet] }) : Promise.resolve([] as readonly bigint[]),
    contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByBeneficiary", args: [wallet] }) : Promise.resolve([] as readonly bigint[]),
    contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByCreator", args: [wallet] }) : Promise.resolve([] as readonly bigint[]),
  ]);
  const [locks, receiving, created] = await Promise.all([
    readLocks(lockIds.slice(-MAX_ITEMS)),
    readSchedules(recvIds.slice(-MAX_ITEMS)),
    readSchedules(madeIds.slice(-MAX_ITEMS)),
  ]);
  return { wallet, locks, vesting: { receiving, created } };
}
