"use client";

import { useState } from "react";
import { erc20Abi, formatUnits, isAddress, parseUnits, type Address } from "viem";
import { useReadContracts, useWriteContract } from "wagmi";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { fmtAmount, fmtDate } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";

const cid = elysium.id;
const DAY = 86_400;
type Lock = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; withdrawn: boolean };
type Tab = "extend" | "topup" | "transfer";

const toDateInput = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);
const fromDateInput = (d: string) => (d ? Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 1000) : 0);

/** Owner-only actions for a lock: extend, top up, transfer and withdraw. */
export function LockManage({ id, lock, symbol, decimals, onDone }: { id: bigint; lock: Lock; symbol?: string; decimals: number; onDone: () => void }) {
  const [tab, setTab] = useState<Tab>("extend");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const [sure, setSure] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const locker = contracts.locker!;
  const now = Math.floor(Date.now() / 1000);
  const unlockAt = Number(lock.unlockAt);
  const unlocked = unlockAt <= now;
  const busy = state.status === "pending";

  const reads = useReadContracts({
    contracts: [
      { chainId: cid, address: lock.token, abi: erc20Abi, functionName: "balanceOf", args: [lock.owner] },
      { chainId: cid, address: lock.token, abi: erc20Abi, functionName: "allowance", args: [lock.owner, locker] },
    ],
    query: { enabled: tab === "topup" },
  });
  const balance = reads.data?.[0]?.result as bigint | undefined;
  const allowance = (reads.data?.[1]?.result as bigint | undefined) ?? 0n;

  let amountWei: bigint | undefined;
  try {
    amountWei = amount ? parseUnits(amount, decimals) : undefined;
  } catch {
    amountWei = undefined;
  }

  const base = Math.max(unlockAt, now);
  const presets = [
    ["+30 days", 30],
    ["+90 days", 90],
    ["+6 months", 182],
    ["+1 year", 365],
  ] as const;
  const newTs = fromDateInput(date);
  const extendOk = newTs > unlockAt && newTs > now;
  const topUpOk = !!amountWei && amountWei > 0n && (balance === undefined || amountWei <= balance);
  const toOk = isAddress(to) && to.toLowerCase() !== lock.owner.toLowerCase() && sure;

  const done = (r: unknown) => {
    if (r) {
      onDone();
      setAmount("");
      setTo("");
      setSure(false);
      reads.refetch();
    }
  };

  const extend = async () =>
    done(await run("Extend", () => writeContractAsync({ chainId: cid, address: locker, abi: lockerAbi, functionName: "extendLock", args: [id, BigInt(newTs)] })));

  const topUp = async () => {
    if (!amountWei) return;
    if (allowance < amountWei) {
      const ok = await run("Approve", () => writeContractAsync({ chainId: cid, address: lock.token, abi: erc20Abi, functionName: "approve", args: [locker, amountWei!] }));
      if (!ok) return;
    }
    done(await run("Top up", () => writeContractAsync({ chainId: cid, address: locker, abi: lockerAbi, functionName: "topUp", args: [id, amountWei!] })));
  };

  const transfer = async () =>
    done(await run("Transfer", () => writeContractAsync({ chainId: cid, address: locker, abi: lockerAbi, functionName: "transferLockOwnership", args: [id, to as Address] })));

  const withdraw = async () =>
    done(await run("Withdraw", () => writeContractAsync({ chainId: cid, address: locker, abi: lockerAbi, functionName: "withdraw", args: [id] })));

  return (
    <section className="console" aria-label="Manage this lock">
      <div>
        <div className="console-title">Manage your lock</div>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 15 }}>Only you see this, because your wallet owns the lock.</p>
      </div>

      {unlocked && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="ok">Unlocked since {fmtDate(lock.unlockAt)}. You can withdraw everything now.</p>
          <button type="button" className="btn btn-dark btn-lg btn-block" disabled={busy} onClick={withdraw}>
            Withdraw {fmtAmount(lock.amount, decimals)} {symbol}
          </button>
        </div>
      )}

      <div className="segmented" role="tablist" aria-label="Lock actions" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {(
          [
            ["extend", "Extend"],
            ["topup", "Top up"],
            ["transfer", "Transfer"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "extend" && (
        <div className="stack">
          <div className="field">
            New unlock date
            <div className="chips">
              {presets.map(([label, days]) => {
                const v = toDateInput(base + days * DAY);
                return (
                  <button key={label} type="button" className="chip" aria-pressed={date === v} onClick={() => setDate(v)}>
                    {label}
                  </button>
                );
              })}
            </div>
            <input className="input" type="date" aria-label="New unlock date" min={toDateInput(base + DAY)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <dl className="summary">
            <dt>Unlocks now</dt>
            <dd>{fmtDate(lock.unlockAt)}</dd>
            <dt>Unlocks after</dt>
            <dd>{extendOk ? fmtDate(BigInt(newTs)) : "—"}</dd>
          </dl>
          {date && !extendOk && <p className="error">Pick a date later than the current unlock date.</p>}
          <button type="button" className="btn btn-dark btn-block" disabled={!extendOk || busy} onClick={extend}>
            Extend lock
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>A lock can only move later. This cannot be undone.</p>
        </div>
      )}

      {tab === "topup" && (
        <div className="stack">
          <label className="field">
            Amount to add
            <input className="input input-big" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }} className="eyebrow">
            <span>
              Balance: {fmtAmount(balance, decimals)} {symbol}
            </span>
            {balance !== undefined && balance > 0n && (
              <button type="button" className="text-link" style={{ background: "none", border: 0, padding: 0 }} onClick={() => setAmount(formatUnits(balance, decimals))}>
                Max
              </button>
            )}
          </div>
          <dl className="summary">
            <dt>Locked now</dt>
            <dd>{fmtAmount(lock.amount, decimals)}</dd>
            <dt>After top up</dt>
            <dd>{amountWei ? fmtAmount(lock.amount + amountWei, decimals) : "—"}</dd>
          </dl>
          {amountWei && balance !== undefined && amountWei > balance && <p className="error">That is more than your balance.</p>}
          <button type="button" className="btn btn-dark btn-block" disabled={!topUpOk || busy} onClick={topUp}>
            {amountWei && allowance < amountWei ? "Approve and top up" : "Top up"}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Added tokens follow the same unlock date. No fee.</p>
        </div>
      )}

      {tab === "transfer" && (
        <div className="stack">
          <label className="field">
            New owner
            <input className="input" placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
          </label>
          {to && !isAddress(to) && <p className="error">That is not a valid address.</p>}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#F5F6F8", fontSize: 15, lineHeight: 1.45 }}>
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: "#14171C", flex: "none" }} />
            The new owner alone can extend, top up and withdraw this lock. I can&apos;t take it back.
          </label>
          <button type="button" className="btn btn-dark btn-block" disabled={!toOk || busy} onClick={transfer}>
            Transfer lock
          </button>
        </div>
      )}

      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </section>
  );
}
