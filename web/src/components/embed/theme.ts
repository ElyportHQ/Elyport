import type { CSSProperties } from "react";

/** Widget theme from the query string: ?theme=dark&accent=4a56c2 */
export function embedTheme(sp: Record<string, string | string[] | undefined>) {
  const theme = sp.theme === "dark" ? "dark" : "light";
  const raw = typeof sp.accent === "string" ? sp.accent.replace(/^#/, "") : "";
  const accent = /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw}` : undefined;
  let accentInk: string | undefined;
  if (accent) {
    const n = parseInt(raw, 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    accentInk = lum > 0.6 ? "#14171c" : "#ffffff";
  }
  return { theme, style: accent ? ({ "--ew-accent": accent, "--ew-accent-ink": accentInk } as CSSProperties) : undefined };
}
