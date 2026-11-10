import { apiError, apiLock, asId, cors, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
