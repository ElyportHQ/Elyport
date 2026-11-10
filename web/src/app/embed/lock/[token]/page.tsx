import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { apiToken } from "@/lib/api";
import { amountText, dateText } from "@/lib/og";
import { siteUrl } from "@/lib/config";
import { embedTheme } from "@/components/embed/theme";

export const metadata: Metadata = { title: "Lock widget" };
export const revalidate = 60;

const inDays = (ts: number) => {
  const d = Math.ceil((ts - Date.now() / 1000) / 86_400);
  return d <= 0 ? "today" : d === 1 ? "in 1 day" : `in ${d.toLocaleString("en-US")} days`;
};
const pctText = (p: number) => `${p >= 99.95 ? 100 : p < 10 ? p.toFixed(1) : Math.round(p)}%`;

export default async function EmbedLockPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  if (!isAddress(token)) notFound();
  const { theme, style } = embedTheme(await searchParams);
  const data = await apiToken(token as Address).catch(() => null);
  const symbol = data?.token.symbol ?? "Token";
  const decimals = data?.token.decimals ?? 18;
  const sum = data?.summary;
  const active = data ? data.locks.filter((l) => l.status === "locked").sort((a, b) => a.unlockAt - b.unlockAt) : [];
  const bestLp = data?.liquidity.length ? data.liquidity.reduce((a, b) => (b.lockedPercent > a.lockedPercent ? b : a)) : undefined;

  return (
    <div className="ew" data-theme={theme} style={style}>
      <div className="ew-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ew-logo" src="/icon-192.png" alt="" />
        <div>
          <div className="ew-title">{symbol} locks</div>
          <div className="ew-sub">Live from Elysium</div>
        </div>
        {active.length > 0 && <span className="ew-pill">Locked</span>}
      </div>

      {!data ? (
        <p className="ew-text">Could not reach Elysium right now. Try again in a moment.</p>
      ) : active.length === 0 ? (
        <p className="ew-text">No active {symbol} locks on Elyport yet.</p>
      ) : (
        <>
          {bestLp ? (
            <>
              <div className="ew-label">Liquidity locked</div>
              <div className="ew-big">{pctText(bestLp.lockedPercent)}</div>
              <div className="ew-bar">
                <div style={{ width: `${Math.max(2, Math.min(100, bestLp.lockedPercent))}%` }} />
              </div>
            </>
          ) : (
            <>
              <div className="ew-label">Supply locked</div>
              <div className="ew-big">{pctText(sum?.supplyLockedPercent ?? 0)}</div>
              <div className="ew-bar">
                <div style={{ width: `${Math.max(2, Math.min(100, sum?.supplyLockedPercent ?? 0))}%` }} />
              </div>
            </>
          )}
          <div className="ew-rows">
            {bestLp && (
              <div className="ew-row">
                <span>LP locked until</span>
                <b>{dateText(bestLp.lockedUntil)}</b>
              </div>
            )}
            {bestLp && (sum?.supplyLockedPercent ?? 0) > 0 && (
              <div className="ew-row">
                <span>Supply locked</span>
                <b>{pctText(sum!.supplyLockedPercent!)}</b>
              </div>
            )}
            <div className="ew-row">
              <span>Active locks</span>
              <b>{active.length}</b>
            </div>
            {sum?.nextUnlock && (
              <div className="ew-row">
                <span>Next unlock</span>
                <b>
                  {dateText(sum.nextUnlock)} · {inDays(sum.nextUnlock)}
                </b>
              </div>
            )}
          </div>
          <ul className="ew-list">
            {active.slice(0, 3).map((l) => (
              <li key={l.id.toString()}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  <span>
                    #{l.id.toString()} · {l.isLP ? "LP" : symbol}
                  </span>
                  <b>
                    {amountText(l.amount, l.isLP ? 18 : decimals)} · {dateText(l.unlockAt)}
                  </b>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <a className="ew-btn ghost" href={`${siteUrl}/token/${token}`} target="_blank" rel="noreferrer">
        Verify on Elyport ↗
      </a>
      <div className="ew-foot">
        <span>Updates every minute</span>
        <a href={siteUrl} target="_blank" rel="noreferrer">
          Powered by Elyport
        </a>
      </div>
    </div>
  );
}
