import { apiError, apiToken, asAddr, cors, json } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  if (!rateLimit(req, "api-v1", 60)) return apiError(429, "Too many requests. Slow down, or cache responses on your side.");
  const token = asAddr((await ctx.params).address);
  if (!token) return apiError(400, "Not a valid token address.");
  try {
    return json(await apiToken(token));
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
