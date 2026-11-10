import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { runMonitor, type MonitorReport } from "@/lib/refuelMonitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Last result per instance, reused for 60 seconds so this endpoint cannot be used to hammer RPCs. */
let cached: { at: number; report: MonitorReport } | undefined;

/**
 * Public delivery check. `ok: false` means a deposit was marked delivered without a vault payout,
 * or a vault payout matched no deposit. Cron fails loudly on it.
 */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, "refuel-monitor", 10)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } });
  }
  const fresh = req.nextUrl.searchParams.has("fresh") && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  if (!fresh && cached && Date.now() - cached.at < 60_000) {
    return NextResponse.json(cached.report, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
  try {
    const report = await runMonitor();
    cached = { at: Date.now(), report };
    return NextResponse.json(report, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch (e) {
    return NextResponse.json({ ok: null, error: (e as Error).message?.slice(0, 200) }, { status: 503 });
  }
}
