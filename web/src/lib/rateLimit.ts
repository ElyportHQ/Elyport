import "server-only";

type Bucket = { tokens: number; at: number };
const buckets = new Map<string, Bucket>();

/**
 * Small token-bucket limiter per client IP and route. It runs per server instance. The global limit
 * is a Vercel Firewall rule (60 requests / minute / IP on /api/v1 and /api/refuel/process, HTTP 429),
 * applied at the edge before requests reach these functions; see SECURITY.md.
 */
export function rateLimit(req: Request, route: string, perMinute: number): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMinute, at: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.at) / 60_000) * perMinute);
  b.at = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now - v.at > 120_000) buckets.delete(k);
  }
  return true;
}
