"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { erc20Abi, type Address } from "viem";
import { contracts, elysium, siteUrl } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useMounted } from "@/lib/useMounted";
import { nextRelease, vestedAt, type Sched } from "@/lib/vesting";
import { NextReleaseBox } from "@/app/vest/[id]/VestView";

const cid = elysium.id;
type SchedT = Sched & { token: Address; creator: Address; beneficiary: Address; revocable: boolean };

export function ClaimView({ token }: { token: Address }) {
  const mounted = useMounted();
  const { address } = useAccount();
  const { open } = useAppKit();
  const [copied, setCopied] = useState(false);

  const meta = useReadContracts({
    contracts: [
      { chainId: cid, address: token, abi: erc20Abi, functionName: "symbol" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "name" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "decimals" },
    ],
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const name = meta.data?.[1]?.result as string | undefined;
  const decimals = (meta.data?.[2]?.result as number | undefined) ?? 18;

  const idsQ = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token], query: { enabled: !!contracts.vesting } });
  const ids = (idsQ.data ?? []).slice(-300);
  const scheds = useReadContracts({
    contracts: ids.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
    query: { enabled: ids.length > 0 },
  });
  const all = ids.map((id, i) => ({ id, s: scheds.data?.[i]?.result as SchedT | undefined })).filter((x): x is { id: bigint; s: SchedT } => !!x.s);
  const mine = address ? all.filter((x) => x.s.beneficiary.toLowerCase() === address.toLowerCase()) : [];

  const claimables = useReadContracts({
    contracts: mine.map((x) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claimable" as const, args: [x.id] as const })),
    query: { enabled: mine.length > 0, refetchInterval: 20_000 },
  });
  const claimable = (i: number) => (claimables.data?.[i]?.result as bigint | undefined) ?? 0n;
  const myClaimable = mine.reduce((a, _, i) => a + claimable(i), 0n);
  const myTotal = mine.reduce((a, x) => a + x.s.total, 0n);
  const myReleased = mine.reduce((a, x) => a + x.s.released, 0n);

  const now = mounted ? Date.now() / 1000 : 0;
  const total = all.reduce((a, x) => a + x.s.total, 0n);
  const vestedNow = mounted ? all.reduce((a, x) => a + vestedAt(x.s, now), 0n) : 0n;
  const recipients = new Set(all.map((x) => x.s.beneficiary.toLowerCase())).size;
  const nexts = mounted ? all.map((x) => nextRelease(x.s, now)).flatMap((n) => (n.kind === "date" ? [n.ts] : [])) : [];
  const projectNext = nexts.length ? Math.min(...nexts) : undefined;
  const vestedPct = total > 0n ? Number((vestedNow * 10_000n) / total) / 100 : 0;

  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const claim = (id: bigint) => run("Claim", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claim", args: [id] }));
  const claimAll = async () => {
    for (let i = 0; i < mine.length; i++) if (claimable(i) > 0n) await claim(mine[i].id);
    claimables.refetch();
  };
  const share = () => {
    navigator.clipboard?.writeText(`${siteUrl}/claim/${token}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const label = symbol ?? short(token);

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Claim · {name ?? "Token"}</div>
          <h1>Claim your {label}</h1>
          <p>Vested {label} unlocks here on schedule. Connect the wallet that receives it and claim.</p>
        </div>
      </div>

      <div className="app-grid">
        <section className="panel-holo" style={{ padding: 28 }}>
          {!mounted ? null : !address ? (
            <div className="stack" style={{ gap: 16 }}>
              <div className="eyebrow" style={{ color: "#3E4552" }}>Your allocation</div>
              <p className="lead" style={{ margin: 0 }}>Connect your wallet to see what you can claim.</p>
              <button type="button" className="btn btn-dark btn-lg btn-block" onClick={() => open()}>
                Connect wallet
              </button>
            </div>
          ) : mine.length === 0 ? (
            <div className="stack" style={{ gap: 12 }}>
              <div className="eyebrow" style={{ color: "#3E4552" }}>Your allocation</div>
              <p className="lead" style={{ margin: 0 }}>
                {scheds.isLoading || idsQ.isLoading ? "Checking…" : `No ${label} vesting pays ${short(address)}.`}
              </p>
              <p className="note" style={{ margin: 0 }}>Make sure you are connected with the wallet the project sent your allocation to.</p>
            </div>
          ) : (
            <>
              <div className="eyebrow" style={{ color: "#3E4552" }}>Claimable now</div>
              <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: "-0.03em", margin: "6px 0 4px" }}>
                {fmtAmount(myClaimable, decimals)} {label}
              </div>
              <div className="eyebrow">
                Claimed {fmtAmount(myReleased, decimals)} of {fmtAmount(myTotal, decimals)}
              </div>
              {mine.length === 1 ? (
                <NextReleaseBox s={mine[0].s} id={mine[0].id.toString()} symbol={symbol} decimals={decimals} />
              ) : null}
              <button type="button" className="btn btn-dark btn-lg btn-block" style={{ marginTop: 20 }} disabled={myClaimable === 0n || state.status === "pending"} onClick={claimAll}>
                {mine.filter((_, i) => claimable(i) > 0n).length > 1 ? "Claim all" : "Claim"}
              </button>
              {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"} style={{ marginTop: 12 }}>{state.message}</p>}
              {mine.length > 1 && (
                <div className="table-wrap" style={{ marginTop: 18 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Schedule</th>
                        <th>Claimable</th>
                        <th>Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.map((x, i) => {
                        const n = nextRelease(x.s, now);
                        return (
                          <tr key={x.id.toString()}>
                            <td>
                              <Link href={`/vest/${x.id}`}>#{x.id.toString()}</Link>
                            </td>
                            <td className="mono">{fmtAmount(claimable(i), decimals)}</td>
                            <td className="mono">{n.kind === "date" ? fmtDate(n.ts) : n.kind === "streaming" ? "Streaming" : "Done"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="eyebrow">Project vesting</div>
          {all.length === 0 ? (
            <p className="note">{idsQ.isLoading ? "Loading…" : `No vesting for ${label} on Elyport yet.`}</p>
          ) : (
            <>
              <div style={{ fontSize: 34, fontWeight: 300, margin: "6px 0 10px" }}>{vestedPct}% vested</div>
              <div className="bar" style={{ background: "#E9ECF1" }}>
                <div style={{ width: `${Math.max(2, vestedPct)}%`, background: "#14171C", animation: "none" }} />
              </div>
              <dl className="summary" style={{ background: "transparent", padding: 0, marginTop: 16 }}>
                <dt>Recipients</dt>
                <dd>{recipients}</dd>
                <dt>Allocated</dt>
                <dd>
                  {fmtAmount(total, decimals)} {label}
                </dd>
                <dt>Next release</dt>
                <dd>{projectNext ? `${fmtDate(projectNext)} · ${countdown(projectNext)}` : "—"}</dd>
              </dl>
            </>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            <button type="button" className="btn btn-ghost" onClick={share}>
              {copied ? "Link copied" : "Copy claim link"}
            </button>
            <Link className="btn btn-ghost" href={`/token/${token}`}>
              Token safety
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
