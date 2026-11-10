import { isAddress, type Address } from "viem";
import { tokenSafety } from "@/lib/tokenSafety";

export const revalidate = 300;

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);
const pct = (r: number) => `${r >= 0.995 ? Math.round(r * 100) : (r * 100).toFixed(r < 0.1 ? 1 : 0)}%`;
const month = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** Embeddable "locked on Elyport" badge: /badge/<token address> */
export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  let label = "Elyport";
  let value = "Check locks";
  let ok = false;
  if (isAddress(address)) {
    try {
      const s = await tokenSafety(address as Address);
      if (s.lpLocked !== undefined && s.lpLocked > 0) {
        label = "Liquidity locked";
        value = `${pct(s.lpLocked)} · until ${month(s.lpUntil!)}`;
        ok = true;
      } else if (s.tokenLocked > 0) {
        label = `${s.symbol} locked`;
        value = `${pct(s.tokenLocked)} of supply`;
        ok = true;
      } else if (s.unverifiedLpOnly) {
        label = "Elyport";
        value = "LP pair not verified";
      } else {
        label = "Elyport";
        value = "No active locks";
      }
    } catch {
      /* fall back to the neutral badge */
    }
  }
  const lw = 44 + label.length * 7.2;
  const vw = 22 + value.length * 7.4;
  const w = Math.round(lw + vw);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="36" viewBox="0 0 ${w} 36" role="img" aria-label="${esc(label)}: ${esc(value)}">
<defs>
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#B9C1CC"/><stop offset="1" stop-color="#E3E7EC"/></linearGradient>
<linearGradient id="h" x1="0" x2="1"><stop offset="0" stop-color="#F7C8E0"/><stop offset=".5" stop-color="#BFD7FF"/><stop offset="1" stop-color="#C6F5E6"/></linearGradient>
</defs>
<rect width="${w}" height="36" rx="18" fill="#F5F6F8" stroke="#DDE2E9"/>
<rect x="${lw.toFixed(1)}" y="3" width="${(vw - 3).toFixed(1)}" height="30" rx="15" fill="${ok ? "#14171C" : "#fff"}" stroke="${ok ? "#14171C" : "#DDE2E9"}"/>
<g fill="none" stroke="url(#c)" stroke-linecap="round">
<path d="M10 27V18a8 8 0 0 1 16 0v9" stroke-width="3"/><path d="M14 27V18a4 4 0 0 1 8 0v9" stroke-width="2.2"/>
</g>
<rect x="9" y="29" width="18" height="2" rx="1" fill="url(#h)"/>
<text x="34" y="23" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="13" fill="#2B313A">${esc(label)}</text>
<text x="${(lw + 11).toFixed(1)}" y="23" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif" font-size="13" font-weight="600" fill="${ok ? "#fff" : "#2B313A"}">${esc(value)}</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
