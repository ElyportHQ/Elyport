"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBlockNumber } from "wagmi";
import { elysium } from "@/lib/config";

export function LiveBlock() {
  const { data } = useBlockNumber({ chainId: elysium.id, watch: true, query: { refetchInterval: 4000 } });
  return <span className="mono">Elysium block #{data ? data.toLocaleString("en-US") : "…"}</span>;
}

/** Home uses the large glass footer inside its closing scene; app pages use this slim one. */
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="simple-footer">
      <div className="container">
        <LiveBlock />
        <span>
          Elyport is an independent tool. Not affiliated with Kinetiq or Elysium. ·{" "}
          <Link href="/terms">Terms</Link> · <Link href="/risk">Risk</Link>
        </span>
      </div>
    </footer>
  );
}

export function HomeFooter() {
  return (
    <footer style={{ position: "relative", padding: "0 24px 32px" }}>
      <div className="footer-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
          <span className="brand-word" style={{ fontSize: 26, display: "inline" }}>
            Elyport
          </span>
          <span style={{ fontSize: 14, color: "#444B57" }}>
            <LiveBlock />
          </span>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#5D6573" }}>
            Elyport is an independent tool. Not affiliated with Kinetiq or Elysium.
          </p>
        </div>
        <div className="footer-cols">
          <div>
            <span className="eyebrow">Tools</span>
            <Link href="/refuel">Refuel</Link>
            <Link href="/drop">Gas Drop</Link>
            <Link href="/lock">Locker</Link>
            <Link href="/vest">Vesting</Link>
          </div>
          <div>
            <span className="eyebrow">Explore</span>
            <Link href="/locks">All locks</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/docs#contracts">Contracts</Link>
          </div>
          <div>
            <span className="eyebrow">Elyport</span>
            <a href="https://x.com/ElyportHQ" target="_blank" rel="noreferrer">
              X
            </a>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/risk">Risk</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
