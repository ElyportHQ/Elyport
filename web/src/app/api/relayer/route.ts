import { NextResponse, type NextRequest } from "next/server";
import { runRelayer } from "@/lib/relayer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every minute by Vercel Cron (see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await runRelayer();
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
