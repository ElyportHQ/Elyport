"use client";

import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { contracts, elysium } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { fmtAmount } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";

const cid = elysium.id;
type Sched = { creator: Address; beneficiary: Address; total: bigint; released: bigint; revocable: boolean; revoked: boolean };

const confirmBox = { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#F5F6F8", fontSize: 15, lineHeight: 1.45 } as const;
const checkStyle = { width: 20, height: 20, marginTop: 1, accentColor: "#14171C", flex: "none" } as const;

/** Creator can cancel a cancellable schedule; the recipient can move it to a new wallet. */
export function VestManage({ id, s, symbol, decimals, onDone }: { id: bigint; s: Sched; symbol?: string; decimals: number; onDone: () => void }) {
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const isCreator = me === s.creator.toLowerCase();
  const isRecipient = me === s.beneficiary.toLowerCase();
  const canCancel = isCreator && s.revocable && !s.revoked;

  const [to, setTo] = useState("");
  const [sureMove, setSureMove] = useState(false);
  const [sureCancel, setSureCancel] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const busy = state.status === "pending";
  const [ts] = useState(() => BigInt(Math.floor(Date.now() / 1000)));

  const vested = useReadContract({
    chainId: cid,
    address: contracts.vesting,
    abi: vestingAbi,
    functionName: "vestedAmount",
    args: [id, ts],
    query: { enabled: canCancel },
  });

  if (!canCancel && !isRecipient) return null;

  const vestedNow = vested.data as bigint | undefined;
  const refund = vestedNow !== undefined ? s.total - vestedNow : undefined;
  const toOk = isAddress(to) && to.toLowerCase() !== s.beneficiary.toLowerCase() && sureMove;

  const cancel = async () => {
    const r = await run("Cancel", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "revoke", args: [id] }));
    if (r) {
      setSureCancel(false);
      onDone();
    }
  };
  const move = async () => {
    const r = await run("Move", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "transferBeneficiary", args: [id, to as Address] }));
    if (r) {
      setTo("");
      setSureMove(false);
      onDone();
    }
  };

  return (
    <section className="console" aria-label="Manage this schedule">
      <div>
        <div className="console-title">Manage this schedule</div>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>
          {canCancel && isRecipient ? "You created this schedule and you receive it." : canCancel ? "You created this schedule." : "You are the recipient of this schedule."}
        </p>
      </div>

      {isRecipient && (
        <div className="stack">
          <div style={{ fontWeight: 500 }}>Move to another wallet</div>
          <label className="field">
            New recipient wallet
            <input className="input" placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
          </label>
          {to && !isAddress(to) && <p className="error">That is not a valid address.</p>}
          <label style={confirmBox}>
            <input type="checkbox" checked={sureMove} onChange={(e) => setSureMove(e.target.checked)} style={checkStyle} />
            I control this new wallet. Future claims go there, and only it can move the schedule again.
          </label>
          <button type="button" className="btn btn-dark btn-block" disabled={!toOk || busy} onClick={move}>
            Move schedule
          </button>
        </div>
      )}

      {canCancel && (
        <div className="stack">
          <div style={{ fontWeight: 500 }}>Cancel schedule</div>
          <dl className="summary">
            <dt>Stays with the recipient</dt>
            <dd>
              {fmtAmount(vestedNow, decimals)} {symbol}
            </dd>
            <dt>Returns to you</dt>
            <dd>
              {fmtAmount(refund, decimals)} {symbol}
            </dd>
          </dl>
          <label style={confirmBox}>
            <input type="checkbox" checked={sureCancel} onChange={(e) => setSureCancel(e.target.checked)} style={checkStyle} />
            Stop this schedule for good. What has vested stays claimable by the recipient.
          </label>
          <button type="button" className="btn btn-ghost btn-block" style={{ color: "#8c2a4f", borderColor: "#efc6d4" }} disabled={!sureCancel || busy || vestedNow === undefined} onClick={cancel}>
            Cancel schedule
          </button>
        </div>
      )}

      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </section>
  );
}
