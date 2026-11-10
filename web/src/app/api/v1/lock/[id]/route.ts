import { apiError, apiLock, asId, cors, json } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!rateLimit(req, "api-v1", 60)) return apiError(429, "Too many requests. Slow down, or cache responses on your side.");
  const id = asId((await ctx.params).id);
  if (id === undefined) return apiError(400, "Lock id must be a number.");
  try {
    const lock = await apiLock(id);
    return lock ? json(lock) : apiError(404, `Lock #${id} was not found.`);
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
