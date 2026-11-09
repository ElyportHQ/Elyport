import { NextResponse, type NextRequest } from "next/server";
import { relayDeposit } from "@/lib/relayer";
import { sourceChains } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Public trigger for one deposit, called by the app right after a refuel payment confirms.
 * It only reads on-chain state and delivers deposits that are genuinely pending, so it is
 * safe to expose; cron still sweeps anything this misses.
 */
export async function POST(req: NextRequest) {
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
  try {
    const result = await relayDeposit(chainId, BigInt(idStr));
    return NextResponse.json({ ok: true, result: result ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
