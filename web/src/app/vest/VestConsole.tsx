"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { contracts, elysium, explorerTx } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { fmtAmount, fmtDate, parseRecipients, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useVestFee } from "@/lib/useToolFee";
import { DiscountHint, FeeValue } from "@/components/FeeLine";
import { SuccessMoment, useCelebratePreview, type Moment } from "@/components/SuccessMoment";
import { VestBars } from "@/components/home/Scenes";

const cid = elysium.id;
const MONTH = 30 * 86_400;

export function VestConsole() {
  const [tab, setTab] = useState<"create" | "recipient">("create");
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Vesting views" style={{ width: "fit-content", marginBottom: 24 }}>
        <button type="button" role="tab" aria-selected={tab === "create"} onClick={() => setTab("create")}>
          Create
        </button>
        <button type="button" role="tab" aria-selected={tab === "recipient"} onClick={() => setTab("recipient")}>
          I&apos;m a recipient
        </button>
      </div>
      {tab === "create" ? <CreateSchedule /> : <MySchedules />}
    </>
  );
}

function CreateSchedule() {
  const { address } = useAccount();
  const [token, setToken] = useState("");
  const [many, setMany] = useState(false);
  const [single, setSingle] = useState("");
  const [list, setList] = useState("");
  const [amount, setAmount] = useState("");
  const [start, setStart] = useState("");
  useEffect(() => setStart((v) => v || new Date().toISOString().slice(0, 10)), []);
  const [cliffM, setCliffM] = useState(3);
  const [durationM, setDurationM] = useState(12);
  const [monthly, setMonthly] = useState(true);
  const [revocable, setRevocable] = useState(false);
  const [firstId, setFirstId] = useState<bigint | undefined>();
  const [moment, setMoment] = useState<Moment | null>(null);
  useCelebratePreview(setMoment, { kind: "vest", title: "Vesting created", detail: "3 schedules are live. Tokens release on time, claim by claim." });

  const tokenAddr = isAddress(token) ? (token as Address) : undefined;
  const meta = useReadContracts({
    contracts: tokenAddr
      ? [
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
        ]
      : [],
    query: { enabled: !!tokenAddr },
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = meta.data?.[1]?.result as number | undefined;
  const fee = useVestFee();

  const recipients = useMemo(() => {
    if (!many) return isAddress(single) && amount ? [{ address: single as Address, amount }] : [];
    return parseRecipients(list).valid;
  }, [many, single, list, amount]);

  const amounts = useMemo(() => {
    if (decimals === undefined) return undefined;
    try {
      return recipients.map((r) => parseUnits(r.amount, decimals));
    } catch {
      return undefined;
    }
  }, [recipients, decimals]);
  const total = amounts?.reduce((a, b) => a + b, 0n) ?? 0n;

  const startTs = start ? Math.floor(new Date(`${start}T00:00:00Z`).getTime() / 1000) : 0;
  const cliff = cliffM * MONTH;
  const duration = durationM * MONTH;
  const period = monthly ? MONTH : 1;
  const perMonth = amounts && durationM ? total / BigInt(durationM) : undefined;

  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const ready = startTs > 0 && !!contracts.vesting && !!tokenAddr && recipients.length > 0 && !!amounts && total > 0n && cliff <= duration && fee.fee !== undefined && recipients.length <= 100;

  async function create() {
    if (!ready || !contracts.vesting || !tokenAddr || !amounts) return;
    const vesting = contracts.vesting;
    setFirstId(undefined);
    const ok = await run("Approve", () => writeContractAsync({ chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "approve", args: [vesting, total] }));
    if (!ok) return;
    const receipt = await run("Create schedule", () =>
      writeContractAsync({
        chainId: cid,
        address: vesting,
        abi: vestingAbi,
        functionName: "createSchedules",
        args: [tokenAddr, recipients.map((r) => r.address), amounts, BigInt(startTs), BigInt(cliff), BigInt(duration), BigInt(period), revocable],
        value: fee.fee,
      }),
    );
    if (!receipt) return;
    const ev = parseEventLogs({ abi: vestingAbi, logs: receipt.logs, eventName: "ScheduleCreated" });
    const first = ev[0]?.args.id;
    setFirstId(first);
    setMoment({
      kind: "vest",
      title: "Vesting created",
      detail: `${ev.length || recipients.length} ${(ev.length || recipients.length) === 1 ? "schedule is" : "schedules are"} live. Tokens release on time, claim by claim.`,
      href: tokenAddr ? `/claim/${tokenAddr}` : first !== undefined ? `/vest/${first}` : undefined,
      hrefLabel: tokenAddr ? "Open claim page to share" : "Open schedule",
      externalHref: explorerTx(receipt.transactionHash),
    });
  }

  return (
    <div className="app-grid">
      <SuccessMoment moment={moment} onClose={() => setMoment(null)} />
      <div className="console">
        <label className="field">
          Token address
          <input className="input" placeholder="0x…" value={token} onChange={(e) => setToken(e.target.value.trim())} />
          {tokenAddr && <span>{symbol ?? "Reading token…"}</span>}
        </label>

        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 10 }}>
            Recipients
          </legend>
          <div className="segmented" role="group" aria-label="Recipients" style={{ marginBottom: 10 }}>
            <button type="button" aria-pressed={!many} onClick={() => setMany(false)}>
              One wallet
            </button>
            <button type="button" aria-pressed={many} onClick={() => setMany(true)}>
              Many (CSV)
            </button>
          </div>
          {many ? (
            <textarea className="textarea" rows={6} aria-label="Recipients list" placeholder={"0x…,1000\n0x…,2500"} value={list} onChange={(e) => setList(e.target.value)} />
          ) : (
            <input className="input" aria-label="Recipient address" placeholder="0x…" value={single} onChange={(e) => setSingle(e.target.value.trim())} />
          )}
        </fieldset>

        {!many && (
          <label className="field">
            Total amount
            <input className="input input-big" inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          <label className="field">
            Start
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            Cliff
            <select className="select" value={cliffM} onChange={(e) => setCliffM(Number(e.target.value))}>
              {[0, 1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "None" : `${m} month${m > 1 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Duration
            <select className="select" value={durationM} onChange={(e) => setDurationM(Number(e.target.value))}>
              {[3, 6, 12, 18, 24, 36].map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="segmented" role="group" aria-label="Release">
          <button type="button" aria-pressed={!monthly} onClick={() => setMonthly(false)}>
            Linear
          </button>
          <button type="button" aria-pressed={monthly} onClick={() => setMonthly(true)}>
            Monthly
          </button>
        </div>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 52, padding: "0 16px", borderRadius: 14, background: "#F5F6F8", fontSize: 16 }}>
          Creator can cancel
          <input type="checkbox" role="switch" checked={revocable} onChange={(e) => setRevocable(e.target.checked)} style={{ width: 22, height: 22, accentColor: "#14171C" }} />
        </label>

        <dl className="summary">
          <dt>Recipients</dt>
          <dd style={recipients.length > 100 ? { color: "#B4233C" } : undefined}>
            {recipients.length}
            {recipients.length > 100 ? " · max 100 per batch" : ""}
          </dd>
          <dt>Total</dt>
          <dd>
            {decimals !== undefined ? fmtAmount(total, decimals) : "—"} {symbol ?? ""}
          </dd>
          <dt>First release</dt>
          <dd>{startTs ? fmtDate(startTs + (cliff || period)) : "—"}</dd>
          <dt>Per month</dt>
          <dd>{perMonth !== undefined && decimals !== undefined ? fmtAmount(perMonth, decimals) : "—"}</dd>
          <dt>Fee</dt>
          <dd>
            <FeeValue f={fee} />
          </dd>
        </dl>
        <DiscountHint f={fee} />
        {cliff > duration && <p className="error">The cliff cannot be longer than the duration.</p>}
        {!contracts.vesting && <p className="warn">Vesting is not deployed on this network yet.</p>}

        <button type="button" className="btn btn-dark btn-lg btn-block" disabled={!ready || state.status === "pending"} onClick={create}>
          {address ? "Create schedule" : "Connect wallet"}
        </button>
        {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
        {firstId !== undefined && (
          <p className="ok">
            Schedule #{firstId.toString()} created. <Link href={`/vest/${firstId}`}>Open its public page →</Link>
          </p>
        )}
      </div>

      <div className="stack">
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <span className="eyebrow">Schedule preview</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--indigo-ink)" }}>
              {cliffM ? `${cliffM} mo cliff · ` : ""}
              {durationM} mo
            </span>
          </div>
          <VestBars />
        </section>
        <section className="panel-holo">
          <div className="eyebrow" style={{ color: "#3E4552", marginBottom: 8 }}>
            What your recipient sees
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#3E4552" }}>
            A public page with the amount vested so far, the next release date and a Claim button. Anyone can trigger a claim;
            tokens always go to the recipient.
          </p>
        </section>
      </div>
    </div>
  );
}

function MySchedules() {
  const { address } = useAccount();
  const ids = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByBeneficiary", args: address ? [address] : undefined, query: { enabled: !!address && !!contracts.vesting } });
  const list = (ids.data ?? []).slice().reverse();
  const claimables = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claimable" as const, args: [id] as const })),
    query: { enabled: list.length > 0 },
  });
  if (!address) return <p className="note">Connect your wallet to see schedules paying you.</p>;
  if (list.length === 0) return <p className="note">No vesting schedules pay this wallet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Schedule</th>
            <th>Claimable now</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((id, i) => (
            <tr key={id.toString()}>
              <td>#{id.toString()}</td>
              <td className="mono">{fmtAmount(claimables.data?.[i]?.result as bigint | undefined)}</td>
              <td>
                <Link className="btn btn-ghost" href={`/vest/${id}`}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="eyebrow" style={{ padding: "12px 20px", margin: 0 }}>
        Wallet {short(address)}
      </p>
    </div>
  );
}
