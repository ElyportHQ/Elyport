import { apiError, apiWallet, asAddr, cors, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const wallet = asAddr((await ctx.params).address);
  if (!wallet) return apiError(400, "Not a valid wallet address.");
  try {
    return json(await apiWallet(wallet), 200, 15);
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
