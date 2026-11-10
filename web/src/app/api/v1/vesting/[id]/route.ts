import { apiError, apiSchedule, asId, cors, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
