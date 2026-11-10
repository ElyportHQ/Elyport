import { getAddress, parseAbi, parseAbiItem, type Address, type PublicClient } from "viem";

/**
 * The official $ELYPORT token, found on-chain with no manual step.
 *
 * It is launched on Montra (montramarkets.xyz). A token only counts when ALL of these hold:
 *  - Montra's LaunchFactory (read from Montra's on-chain registry) emitted TokenLaunched for it,
 *  - the launch was sent by the Elyport dev wallet (indexed `creator`),
 *  - the token itself reports that wallet as creator() and "ELYPORT" as symbol().
 * Montra's API is only used to find candidates quickly; each one is then checked against the launch
 * transaction receipt on-chain. Anyone can deploy a contract that claims the right name or creator,
 * but only Montra's factory can emit the launch event, so look-alikes are ignored.
 */

export type FinderOptions = {
  dev: Address;
  symbol: string;
  montraRegistry: Address;
  montraFactory: Address;
  fromBlock: bigint;
  scanBlocks?: bigint;
  useApi?: boolean;
};

export const OFFICIAL = {
  symbol: "ELYPORT",
  dev: "0x90D772A278F559853524C4803A27ba51324638dc" as Address,
  montraRegistry: "0xF1E2FA75422F889e565F3142bdbf60B28dce2aa7" as Address,
  montraFactory: "0x38d3ef3a06d18fa3286fb5deafe611be725fcd15" as Address,
  fromBlock: BigInt(process.env.OFFICIAL_TOKEN_FROM_BLOCK || 3_986_000),
};

const launched = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed creator, bytes32 indexed poolId, uint256 configId, address quote, bool quoteIsCurrency0, uint256 supply, int24 startTick, address feeRecipient, bool feeLocked, uint256 firstBuyIn, uint256 firstBuyOut)",
);
const registryAbi = parseAbi(["function FACTORY() view returns (bytes32)", "function get(bytes32 key) view returns (address)"]);
const TOKEN_LAUNCHED = "0x4961817ce3ab7655aeb0a1693c07f08a5b793c56901461b33bb3753758244c6f";
const tokenAbi = parseAbi(["function symbol() view returns (string)", "function name() view returns (string)", "function creator() view returns (address)"]);

export type OfficialToken = { address: Address; name: string; symbol: string; block: string };

const sameAddr = (a?: string | null, b?: string | null) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

async function factories(c: PublicClient, o: FinderOptions): Promise<Set<string>> {
  const set = new Set<string>([o.montraFactory.toLowerCase()]);
  try {
    const key = await c.readContract({ address: o.montraRegistry, abi: registryAbi, functionName: "FACTORY" });
    const f = await c.readContract({ address: o.montraRegistry, abi: registryAbi, functionName: "get", args: [key] });
    if (f && !/^0x0{40}$/.test(f)) set.add(f.toLowerCase());
  } catch {
    /* registry unreachable: keep the known factory */
  }
  return set;
}

/** Trustless check of one candidate: token state plus the launch receipt itself. */
async function verify(c: PublicClient, o: FinderOptions, token: Address, launchTx: `0x${string}` | undefined, known: Set<string>): Promise<OfficialToken | null> {
  const [symbol, name, creator] = await Promise.all([
    c.readContract({ address: token, abi: tokenAbi, functionName: "symbol" }),
    c.readContract({ address: token, abi: tokenAbi, functionName: "name" }),
    c.readContract({ address: token, abi: tokenAbi, functionName: "creator" }),
  ]);
  if (symbol.toUpperCase() !== o.symbol.toUpperCase() || !sameAddr(creator, o.dev)) return null;
  if (!launchTx) return null;
  const r = await c.getTransactionReceipt({ hash: launchTx });
  if (r.status !== "success" || !sameAddr(r.from, o.dev)) return null;
  const ok = r.logs.some(
    (l) =>
      known.has(l.address.toLowerCase()) &&
      l.topics[0] === TOKEN_LAUNCHED &&
      sameAddr(`0x${(l.topics[1] ?? "").slice(26)}`, token) &&
      sameAddr(`0x${(l.topics[2] ?? "").slice(26)}`, o.dev),
  );
  return ok ? { address: getAddress(token), name, symbol, block: String(r.blockNumber) } : null;
}

type MontraCard = { address: Address; symbol: string; creator?: string; launchTx?: `0x${string}`; launchedAt?: number };

/** Finds and verifies the official token. Exported for tests (scripts/check-official.mts). */
export async function findOfficialToken(c: PublicClient, o: FinderOptions): Promise<OfficialToken | null> {
  const known = await factories(c, o);

  // 1. Discovery through Montra's public API (untrusted; every hit is verified on-chain).
  if (o.useApi !== false) try {
    const res = await fetch(`https://api.montramarkets.xyz/api/tokens?creator=${o.dev.toLowerCase()}&sort=new&limit=50`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const { tokens = [] } = (await res.json()) as { tokens?: MontraCard[] };
      const hits = tokens.filter((t) => t.symbol?.toUpperCase() === o.symbol.toUpperCase()).sort((a, b) => (a.launchedAt ?? 0) - (b.launchedAt ?? 0));
      for (const t of hits) {
        let tx = t.launchTx;
        if (!tx) {
          const d = await fetch(`https://api.montramarkets.xyz/api/tokens/${t.address.toLowerCase()}`, { cache: "no-store", signal: AbortSignal.timeout(8000) })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          tx = (d?.token ?? d)?.launchTx;
        }
        const v = await verify(c, o, t.address, tx, known).catch(() => null);
        if (v) return v;
      }
    }
  } catch {
    /* API down: fall back to the chain */
  }

  // 2. Fallback: scan recent Montra launches by the dev wallet directly on-chain.
  const latest = await c.getBlockNumber();
  const scan = o.scanBlocks ?? 200_000n;
  const start = latest > scan ? latest - scan : 0n;
  const from0 = start > o.fromBlock ? start : o.fromBlock;
  const CHUNK = 50_000n;
  for (let from = from0; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    const logs = await c.getLogs({ address: [...known] as Address[], event: launched, args: { creator: o.dev }, fromBlock: from, toBlock: to });
    for (const l of logs) {
      if (!l.args.token) continue;
      const v = await verify(c, o, l.args.token, l.transactionHash ?? undefined, known).catch(() => null);
      if (v) return v;
    }
  }
  return null;
}

export const montraUrl = (a: string) => `https://montramarkets.xyz/token/${a}`;
