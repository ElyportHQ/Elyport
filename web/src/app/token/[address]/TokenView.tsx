"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { contracts, elysium, explorerAddress, siteUrl } from "@/lib/config";
import { lockerAbi, vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useMounted } from "@/lib/useMounted";

const cid = elysium.id;
const now = () => Math.floor(Date.now() / 1000);

type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };
type SchedT = { token: Address; beneficiary: Address; total: bigint; released: bigint; start: bigint; cliff: bigint; duration: bigint; revoked: boolean };

export function TokenView({ token }: { token: Address }) {
  const meta = useReadContracts({
    contracts: [
      { chainId: cid, address: token, abi: erc20Abi, functionName: "symbol" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "decimals" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "totalSupply" },
    ],
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = (meta.data?.[1]?.result as number | undefined) ?? 18;
  const supply = meta.data?.[2]?.result as bigint | undefined;

  const lockIds = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token], query: { enabled: !!contracts.locker } });
  const schedIds = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token], query: { enabled: !!contracts.vesting } });
  const lIds = lockIds.data ?? [];
  const sIds = schedIds.data ?? [];

  const locks = useReadContracts({
    contracts: lIds.map((id) => ({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    query: { enabled: lIds.length > 0 },
  });
  const scheds = useReadContracts({
    contracts: sIds.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
    query: { enabled: sIds.length > 0 },
  });

  const lockList = lIds.map((id, i) => ({ id, l: locks.data?.[i]?.result as LockT | undefined })).filter((x) => x.l && !x.l.withdrawn) as { id: bigint; l: LockT }[];
  const schedList = sIds.map((id, i) => ({ id, s: scheds.data?.[i]?.result as SchedT | undefined })).filter((x) => x.s) as { id: bigint; s: SchedT }[];

  const mounted = useMounted();
  const isOwn = (l: LockT) => l.token.toLowerCase() === token.toLowerCase();
  const ownLocks = lockList.filter((x) => isOwn(x.l));
  const lpLocks = lockList.filter((x) => !isOwn(x.l) && x.l.isLP);
  const pairs = Array.from(new Set(lpLocks.map((x) => x.l.token.toLowerCase()))) as Address[];
  const lpSup = useReadContracts({
    contracts: pairs.map((p) => ({ chainId: cid, address: p, abi: erc20Abi, functionName: "totalSupply" as const })),
    query: { enabled: pairs.length > 0 },
  });
  const pairStats = pairs.map((p, i) => {
    const locked = lpLocks.filter((x) => x.l.token.toLowerCase() === p).reduce((a, x) => a + x.l.amount, 0n);
    const sup = lpSup.data?.[i]?.result as bigint | undefined;
    const share = sup && sup > 0n ? Math.min(100, Number((locked * 10_000n) / sup) / 100) : undefined;
    return { pair: p, locked, share };
  });
  const bestLp = pairStats.reduce<(typeof pairStats)[number] | undefined>((b, x) => (x.share !== undefined && (!b || (b.share ?? 0) < x.share) ? x : b), undefined);

  const lockedTotal = ownLocks.reduce((a, x) => a + x.l.amount, 0n);
  const share = (v: bigint) => (supply && supply > 0n ? Math.min(100, Number((v * 10_000n) / supply) / 100) : 0);
  const vestingLeft = schedList.reduce((a, x) => a + (x.s.total - x.s.released), 0n);
  const pct = (v: bigint) => (supply && supply > 0n ? `${Number((v * 10_000n) / supply) / 100}%` : "—");
  const upcoming = lockList
    .filter((x) => Number(x.l.unlockAt) > now())
    .sort((a, b) => Number(a.l.unlockAt - b.l.unlockAt))
    .slice(0, 5);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="panel">
          <div className="eyebrow">Liquidity locked</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{bestLp?.share !== undefined ? `${bestLp.share}%` : "None"}</div>
          <div className="eyebrow">{bestLp ? `of the LP · pair ${short(bestLp.pair)}` : "No LP locked on Elyport"}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Tokens locked</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{pct(lockedTotal)}</div>
          <div className="eyebrow">of supply · {fmtAmount(lockedTotal, decimals)}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Still vesting</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{pct(vestingLeft)}</div>
          <div className="eyebrow">of supply · {fmtAmount(vestingLeft, decimals)}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Next unlock</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{upcoming[0] ? countdown(upcoming[0].l.unlockAt) : "None"}</div>
          <div className="eyebrow">{upcoming[0] ? fmtDate(upcoming[0].l.unlockAt) : "No active locks"}</div>
        </div>
      </div>

      <section className="panel">
        <div className="eyebrow">Supply</div>
        <div className="supply-bar" style={{ marginTop: 10 }} aria-label="Supply breakdown">
          <span style={{ width: `${share(lockedTotal)}%`, background: "#14171C" }} />
          <span style={{ width: `${share(vestingLeft)}%`, background: "linear-gradient(90deg,#BFD7FF,#F7C8E0)" }} />
        </div>
        <div className="legend">
          <span>
            <i style={{ background: "#14171C" }} />
            Locked {share(lockedTotal)}%
          </span>
          <span>
            <i style={{ background: "#BFD7FF" }} />
            Still vesting {share(vestingLeft)}%
          </span>
          <span>
            <i style={{ background: "#E9ECF1", border: "1px solid #D5DAE1" }} />
            Circulating or unlocked {Math.max(0, Math.round((100 - share(lockedTotal) - share(vestingLeft)) * 100) / 100)}%
          </span>
        </div>
        {pairStats.length > 0 && (
          <div className="legend" style={{ marginTop: 16 }}>
            {pairStats.map((p) => (
              <span key={p.pair}>
                LP {short(p.pair)}: <b>{p.share !== undefined ? `${p.share}%` : "…"}</b> locked
              </span>
            ))}
          </div>
        )}
      </section>

      {mounted && lockList.length > 0 && <BadgeEmbed token={token} />}

      <section>
        <h2 style={{ fontWeight: 500, fontSize: 24 }}>Locks</h2>
        {lockList.length === 0 ? (
          <p className="note">No active locks for this token on Elyport.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lock</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Unlocks</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {lockList.map(({ id, l }) => (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>{l.isLP ? (isOwn(l) ? "LP" : `LP · ${short(l.token)}`) : "Token"}</td>
                    <td className="mono">{fmtAmount(l.amount, isOwn(l) ? decimals : 18)}</td>
                    <td className="mono">
                      {fmtDate(l.unlockAt)} · {countdown(l.unlockAt)}
                    </td>
                    <td className="mono">
                      <a href={explorerAddress(l.owner)} target="_blank" rel="noreferrer">
                        {short(l.owner)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 500, fontSize: 24 }}>Vesting</h2>
        {schedList.length === 0 ? (
          <p className="note">No vesting schedules for this token on Elyport.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Schedule</th>
                  <th>Recipient</th>
                  <th>Left to vest</th>
                  <th>Ends</th>
                </tr>
              </thead>
              <tbody>
                {schedList.map(({ id, s }) => (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/vest/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td className="mono">{short(s.beneficiary)}</td>
                    <td className="mono">{fmtAmount(s.total - s.released, decimals)}</td>
                    <td className="mono">{s.revoked ? "Cancelled" : fmtDate(s.start + s.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="eyebrow">
        {symbol ?? "Token"} · <a href={explorerAddress(token)} target="_blank" rel="noreferrer">{token}</a>
      </p>
    </div>
  );
}

/** Copy-paste badge for project sites, docs and READMEs. */
function BadgeEmbed({ token }: { token: Address }) {
  const page = `${siteUrl}/token/${token}`;
  const img = `${siteUrl}/badge/${token}`;
  const html = `<a href="${page}"><img src="${img}" alt="Locked on Elyport" height="36"></a>`;
  const md = `[![Locked on Elyport](${img})](${page})`;
  const copy = (t: string) => navigator.clipboard?.writeText(t).catch(() => undefined);
  return (
    <section className="panel embed">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Show it off</div>
          <h3 style={{ margin: "4px 0 0", fontWeight: 500, fontSize: 20 }}>Badge for your site, docs or README</h3>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${token}`} alt="Locked on Elyport badge" height={36} />
      </div>
      <p className="note" style={{ margin: 0 }}>It updates on its own as locks change. For X and Telegram, share the page link: it unfurls into a card.</p>
      <pre>{html}</pre>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={() => copy(html)}>
          Copy HTML
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => copy(md)}>
          Copy Markdown
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => copy(page)}>
          Copy page link
        </button>
      </div>
    </section>
  );
}
