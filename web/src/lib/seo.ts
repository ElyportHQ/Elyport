import "server-only";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { erc20Abi, formatUnits, isAddress, type Address } from "viem";
import { contracts } from "./config";
import { lockerAbi, vestingAbi } from "./abis";
import { elysiumPublic } from "./chainClients";

const fmtDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
function fmtAmount(v: bigint, decimals: number) {
  const n = Number(formatUnits(v, decimals));
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
const pctText = (v: bigint, supply?: bigint) => {
  if (!supply || supply === 0n) return undefined;
  const p = Number((v * 10_000n) / supply) / 100;
  return p > 0 && p < 0.01 ? "<0.01%" : `${p.toFixed(2)}%`;
};

async function meta(token: Address) {
  const r = await elysiumPublic().multicall({
    contracts: [
      { address: token, abi: erc20Abi, functionName: "symbol" },
      { address: token, abi: erc20Abi, functionName: "name" },
      { address: token, abi: erc20Abi, functionName: "decimals" },
      { address: token, abi: erc20Abi, functionName: "totalSupply" },
    ],
    allowFailure: true,
  });
  return {
    symbol: (r[0]?.result as string | undefined)?.slice(0, 16),
    name: (r[1]?.result as string | undefined)?.slice(0, 48),
    decimals: Number((r[2]?.result as number | undefined) ?? 18),
    supply: r[3]?.result as bigint | undefined,
  };
}

export type PageText = { title: string; description: string };

/** Page metadata with matching link-preview text; the page's own opengraph-image supplies the picture. */
export const pageMeta = (t: PageText): Metadata => ({
  title: t.title,
  description: t.description,
  openGraph: { title: `${t.title} · Elyport`, description: t.description, siteName: "Elyport" },
  twitter: { card: "summary_large_image", site: "@ElyportHQ", title: `${t.title} · Elyport`, description: t.description },
});

/** Title and description for /lock/{id}, read from the chain. */
export const lockText = (id: string) =>
  unstable_cache(
    async (): Promise<PageText | null> => {
      if (!contracts.locker || !/^\d{1,18}$/.test(id)) return null;
      const l = await elysiumPublic().readContract({ address: contracts.locker, abi: lockerAbi, functionName: "getLock", args: [BigInt(id)] });
      const m = await meta(l.token);
      const ticker = `${m.symbol ? `$${m.symbol}` : `${l.token.slice(0, 6)}…${l.token.slice(-4)}`}${l.isLP ? " LP" : ""}`;
      const pct = l.isLP ? undefined : pctText(l.amount, m.supply);
      const now = Date.now() / 1000;
      const state = l.withdrawn ? "withdrawn" : Number(l.unlockAt) <= now ? "unlocked" : "locked";
      const when = fmtDate(Number(l.unlockAt));
      return {
        title: `${ticker} lock #${id}: ${state === "locked" ? `locked until ${when}` : `${state} ${when}`}`,
        description:
          `${m.name ? `${m.name}: ` : ""}${fmtAmount(l.amount, m.decimals)} ${m.symbol ?? "tokens"}${pct ? ` (${pct} of supply)` : ""} ` +
          `${state === "locked" ? `locked on Elyport until ${when}` : `${state} on ${when}`}, on Elysium. ` +
          "Verified on-chain: the lock can be extended, never shortened.",
      };
    },
    ["seo-lock-v2", id],
    { revalidate: 300 },
  )().catch(() => null);

/** Title and description for /token/{address}, read from the chain. */
export const tokenText = (address: string) =>
  unstable_cache(
    async (): Promise<PageText | null> => {
      if (!isAddress(address)) return null;
      const token = address as Address;
      const c = elysiumPublic();
      const [m, ids, sids] = await Promise.all([
        meta(token),
        contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] }) : Promise.resolve([] as readonly bigint[]),
        contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token] }) : Promise.resolve([] as readonly bigint[]),
      ]);
      const res = ids.length
        ? await c.multicall({
            contracts: ids.slice(0, 200).map((id) => ({ address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
            allowFailure: true,
          })
        : [];
      const now = Date.now() / 1000;
      const own = res
        .map((r) => r?.result)
        .filter((l): l is NonNullable<typeof l> => !!l && !l.withdrawn && Number(l.unlockAt) > now && l.token.toLowerCase() === token.toLowerCase());
      const locked = own.reduce((a, l) => a + l.amount, 0n);
      const next = own.map((l) => Number(l.unlockAt)).sort((a, b) => a - b)[0];
      const ticker = m.symbol ? `$${m.symbol}` : `${token.slice(0, 6)}…${token.slice(-4)}`;
      const pct = pctText(locked, m.supply);
      const head = locked > 0n && pct ? `${pct} of supply locked` : "locks, vesting and unlocks";
      const parts = [
        locked > 0n ? `${fmtAmount(locked, m.decimals)} ${m.symbol ?? "tokens"} locked in ${own.length} ${own.length === 1 ? "lock" : "locks"}` : "No supply locked on Elyport yet",
        next ? `next unlock ${fmtDate(next)}` : undefined,
        sids.length ? `${sids.length} vesting ${sids.length === 1 ? "schedule" : "schedules"}` : undefined,
      ].filter(Boolean);
      return {
        title: `${ticker}${m.name && m.name !== m.symbol ? ` (${m.name})` : ""}: ${head}`,
        description: `${parts.join(", ")}. Check ${ticker} on Elysium before you buy: every lock and schedule, verified on-chain. Contract ${token}.`,
      };
    },
    ["seo-token-v1", address.toLowerCase()],
    { revalidate: 300 },
  )().catch(() => null);

/** Lock ids and token addresses for the sitemap. */
export const sitemapEntries = unstable_cache(
  async () => {
    if (!contracts.locker) return { locks: [] as { id: string; at: number }[], tokens: [] as { token: string; at: number }[] };
    const [page, ids] = await elysiumPublic().readContract({ address: contracts.locker, abi: lockerAbi, functionName: "getLocks", args: [0n, 500n, true] });
    const locks = page.map((l, i) => ({ id: ids[i].toString(), at: Number(l.createdAt) }));
    const tokens = new Map<string, number>();
    page.forEach((l) => tokens.set(l.token, Math.max(tokens.get(l.token) ?? 0, Number(l.createdAt))));
    return { locks, tokens: [...tokens].map(([token, at]) => ({ token, at })) };
  },
  ["seo-sitemap-v1"],
  { revalidate: 3600 },
);
