import { ImageResponse } from "next/og";
import { createPublicClient, erc20Abi, formatUnits, http, type Address } from "viem";
import { elysium } from "./config";
import { LOGO_DATA_URL } from "./logoData";

export const OG_SIZE = { width: 1200, height: 630 };

/** Server-side reader for Elysium, used by OG images. */
export function elysiumClient() {
  const rpc = process.env.ELYSIUM_RPC_URL_SERVER || elysium.rpcUrls.default.http[0];
  return createPublicClient({ chain: elysium, transport: http(rpc, { timeout: 4000 }) });
}

export async function tokenMeta(token: Address): Promise<{ symbol: string; decimals: number; name?: string }> {
  const c = elysiumClient();
  const [symbol, decimals, name] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
    c.readContract({ address: token, abi: erc20Abi, functionName: "name" }).catch(() => undefined),
  ]);
  return { symbol: String(symbol).slice(0, 12), decimals: Number(decimals), name: name ? String(name).slice(0, 32) : undefined };
}

export function amountText(v: bigint, decimals: number): string {
  const n = Number(formatUnits(v, decimals));
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export const dateText = (ts: bigint | number) =>
  new Date(Number(ts) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export { short as shortAddr };

type Card = {
  eyebrow: string;
  title: string;
  big?: string;
  lines?: string[];
  pills?: string[];
  /** 0..1 progress bar, e.g. vested share or time to unlock */
  progress?: number;
};

/** The shared Elyport share card: pearl background, chrome emblem, holographic accent. */
export function ogCard({ eyebrow, title, big, lines = [], pills = [], progress }: Card) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(160deg, #EEF0F8 0%, #F7F3F7 45%, #FFF6EC 75%, #F2F6FA 100%)",
          color: "#14171C",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "linear-gradient(90deg, #F7C8E0, #BFD7FF, #C6F5E6)" }} />
        <div
          style={{
            position: "absolute",
            right: -120,
            top: 60,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(230,238,255,0.6) 45%, rgba(230,238,255,0) 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URL} width={64} height={64} style={{ borderRadius: 9999 }} alt="" />
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>Elyport</div>
          <div style={{ marginLeft: 16, fontSize: 22, color: "#5D6573", letterSpacing: 2, textTransform: "uppercase" }}>{eyebrow}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 40, color: "#444B57" }}>{title}</div>
          {big && <div style={{ fontSize: big.length > 18 ? 76 : 96, letterSpacing: -3, lineHeight: 1 }}>{big}</div>}
          {lines.map((l) => (
            <div key={l} style={{ fontSize: 30, color: "#2B313A" }}>
              {l}
            </div>
          ))}
          {progress !== undefined && (
            <div style={{ display: "flex", marginTop: 12, width: 640, height: 16, borderRadius: 999, background: "#E3E7EC" }}>
              <div
                style={{
                  width: `${Math.max(2, Math.min(100, progress * 100))}%`,
                  height: 16,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #F7C8E0, #BFD7FF, #7FE0C1)",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {pills.map((p) => (
              <div key={p} style={{ padding: "10px 22px", borderRadius: 999, background: "#FFFFFF", border: "2px solid #DDE2E9", fontSize: 24 }}>
                {p}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 22, color: "#5D6573" }}>Verified on Elysium</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
