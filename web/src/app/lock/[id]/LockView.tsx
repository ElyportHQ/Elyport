"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { contracts, elysium, explorerAddress, siteUrl } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { LockRing } from "@/components/home/Scenes";

const cid = elysium.id;

export function LockView({ idStr }: { idStr: string }) {
  const id = BigInt(idStr);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((v) => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const lock = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "getLock", args: [id], query: { enabled: !!contracts.locker } });
  const l = lock.data;
  const meta = useReadContracts({
    contracts: l
      ? [
          { chainId: cid, address: l.token, abi: erc20Abi, functionName: "symbol" },
          { chainId: cid, address: l.token, abi: erc20Abi, functionName: "decimals" },
          { chainId: cid, address: l.token, abi: erc20Abi, functionName: "totalSupply" },
        ]
      : [],
    query: { enabled: !!l },
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = (meta.data?.[1]?.result as number | undefined) ?? 18;
  const supply = meta.data?.[2]?.result as bigint | undefined;

  if (!contracts.locker) return <p className="warn">Locker is not deployed on this network yet.</p>;
  if (lock.isLoading) return <p className="note">Loading lock…</p>;
  if (!l) return <p className="error">Lock #{id.toString()} was not found.</p>;

  const pct = supply && supply > 0n ? Number((l.amount * 10_000n) / supply) / 100 : undefined;
  const pageUrl = `${siteUrl}/lock/${id}`;
  const tweet = `${symbol ?? "Token"}${l.isLP ? " LP" : ""} is locked on @ElyportHQ until ${fmtDate(l.unlockAt)}. Verify it yourself:`;

  return (
    <div className="app-grid">
      <section className="console" style={{ alignItems: "center", textAlign: "center" }}>
        <span className="pill pill-info">{l.withdrawn ? "Withdrawn" : Number(l.unlockAt) <= Date.now() / 1000 ? "Unlocked" : "Locked"}</span>
        <LockRing label={l.withdrawn ? "Withdrawn" : `Unlocks in ${countdown(l.unlockAt)}`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
          <div className="panel" style={{ padding: 14, textAlign: "left" }}>
            <div className="eyebrow">Amount</div>
            <div style={{ fontSize: 24, fontWeight: 300 }}>
              {fmtAmount(l.amount, decimals)} {symbol}
            </div>
          </div>
          <div className="panel" style={{ padding: 14, textAlign: "left" }}>
            <div className="eyebrow">Of supply</div>
            <div style={{ fontSize: 24, fontWeight: 300 }}>{pct !== undefined ? `${pct}%` : "—"}</div>
          </div>
        </div>
        <a
          className="btn btn-silver btn-block"
          href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noreferrer"
        >
          Share to X
        </a>
      </section>

      <section className="panel">
        <dl className="summary" style={{ background: "transparent", padding: 0 }}>
          <dt>Lock</dt>
          <dd>#{id.toString()}</dd>
          <dt>Token</dt>
          <dd>
            <Link href={`/token/${l.token}`}>{symbol ? `${symbol} · ${short(l.token)}` : short(l.token)}</Link>
          </dd>
          <dt>Type</dt>
          <dd>{l.isLP ? "LP token" : "Token"}</dd>
          <dt>Locked on</dt>
          <dd>{fmtDate(l.createdAt)}</dd>
          <dt>Unlocks</dt>
          <dd>{fmtDate(l.unlockAt)}</dd>
          <dt>Owner (can withdraw)</dt>
          <dd>
            <a href={explorerAddress(l.owner)} target="_blank" rel="noreferrer">
              {short(l.owner)}
            </a>
          </dd>
        </dl>
        <p className="note" style={{ marginTop: 16 }}>
          This lock can be extended or topped up by its owner, but never shortened. Tokens can only leave after the unlock
          date.
        </p>
      </section>
    </div>
  );
}
