"use client";

import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";
import { contracts, elysium, explorerAddress, siteUrl } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useMounted } from "@/lib/useMounted";
import { nextRelease } from "@/lib/vesting";
import { icsHref } from "@/lib/ics";

const cid = elysium.id;

export function VestView({ idStr }: { idStr: string }) {
  const id = BigInt(idStr);
  const { address } = useAccount();
  const sched = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "getSchedule", args: [id], query: { enabled: !!contracts.vesting } });
  const claimable = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "claimable", args: [id], query: { enabled: !!contracts.vesting, refetchInterval: 15_000 } });
  const s = sched.data;
  const meta = useReadContracts({
    contracts: s
      ? [
          { chainId: cid, address: s.token, abi: erc20Abi, functionName: "symbol" },
          { chainId: cid, address: s.token, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: !!s },
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = (meta.data?.[1]?.result as number | undefined) ?? 18;
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const mounted = useMounted();

  if (!contracts.vesting) return <p className="warn">Vesting is not deployed on this network yet.</p>;
  if (sched.isLoading) return <p className="note">Loading schedule…</p>;
  if (!s) return <p className="error">Schedule #{idStr} was not found.</p>;

  const vestedPct = s.total > 0n ? Number(((s.released + (claimable.data ?? 0n)) * 10_000n) / s.total) / 100 : 0;
  const isBeneficiary = address?.toLowerCase() === s.beneficiary.toLowerCase();

  return (
    <div className="app-grid">
      <section className="panel-holo" style={{ padding: 28 }}>
        <div className="eyebrow" style={{ color: "#3E4552" }}>
          Claimable now
        </div>
        <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: "-0.03em", margin: "6px 0 16px" }}>
          {fmtAmount(claimable.data, decimals)} {symbol}
        </div>
        <div className="bar" style={{ background: "rgba(255,255,255,.7)" }}>
          <div style={{ width: `${Math.max(2, vestedPct)}%`, background: "#14171C", animation: "none" }} />
        </div>
        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }} className="eyebrow">
          <span>{vestedPct}% vested</span>
          <span>{s.revoked ? "Cancelled" : `Ends ${fmtDate(s.start + s.duration)}`}</span>
        </div>
        {mounted && <NextReleaseBox s={s} id={idStr} symbol={symbol} decimals={decimals} />}
        <button
          type="button"
          className="btn btn-dark btn-lg btn-block"
          style={{ marginTop: 20 }}
          disabled={!claimable.data || state.status === "pending"}
          onClick={() => run("Claim", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claim", args: [id] }))}
        >
          {isBeneficiary ? "Claim" : "Claim for recipient"}
        </button>
        {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"} style={{ marginTop: 12 }}>{state.message}</p>}
      </section>

      <section className="panel">
        <dl className="summary" style={{ background: "transparent", padding: 0 }}>
          <dt>Token</dt>
          <dd>
            <Link href={`/token/${s.token}`}>{symbol ? `${symbol} · ${short(s.token)}` : short(s.token)}</Link>
          </dd>
          <dt>Recipient</dt>
          <dd>
            <a href={explorerAddress(s.beneficiary)} target="_blank" rel="noreferrer">
              {short(s.beneficiary)}
            </a>
          </dd>
          <dt>Total</dt>
          <dd>{fmtAmount(s.total, decimals)}</dd>
          <dt>Released</dt>
          <dd>{fmtAmount(s.released, decimals)}</dd>
          <dt>Start</dt>
          <dd>{fmtDate(s.start)}</dd>
          <dt>Cliff ends</dt>
          <dd>{fmtDate(s.start + s.cliff)}</dd>
          <dt>Release</dt>
          <dd>{s.period > 1n ? "Monthly" : "Linear"}</dd>
          <dt>Cancellable</dt>
          <dd>{s.revocable ? (s.revoked ? "Cancelled" : "Yes") : "No"}</dd>
        </dl>
      </section>
    </div>
  );
}

type S = { total: bigint; released: bigint; start: bigint; cliff: bigint; duration: bigint; period: bigint; revoked: boolean };

/** Shows when the next tokens unlock, with a one-tap calendar reminder. */
export function NextReleaseBox({ s, id, symbol, decimals }: { s: S; id: string; symbol?: string; decimals: number }) {
  const n = nextRelease(s);
  if (n.kind === "done") return null;
  const box = { marginTop: 16, padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,.72)", border: "1px solid #E1E5EB" } as const;
  if (n.kind === "streaming")
    return (
      <div style={box}>
        <div className="eyebrow">Next release</div>
        <div style={{ fontSize: 17, marginTop: 4 }}>
          Streaming · about {fmtAmount(n.perDay, decimals)} {symbol} per day
        </div>
      </div>
    );
  const title = `Claim ${fmtAmount(n.amount, decimals)} ${symbol ?? "tokens"} on Elyport`;
  return (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div className="eyebrow">{n.reason === "cliff" ? "Cliff ends" : "Next release"}</div>
        <div style={{ fontSize: 17, marginTop: 4 }}>
          +{fmtAmount(n.amount, decimals)} {symbol} · {fmtDate(n.ts)} · in {countdown(n.ts)}
        </div>
      </div>
      <a
        className="btn btn-ghost"
        href={icsHref({ title, ts: n.ts, url: `${siteUrl}/vest/${id}`, description: `Vesting schedule #${id} releases more tokens. Open Elyport to claim.` })}
        download={`elyport-vesting-${id}.ics`}
      >
        Remind me
      </a>
    </div>
  );
}
