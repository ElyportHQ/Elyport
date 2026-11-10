import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient, erc20Abi, http, parseAbiItem, type Address } from "viem";
import { elysium } from "./config";

/**
 * Token holders on Elysium, rebuilt from the token's own Transfer logs (no indexer needed).
 * Balances are the sum of transfers in and out since the contract was created.
 */

const transfer = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const ZERO = "0x0000000000000000000000000000000000000000";
const DEAD = new Set([ZERO, "0x000000000000000000000000000000000000dead", "0xdead000000000000000042069420694206942069"]);
const MAX_LOG_SPAN = 200_000n;
const CODE_CHECK_LIMIT = 1500;

function client() {
  return createPublicClient({
    chain: elysium,
    transport: http(process.env.ELYSIUM_RPC_URL_SERVER || undefined, { batch: { batchSize: 50, wait: 10 }, retryCount: 4, retryDelay: 600, timeout: 15_000 }),
  });
}

async function creationBlock(c: ReturnType<typeof client>, token: Address, latest: bigint) {
  // Needs historical state; if the RPC cannot serve it, scan from genesis instead.
  let lo = 0n;
  let hi = latest;
  try {
    while (lo < hi) {
      const mid = (lo + hi) / 2n;
      const code = await c.getCode({ address: token, blockNumber: mid });
      if (code && code !== "0x") hi = mid;
      else lo = mid + 1n;
    }
    return lo;
  } catch {
    return 0n;
  }
}

export type Holder = { address: Address; balance: string; contract: boolean };
export type HolderList = { token: Address; decimals: number; symbol: string; totalSupply: string; scannedFrom: string; scannedTo: string; holders: Holder[]; truncated: boolean };

async function build(token: Address): Promise<HolderList> {
  const c = client();
  const [decimals, symbol, totalSupply, latest] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "totalSupply" }),
    c.getBlockNumber(),
  ]);
  const start = await creationBlock(c, token, latest);

  const bal = new Map<string, bigint>();
  const add = (a: string, v: bigint) => bal.set(a, (bal.get(a) ?? 0n) + v);
  let span = MAX_LOG_SPAN;
  for (let from = start; from <= latest; ) {
    const to = from + span - 1n > latest ? latest : from + span - 1n;
    try {
      const logs = await c.getLogs({ address: token, event: transfer, fromBlock: from, toBlock: to });
      for (const l of logs) {
        const v = l.args.value ?? 0n;
        if (l.args.from) add(l.args.from.toLowerCase(), -v);
        if (l.args.to) add(l.args.to.toLowerCase(), v);
      }
      from = to + 1n;
      if (span < MAX_LOG_SPAN) span *= 2n;
    } catch (e) {
      if (span <= 500n) throw e;
      span /= 4n; // too many logs in one call: shrink the window and retry
    }
  }

  const list = [...bal.entries()]
    .filter(([a, v]) => v > 0n && !DEAD.has(a))
    .sort((x, y) => (y[1] > x[1] ? 1 : y[1] < x[1] ? -1 : 0));

  // Flag contracts (pools, lockers, vaults) among the largest holders. EIP-7702 wallets count as wallets.
  const checked = list.slice(0, CODE_CHECK_LIMIT);
  const codes = await Promise.all(checked.map(([a]) => c.getCode({ address: a as Address }).catch(() => undefined)));
  const holders: Holder[] = list.map(([a, v], i) => {
    const code = i < CODE_CHECK_LIMIT ? codes[i] : undefined;
    const isContract = !!code && code !== "0x" && !code.toLowerCase().startsWith("0xef0100");
    return { address: a as Address, balance: v.toString(), contract: isContract };
  });

  return {
    token,
    decimals,
    symbol,
    totalSupply: totalSupply.toString(),
    scannedFrom: start.toString(),
    scannedTo: latest.toString(),
    holders: holders.slice(0, 10_000),
    truncated: holders.length > 10_000,
  };
}

/** Cached per token for 5 minutes. */
export function getHolders(token: Address): Promise<HolderList> {
  return unstable_cache(() => build(token), ["holders-v1", token.toLowerCase()], { revalidate: 300 })();
}
