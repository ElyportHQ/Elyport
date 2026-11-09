export type UsdPrices = { ethereum: number; binancecoin: number; hyperliquid: number };

/** Spot USD prices from CoinGecko's public API. Used for quotes and by the relayer. */
export async function getUsdPrices(): Promise<UsdPrices> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,hyperliquid&vs_currencies=usd",
    { next: { revalidate: 60 }, headers: { accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Price feed error ${res.status}`);
  const j = (await res.json()) as Record<string, { usd?: number }>;
  const p = {
    ethereum: Number(j.ethereum?.usd),
    binancecoin: Number(j.binancecoin?.usd),
    hyperliquid: Number(j.hyperliquid?.usd),
  };
  if (!(p.ethereum > 0 && p.binancecoin > 0 && p.hyperliquid > 0)) throw new Error("Incomplete price data");
  return p;
}
