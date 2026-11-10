import Link from "next/link";
import { getRecentLocks } from "@/lib/recentLocks";

const DAY = 86_400;

function amountText(v: string) {
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

const dateText = (ts: number) => new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

function untilText(ts: number, now: number) {
  const d = Math.floor((ts - now) / DAY);
  if (d >= 365) return `in ${(d / 365).toFixed(1)} years`;
  if (d >= 60) return `in ${Math.round(d / 30)} months`;
  if (d >= 1) return `in ${d} ${d === 1 ? "day" : "days"}`;
  return "within a day";
}

function agoText(ts: number, now: number) {
  const s = Math.max(0, now - ts);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < DAY) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / DAY);
  return `${d}d ago`;
}

/** Newest active locks on Elyport, one card per token. Renders nothing until there is at least one. */
export async function RecentLocks() {
  const items = await getRecentLocks();
  if (!items || items.length === 0) return null;
  const now = Math.floor(Date.now() / 1000);

  return (
    <section className="container" style={{ paddingTop: 0, paddingBottom: 110 }}>
      <div className="rl-head">
        <div>
          <span className="live-badge">
            <span className="live-dot" />
            Live on Elysium
          </span>
          <h2 className="section-title" style={{ fontSize: "clamp(36px, 4.4vw, 48px)", margin: "14px 0 0" }}>
            Recently locked
          </h2>
        </div>
        <Link href="/locks" className="link-accent">
          See all locks ↗
        </Link>
      </div>
      <div className="rl-grid">
        {items.map((t) => {
          const href = t.locks > 1 ? `/token/${t.token}` : `/lock/${t.latestLockId}`;
          return (
            <Link key={t.token} href={href} className="rl-card">
              <div className="rl-top">
                <span className="rl-sym">{t.label}</span>
                <span className="rl-ago">{agoText(t.lockedAt, now)}</span>
              </div>
              {t.name && <div className="rl-name">{t.name}</div>}
              <div className="rl-amount">
                {amountText(t.amount)}
                {t.ofSupply !== null && <span> · {t.ofSupply < 0.01 ? "<0.01" : (Math.floor(t.ofSupply * 100) / 100).toFixed(2)}% of supply</span>}
              </div>
              <div className="rl-unlock">
                <span className="rl-lock" aria-hidden="true" />
                {t.locks > 1 ? "Next unlock" : "Unlocks"} {dateText(t.nextUnlock)} · {untilText(t.nextUnlock, now)}
              </div>
              <div className="rl-foot">
                <span>{t.locks > 1 ? `${t.locks} locks` : `Lock #${t.latestLockId}`}</span>
                <span className="rl-go">{t.locks > 1 ? "View token ↗" : "View lock ↗"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
