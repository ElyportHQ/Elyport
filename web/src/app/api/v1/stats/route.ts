import { apiError, apiStats, cors, json } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!rateLimit(req, "api-v1", 60)) return apiError(429, "Too many requests. Slow down, or cache responses on your side.");
  try {
    return json(await apiStats(), 200, 60);
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
