export type UsdPrices = { ethereum: number; binancecoin: number; hyperliquid: number };
type Partial3 = Partial<UsdPrices>;

const ASSETS: (keyof UsdPrices)[] = ["ethereum", "binancecoin", "hyperliquid"];
/** Sources further apart than this are treated as unreliable for that asset. */
const MAX_SPREAD = 0.03;

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, next: { revalidate: 60 }, headers: { accept: "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

async function coingecko(): Promise<Partial3> {
  const j = (await getJson("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,hyperliquid&vs_currencies=usd")) as Record<string, { usd?: number }>;
  return { ethereum: j.ethereum?.usd, binancecoin: j.binancecoin?.usd, hyperliquid: j.hyperliquid?.usd };
}

async function defillama(): Promise<Partial3> {
  const j = (await getJson("https://coins.llama.fi/prices/current/coingecko:ethereum,coingecko:binancecoin,coingecko:hyperliquid")) as {
    coins?: Record<string, { price?: number }>;
  };
  const c = j.coins ?? {};
  return { ethereum: c["coingecko:ethereum"]?.price, binancecoin: c["coingecko:binancecoin"]?.price, hyperliquid: c["coingecko:hyperliquid"]?.price };
}

/** Hyperliquid's own mid prices: HYPE, ETH and BNB perps quoted in USD. */
async function hyperliquid(): Promise<Partial3> {
  const j = (await getJson("https://api.hyperliquid.xyz/info", {
    method: "POST",
    body: JSON.stringify({ type: "allMids" }),
    headers: { "content-type": "application/json" },
  })) as Record<string, string>;
  return { ethereum: Number(j.ETH), binancecoin: Number(j.BNB), hyperliquid: Number(j.HYPE) };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Spot USD prices from three independent sources (CoinGecko, DefiLlama, Hyperliquid).
 * Uses the median per asset and refuses to quote when sources disagree by more than 3%,
 * so one bad or offline feed can neither stop Refuel nor skew it.
 */
export async function getUsdPrices(): Promise<UsdPrices> {
  const results = await Promise.allSettled([coingecko(), defillama(), hyperliquid()]);
  const out = {} as UsdPrices;
  for (const a of ASSETS) {
    const vals = results.flatMap((r) => (r.status === "fulfilled" && Number(r.value[a]) > 0 ? [Number(r.value[a])] : []));
    if (vals.length === 0) throw new Error(`No price for ${a}`);
    const mid = median(vals);
    const agreeing = vals.filter((v) => Math.abs(v - mid) / mid <= MAX_SPREAD);
    if (vals.length >= 2 && agreeing.length < 2) throw new Error(`Price sources disagree for ${a}`);
    out[a] = median(agreeing.length ? agreeing : vals);
  }
  return out;
}
