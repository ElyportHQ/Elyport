import { NextResponse } from "next/server";
import { getUsdPrices } from "@/lib/prices";

export const revalidate = 60;

export async function GET() {
  try {
    const prices = await getUsdPrices();
    return NextResponse.json(prices, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "Price feed unavailable" }, { status: 503 });
  }
}
