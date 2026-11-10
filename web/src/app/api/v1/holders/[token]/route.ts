import { apiError, asAddr, cors, json } from "@/lib/api";
import { getHolders } from "@/lib/holders";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Holders of an Elysium token, largest first, rebuilt from Transfer logs. Contracts are flagged. */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!rateLimit(req, "api-holders", 10)) return apiError(429, "Too many requests. Slow down, or cache responses on your side.");
  const token = asAddr((await ctx.params).token);
  if (!token) return apiError(400, "Not a valid token address.");
  try {
    return json(await getHolders(token));
  } catch {
    return apiError(502, "Could not read this token's holders from Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
