"use client";

import { useEffect, type CSSProperties } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { erc20Abi, type Address } from "viem";
import { contracts, elysium, siteUrl } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useMounted } from "@/lib/useMounted";
import { nextRelease, type Sched } from "@/lib/vesting";

const cid = elysium.id;
type SchedT = Sched & { token: Address; beneficiary: Address };

export function EmbedClaim({ token, theme, style }: { token: Address; theme: "light" | "dark"; style?: CSSProperties }) {
  const mounted = useMounted();
  const { address } = useAccount();
  const { open } = useAppKit();
  const { open: modalOpen } = useAppKitState();

  // Give the wallet modal room inside the iframe.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("elyport:minheight", { detail: modalOpen ? 640 : 0 }));
  }, [modalOpen]);

  const meta = useReadContracts({
    contracts: [
      { chainId: cid, address: token, abi: erc20Abi, functionName: "symbol" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "decimals" },
    ],
  });
  const symbol = (meta.data?.[0]?.result as string | undefined) ?? "tokens";
  const decimals = (meta.data?.[1]?.result as number | undefined) ?? 18;

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
  const pct = myTotal > 0n ? Number(((myReleased + myClaimable) * 10_000n) / myTotal) / 100 : 0;
  const now = mounted ? Date.now() / 1000 : 0;
  const nexts = mounted ? mine.map((x) => nextRelease(x.s, now)).flatMap((n) => (n.kind === "date" ? [n.ts] : [])) : [];
  const next = nexts.length ? Math.min(...nexts) : undefined;
  const streaming = mounted && mine.some((x) => nextRelease(x.s, now).kind === "streaming");

  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const claimAll = async () => {
    for (let i = 0; i < mine.length; i++) {
      if (claimable(i) > 0n) {
        const r = await run("Claim", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claim", args: [mine[i].id] }));
        if (!r) break;
      }
    }
    claimables.refetch();
    scheds.refetch();
  };
  const loading = idsQ.isLoading || scheds.isLoading;
  const many = mine.filter((_, i) => claimable(i) > 0n).length > 1;

  return (
    <div className="ew" data-theme={theme} style={style}>
      <div className="ew-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ew-logo" src="/icon-192.png" alt="" />
        <div>
          <div className="ew-title">Claim {symbol}</div>
          <div className="ew-sub">Vesting on Elysium</div>
        </div>
      </div>

      {!mounted ? (
        <p className="ew-text">Loading…</p>
      ) : !address ? (
        <>
          <p className="ew-text">Connect the wallet that receives your {symbol} allocation.</p>
          <button type="button" className="ew-btn" onClick={() => open()}>
            Connect wallet
          </button>
        </>
      ) : mine.length === 0 ? (
        <>
          <p className="ew-text">{loading ? "Checking your allocation…" : `No ${symbol} vesting pays ${short(address)}.`}</p>
          {!loading && (
            <button type="button" className="ew-btn ghost" onClick={() => open()}>
              Use another wallet
            </button>
          )}
        </>
      ) : (
        <>
          <div className="ew-label">Claimable now</div>
          <div className="ew-big">
            {fmtAmount(myClaimable, decimals)} <span>{symbol}</span>
          </div>
          <div className="ew-bar" aria-label={`${pct}% unlocked`}>
            <div style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <div className="ew-rows">
            <div className="ew-row">
              <span>Claimed</span>
              <b>
                {fmtAmount(myReleased, decimals)} / {fmtAmount(myTotal, decimals)}
              </b>
            </div>
            <div className="ew-row">
              <span>Next release</span>
              <b>{next ? `${fmtDate(next)} · ${countdown(next)}` : streaming ? "Every second" : "All released"}</b>
            </div>
          </div>
          <button type="button" className="ew-btn" disabled={myClaimable === 0n || state.status === "pending"} onClick={claimAll}>
            {many ? "Claim all" : "Claim"}
          </button>
          {state.message && <p className={`ew-msg ${state.status}`}>{state.message}</p>}
        </>
      )}

      <div className="ew-foot">
        <a href={`${siteUrl}/claim/${token}`} target="_blank" rel="noreferrer">
          Open on Elyport ↗
        </a>
        <a href={siteUrl} target="_blank" rel="noreferrer">
          Powered by Elyport
        </a>
      </div>
    </div>
  );
}
