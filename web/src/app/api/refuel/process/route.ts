import { NextResponse, type NextRequest } from "next/server";
import { relayDeposit } from "@/lib/relayer";
import { sourceChains } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";

/** Same deposit asked twice within this window gets a cached answer instead of a second run. */
const recent = new Map<string, number>();
const DEDUPE_MS = 20_000;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Public trigger for one deposit, called by the app right after a refuel payment confirms.
 * It only reads on-chain state and delivers deposits that are genuinely pending, so it is
 * safe to expose; cron still sweeps anything this misses. Rate limited per IP and deduplicated
 * per deposit so it cannot be used to hammer the RPCs or race the relayer's own transactions.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(req, "refuel-process", 6)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "30" } });
  }
  let body: { chainId?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const chainId = Number(body.chainId);
  const idStr = String(body.id ?? "");
  if (!sourceChains.some((c) => c.id === chainId && c.deposit) || !/^\d{1,30}$/.test(idStr)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const k = `${chainId}:${idStr}`;
  const now = Date.now();
  if ((recent.get(k) ?? 0) > now - DEDUPE_MS) return NextResponse.json({ ok: true, result: null, note: "already processing" });
  recent.set(k, now);
  if (recent.size > 1000) for (const [key, t] of recent) if (t < now - DEDUPE_MS) recent.delete(key);
  try {
    const result = await relayDeposit(chainId, BigInt(idStr));
    return NextResponse.json({ ok: true, result: result ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
