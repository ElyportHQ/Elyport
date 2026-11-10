import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient, formatEther, http, parseAbiItem, type Address } from "viem";
import { contracts, elysium } from "./config";
import { lockerAbi } from "./abis";

const dropped = parseAbiItem("event Dropped(address indexed sender, address indexed token, uint256 recipients, uint256 total)");
const dispensed = parseAbiItem("event Dispensed(bytes32 indexed depositKey, address indexed to, uint256 amount)");
const MAX_SPAN = 200_000n;

function client() {
  return createPublicClient({
    chain: elysium,
    transport: http(process.env.ELYSIUM_RPC_URL_SERVER || undefined, { retryCount: 4, retryDelay: 600, timeout: 15_000 }),
  });
}

async function creationBlock(c: ReturnType<typeof client>, address: Address, latest: bigint) {
  let lo = 0n;
  let hi = latest;
  try {
    while (lo < hi) {
      const mid = (lo + hi) / 2n;
      const code = await c.getCode({ address, blockNumber: mid });
      if (code && code !== "0x") hi = mid;
      else lo = mid + 1n;
    }
    return lo;
  } catch {
    return 0n;
  }
}

// A contract's deployment block never changes, so it is looked up once and kept.
const deployedAt = (address: Address, latest: bigint) =>
  unstable_cache(
    async () => {
      const b = await creationBlock(client(), address, latest);
      if (b === 0n) throw new Error("deploy block not found"); // not cached; scan from genesis this time
      return b.toString();
    },
    ["deploy-block-v1", address.toLowerCase()],
    { revalidate: false },
  )()
    .then(BigInt)
    .catch(() => 0n);

/** All logs of one event from a contract, from its deployment to now, in shrinking windows if the RPC refuses. */
async function scan<E extends typeof dropped | typeof dispensed>(c: ReturnType<typeof client>, address: Address, event: E, latest: bigint) {
  const out = [];
  let span = MAX_SPAN;
  for (let from = await deployedAt(address, latest); from <= latest; ) {
    const to = from + span - 1n > latest ? latest : from + span - 1n;
    try {
      out.push(...(await c.getLogs({ address, event, fromBlock: from, toBlock: to })));
      from = to + 1n;
      if (span < MAX_SPAN) span *= 2n;
    } catch (e) {
      if (span <= 500n) throw e;
      span /= 4n;
    }
  }
  return out;
}

export type SiteStats = {
  locks: number;
  projects: number;
  dropWallets: number;
  drops: number;
  refuels: number;
  refuelHype: string;
};

async function load(): Promise<SiteStats> {
  const c = client();
  const latest = await c.getBlockNumber();
  const [locks, page, drops, payouts] = await Promise.all([
    contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockCount" }) : Promise.resolve(0n),
    contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "getLocks", args: [0n, 500n, true] }) : Promise.resolve(null),
    contracts.drop ? scan(c, contracts.drop, dropped, latest).catch(() => []) : Promise.resolve([]),
    contracts.refuelVault ? scan(c, contracts.refuelVault, dispensed, latest).catch(() => []) : Promise.resolve([]),
  ]);
  const tokens = new Set((page?.[0] ?? []).map((l) => l.token.toLowerCase()));
  return {
    locks: Number(locks),
    projects: tokens.size,
    drops: drops.length,
    dropWallets: drops.reduce((a, l) => a + Number(l.args.recipients ?? 0n), 0),
    refuels: payouts.length,
    refuelHype: formatEther(payouts.reduce((a, l) => a + (l.args.amount ?? 0n), 0n)),
  };
}

/** Lifetime usage, read from the chain and cached for 10 minutes. Null if the chain could not be read. */
export const getSiteStats = unstable_cache(() => load().catch(() => null), ["site-stats-v1"], { revalidate: 600 });
