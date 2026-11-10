import { apiError, apiSchedule, asId, cors, json } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!rateLimit(req, "api-v1", 60)) return apiError(429, "Too many requests. Slow down, or cache responses on your side.");
  const id = asId((await ctx.params).id);
  if (id === undefined) return apiError(400, "Schedule id must be a number.");
  try {
    const s = await apiSchedule(id);
    return s ? json(s, 200, 15) : apiError(404, `Schedule #${id} was not found.`);
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
