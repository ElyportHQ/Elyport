import { API_VERSION, contractsInfo, cors, json } from "@/lib/api";
import { siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export function GET() {
  const base = `${siteUrl}/api/v1`;
  return json(
    {
      name: "Elyport public API",
      version: API_VERSION,
      docs: `${siteUrl}/docs/api`,
      notes: "Read-only. Amounts are strings in the token's smallest unit. Times are Unix seconds. Responses are cached for about 30 seconds.",
      endpoints: {
        stats: `${base}/stats`,
        token: `${base}/token/{address}`,
        lock: `${base}/lock/{id}`,
        vesting: `${base}/vesting/{id}`,
        wallet: `${base}/wallet/{address}`,
      },
      contracts: contractsInfo(),
    },
    200,
    300,
  );
}

export const OPTIONS = cors;
