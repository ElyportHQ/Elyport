import { apiError, apiStats, cors, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await apiStats(), 200, 60);
  } catch {
    return apiError(502, "Could not reach Elysium. Try again shortly.");
  }
}

export const OPTIONS = cors;
