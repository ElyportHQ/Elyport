import { NextResponse } from "next/server";
import { getOfficialToken, montraUrl, OFFICIAL } from "@/lib/officialToken";

export const revalidate = 60;

/** The official $ELYPORT token, or `token: null` until it is launched. Verified on-chain. */
export async function GET() {
  const t = await getOfficialToken().catch(() => null);
  return NextResponse.json(
    {
      symbol: OFFICIAL.symbol,
      devWallet: OFFICIAL.dev,
      launchpad: "Montra",
      token: t ? { address: t.address, name: t.name, launchBlock: t.block, trade: montraUrl(t.address) } : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", "Access-Control-Allow-Origin": "*" } },
  );
}
