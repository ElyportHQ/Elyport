import type { Address } from "viem";

/** Amounts are decimal strings in the token's smallest unit; times are Unix seconds. */
export type ApiLock = {
  id: string;
  token: Address;
  isLP: boolean;
  owner: Address;
  amount: string;
  unlockAt: number;
  createdAt: number;
  withdrawn: boolean;
  status: "locked" | "unlocked" | "withdrawn";
  url: string;
};

export type ApiSchedule = {
  id: string;
  token: Address;
  creator: Address;
  recipient: Address;
  total: string;
  released: string;
  claimable?: string;
  start: number;
  cliffEnd: number;
  end: number;
  release: "linear" | "monthly";
  cancellable: boolean;
  cancelled: boolean;
  url: string;
};

export type ApiToken = {
  token: { address: Address; name: string | null; symbol: string | null; decimals: number | null; totalSupply: string | null };
  summary: {
    activeLocks: number;
    supplyLockedAmount: string;
    supplyLockedPercent: number | null;
    bestLiquidityLockedPercent: number | null;
    nextUnlock: number | null;
    vestingSchedules: number;
    vestingTotal: string;
    vestingReleased: string;
    updatedAt: number;
  };
  liquidity: { pair: Address; lockedAmount: string; pairSupply: string; lockedPercent: number; lockedUntil: number; locks: number }[];
  locks: ApiLock[];
  vesting: ApiSchedule[];
  links: { page: string; claim: string; badge: string; lockWidget: string; claimWidget: string };
};

export type ApiWallet = { wallet: Address; locks: ApiLock[]; vesting: { receiving: ApiSchedule[]; created: ApiSchedule[] } };
export type ApiStats = { locks: string | null; schedules: string | null; contracts: Record<string, string | number | null> };

export class ElyportApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ElyportApiError";
  }
}

/** Client for the read-only Elyport API. Works in browsers, Node 18+ and edge runtimes. */
export function createElyportApi(baseUrl = "https://elyport.com/api/v1") {
  const base = baseUrl.replace(/\/$/, "");
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, { headers: { accept: "application/json" } });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new ElyportApiError(res.status, body.error ?? `Request failed (${res.status})`);
    return body as T;
  }
  return {
    stats: () => get<ApiStats>("/stats"),
    token: (address: Address) => get<ApiToken>(`/token/${address}`),
    lock: (id: bigint | number | string) => get<ApiLock>(`/lock/${id}`),
    vesting: (id: bigint | number | string) => get<ApiSchedule>(`/vesting/${id}`),
    wallet: (address: Address) => get<ApiWallet>(`/wallet/${address}`),
  };
}
