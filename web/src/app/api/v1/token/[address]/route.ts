import { apiError, apiToken, asAddr, cors, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const token = asAddr((await ctx.params).address);
  if (!token) return apiError(400, "Not a valid token address.");
  try {
    return json(await apiToken(token));
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
