"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { contracts, elysium, explorerTx } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useLockFee } from "@/lib/useToolFee";
import { DiscountHint, FeeValue } from "@/components/FeeLine";
import { SuccessMoment, useCelebratePreview, type Moment } from "@/components/SuccessMoment";
import { useMounted } from "@/lib/useMounted";
import { LockRing } from "@/components/home/Scenes";

const cid = elysium.id;
const DAY = 86_400;
const MONTH = 30 * DAY;
type Tranche = { pct: string; date: string };
const isoDay = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);
/** n equal tranches, the first one `every` seconds from now. */
function evenTranches(n: number, every: number): Tranche[] {
  const now = Math.floor(Date.now() / 1000);
  const base = Math.floor(10_000 / n);
  return Array.from({ length: n }, (_, i) => ({
    pct: ((i === n - 1 ? 10_000 - base * (n - 1) : base) / 100).toString(),
    date: isoDay(now + (i + 1) * every),
  }));
}
const presets = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
];

export function LockConsole({ initialToken, initialType }: { initialToken?: string; initialType?: "token" | "lp" } = {}) {
  const [tab, setTab] = useState<"create" | "mine">("create");
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Locker views" style={{ width: "fit-content", marginBottom: 24 }}>
        <button type="button" role="tab" aria-selected={tab === "create"} onClick={() => setTab("create")}>
          Create lock
        </button>
        <button type="button" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          My locks
        </button>
      </div>
      {tab === "create" ? <CreateLock initialToken={initialToken} initialType={initialType} /> : <MyLocks />}
    </>
  );
}

function CreateLock({ initialToken, initialType }: { initialToken?: string; initialType?: "token" | "lp" }) {
  const mounted = useMounted();
  const { address } = useAccount();
  const [isLP, setIsLP] = useState(initialType ? initialType === "lp" : true);
  const [token, setToken] = useState(initialToken ?? "");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(180);
  const [date, setDate] = useState("");
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
  const [split, setSplit] = useState(false);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [createdId, setCreatedId] = useState<bigint | undefined>();
  const [moment, setMoment] = useState<Moment | null>(null);
  useCelebratePreview(setMoment, { kind: "lock", title: "Locked", detail: "Lock #12 is live. Anyone can verify it on its public page.", href: "/locks", hrefLabel: "Explore locks" });

  useEffect(() => {
    if (address && !owner) setOwner(address);
  }, [address, owner]);

  const tokenAddr = isAddress(token) ? (token as Address) : undefined;
  const meta = useReadContracts({
    contracts: tokenAddr
      ? [
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "totalSupply" },
        ]
      : [],
    query: { enabled: !!tokenAddr },
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = meta.data?.[1]?.result as number | undefined;
  const balance = meta.data?.[2]?.result as bigint | undefined;
  const supply = meta.data?.[3]?.result as bigint | undefined;

  const fee = useLockFee();
  // Tranches need Locker v2 (createLocks); hide the option until the deployed Locker supports it.
  const v2 = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "discountBps", query: { enabled: !!contracts.locker, retry: false } });
  const canSplit = v2.isSuccess;
  useEffect(() => {
    if (split && tranches.length === 0) setTranches(evenTranches(4, 3 * MONTH));
  }, [split, tranches.length]);

  const unlockAt = useMemo(() => {
    if (date) return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
    return Math.floor(Date.now() / 1000) + days * DAY;
  }, [date, days]);

  const amountWei = useMemo(() => {
    if (decimals === undefined || !amount) return undefined;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);

  // Tranches: percentages in basis points, dates as unix seconds, amounts split exactly.
  const plan = useMemo(() => {
    if (!split || !canSplit) return undefined;
    const bps = tranches.map((t) => Math.round(Number(t.pct || "0") * 100));
    const dates = tranches.map((t) => (t.date ? Math.floor(new Date(`${t.date}T00:00:00Z`).getTime() / 1000) : 0));
    const sumBps = bps.reduce((a, b) => a + b, 0);
    let amounts: bigint[] | undefined;
    if (amountWei && sumBps === 10_000) {
      let used = 0n;
      amounts = bps.map((b, i) => {
        const v = i === bps.length - 1 ? amountWei - used : (amountWei * BigInt(b)) / 10_000n;
        used += v;
        return v;
      });
    }
    const now = Date.now() / 1000;
    const datesOk = dates.every((d) => d > now);
    const ok = tranches.length > 0 && tranches.length <= 20 && sumBps === 10_000 && bps.every((b) => b > 0) && datesOk && !!amounts && amounts.every((a) => a > 0n);
    return { bps, dates, sumBps, amounts, ok, datesOk };
  }, [split, canSplit, tranches, amountWei]);
  const count = plan ? Math.max(tranches.length, 1) : 1;

  const ready =
    !!contracts.locker &&
    !!tokenAddr &&
    !!amountWei &&
    amountWei > 0n &&
    (balance === undefined || amountWei <= balance) &&
    isAddress(owner) &&
    (plan ? plan.ok : unlockAt > Date.now() / 1000) &&
    fee.fee !== undefined;

  async function lock() {
    if (!ready || !contracts.locker || !tokenAddr || !amountWei) return;
    const locker = contracts.locker;
    setCreatedId(undefined);
    const ok = await run("Approve", () => writeContractAsync({ chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "approve", args: [locker, amountWei] }));
    if (!ok) return;
    if (split && plan?.amounts) {
      const amounts = plan.amounts;
      const receipt = await run("Lock", () =>
        writeContractAsync({
          chainId: cid,
          address: locker,
          abi: lockerAbi,
          functionName: "createLocks",
          args: [tokenAddr, amounts, plan.dates.map((d) => BigInt(d)), owner as Address, isLP, note],
          value: (fee.fee ?? 0n) * BigInt(amounts.length),
        }),
      );
      if (!receipt) return;
      const ids = parseEventLogs({ abi: lockerAbi, logs: receipt.logs, eventName: "LockCreated" }).map((l) => l.args.id);
      setCreatedId(ids[0]);
      setMoment({
        kind: "lock",
        title: "Locked in tranches",
        detail: `${amounts.length} locks unlock from ${fmtDate(Math.min(...plan.dates))} to ${fmtDate(Math.max(...plan.dates))}. Anyone can verify them.`,
        href: `/token/${tokenAddr}`,
        hrefLabel: "Open token page",
        externalHref: explorerTx(receipt.transactionHash),
      });
      return;
    }
    const receipt = await run("Lock", () =>
      writeContractAsync({
        chainId: cid,
        address: locker,
        abi: lockerAbi,
        functionName: "createLock",
        args: [tokenAddr, amountWei, BigInt(unlockAt), owner as Address, isLP, note],
        value: fee.fee,
      }),
    );
    if (!receipt) return;
    const id = parseEventLogs({ abi: lockerAbi, logs: receipt.logs, eventName: "LockCreated" })[0]?.args.id;
    setCreatedId(id);
    setMoment({
      kind: "lock",
      title: "Locked",
      detail: id !== undefined ? `Lock #${id} is live until ${fmtDate(unlockAt)}. Anyone can verify it.` : "Your lock is live. Anyone can verify it.",
      href: id !== undefined ? `/lock/${id}` : "/locks",
      hrefLabel: id !== undefined ? "Open lock page" : "Explore locks",
      externalHref: explorerTx(receipt.transactionHash),
    });
  }

  const pct = amountWei && supply ? Number((amountWei * 10_000n) / supply) / 100 : undefined;

  return (
    <div className="app-grid">
      <SuccessMoment moment={moment} onClose={() => setMoment(null)} />
      <div className="console">
        <div className="segmented" role="group" aria-label="Lock type">
          <button type="button" aria-pressed={isLP} onClick={() => setIsLP(true)}>
            LP token
          </button>
          <button type="button" aria-pressed={!isLP} onClick={() => setIsLP(false)}>
            Token
          </button>
        </div>
        <label className="field">
          Contract address
          <input className="input" placeholder="0x…" value={token} onChange={(e) => setToken(e.target.value.trim())} />
        </label>
        {tokenAddr && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, background: "#F5F6F8", marginTop: -8 }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--holo)", flex: "none" }} />
            <div>
              <div style={{ fontSize: 16 }}>{symbol ?? "Reading token…"}</div>
              <div className="eyebrow" style={{ fontSize: 12 }}>
                Balance {decimals !== undefined ? fmtAmount(balance, decimals) : "—"}
              </div>
            </div>
          </div>
        )}

        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 10 }}>
            Amount
          </legend>
          <input className="input input-big" aria-label="Amount to lock" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.0" />
          <div className="preset-grid" style={{ marginTop: 8 }}>
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                className="preset small"
                disabled={balance === undefined || decimals === undefined}
                onClick={() => {
                  if (balance === undefined || decimals === undefined) return;
                  const v = (balance * BigInt(p)) / 100n;
                  setAmount(formatUnits(v, decimals));
                }}
              >
                {p === 100 ? "Max" : `${p}%`}
              </button>
            ))}
          </div>
        </fieldset>

        {canSplit && (
        <div className="segmented" role="group" aria-label="Unlock plan">
          <button type="button" aria-pressed={!split} onClick={() => setSplit(false)}>
            One date
          </button>
          <button type="button" aria-pressed={split} onClick={() => setSplit(true)}>
            Tranches
          </button>
        </div>
        )}
        {!split || !canSplit ? (
        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 10 }}>
            Unlock date
          </legend>
          <div className="preset-grid" style={{ marginBottom: 8 }}>
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset small"
                aria-pressed={!date && days === p.days}
                onClick={() => {
                  setDays(p.days);
                  setDate("");
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input className="input" type="date" aria-label="Custom unlock date" value={date} onChange={(e) => setDate(e.target.value)} />
        </fieldset>
        ) : (
          <TrancheEditor tranches={tranches} setTranches={setTranches} plan={plan} amounts={plan?.amounts} decimals={decimals} symbol={symbol} />
        )}

        <label className="field">
          Withdraws to
          <input className="input" value={owner} onChange={(e) => setOwner(e.target.value.trim())} />
        </label>
        <label className="field">
          Note (optional, public)
          <input className="input" maxLength={120} value={note} placeholder="e.g. Liquidity for launch" onChange={(e) => setNote(e.target.value)} />
        </label>

        <p className="note">Extend, top up or transfer anytime from the lock&apos;s page. A lock can never be shortened.</p>

        <dl className="summary">
          <dt>Locking</dt>
          <dd>
            {amount || "0"} {symbol ?? ""}
            {isLP ? " LP" : ""}
          </dd>
          <dt>Of supply</dt>
          <dd>{pct !== undefined ? `${pct}%` : "—"}</dd>
          <dt>Unlocks</dt>
          <dd>
            {!mounted
              ? "—"
              : plan
                ? plan.dates.length && plan.datesOk
                  ? `${tranches.length} dates · ${fmtDate(Math.min(...plan.dates))} → ${fmtDate(Math.max(...plan.dates))}`
                  : "—"
                : fmtDate(unlockAt)}
          </dd>
          <dt>{plan ? `Fee · ${count} locks` : "Fee"}</dt>
          <dd>
            <FeeValue f={fee} times={count} />
          </dd>
        </dl>
        <DiscountHint f={fee} />
        {!contracts.locker && <p className="warn">Locker is not deployed on this network yet.</p>}

        <button type="button" className="btn btn-dark btn-lg btn-block" disabled={!ready || state.status === "pending"} onClick={lock}>
          {address ? `Lock ${isLP ? "LP" : "tokens"}` : "Connect wallet"}
        </button>
        {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
        {createdId !== undefined && (
          <p className="ok">
            Lock #{createdId.toString()} created. <Link href={`/lock/${createdId}`}>Open its public page →</Link>
          </p>
        )}
      </div>

      <div className="stack">
        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
            <span className="eyebrow">Public lock page</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--indigo-ink)" }}>
              elyport/lock/[id]
            </span>
          </div>
          <LockRing label={mounted ? `Unlocks in ${countdown(unlockAt)}` : " "} />
        </section>
        <RecentLocks />
      </div>
    </div>
  );
}

function RecentLocks() {
  const mounted = useMounted();
  const recent = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "getLocks", args: [0n, 5n, true], query: { enabled: !!contracts.locker } });
  const page = recent.data?.[0] ?? [];
  const ids = recent.data?.[1] ?? [];
  const syms = useReadContracts({
    contracts: page.map((l) => ({ chainId: cid, address: l.token, abi: erc20Abi, functionName: "symbol" as const })),
    query: { enabled: page.length > 0 },
  });
  return (
    <section className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="eyebrow">Recent on Elysium</span>
        <Link href="/locks" className="link-accent" style={{ fontSize: 14 }}>
          All locks ↗
        </Link>
      </div>
      {page.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No locks yet.
        </p>
      ) : (
        <ul className="list-rows">
          {page.map((l, i) => (
            <li key={ids[i].toString()}>
              <Link href={`/lock/${ids[i]}`}>
                {(syms.data?.[i]?.result as string | undefined)?.slice(0, 16) ?? short(l.token)}
                {l.isLP ? " LP" : ""} <span className="muted">#{ids[i].toString()}</span>
              </Link>
              <span className="mono" style={{ fontSize: 13, color: "#444B57" }}>
                {mounted ? countdown(l.unlockAt) : "…"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MyLocks() {
  const { address } = useAccount();
  const ids = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByOwner", args: address ? [address] : undefined, query: { enabled: !!address && !!contracts.locker } });
  const list = (ids.data ?? []).slice().reverse();
  const locks = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    query: { enabled: list.length > 0 },
  });
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);

  if (!address) return <p className="note">Connect your wallet to see your locks.</p>;
  if (list.length === 0) return <p className="note">You have no active locks.</p>;

  return (
    <div className="stack">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Lock</th>
              <th>Token</th>
              <th>Amount</th>
              <th>Unlocks</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((id, i) => {
              const l = locks.data?.[i]?.result as
                | { token: Address; amount: bigint; unlockAt: bigint; isLP: boolean; withdrawn: boolean }
                | undefined;
              const unlocked = l ? Number(l.unlockAt) <= Date.now() / 1000 : false;
              return (
                <tr key={id.toString()}>
                  <td>
                    <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                  </td>
                  <td className="mono">{l ? `${short(l.token)}${l.isLP ? " LP" : ""}` : "…"}</td>
                  <td className="mono">{l ? fmtAmount(l.amount) : "…"}</td>
                  <td className="mono">{l ? countdown(l.unlockAt) : "…"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={!l || !unlocked || l.withdrawn || state.status === "pending"}
                      onClick={() => run("Withdraw", () => writeContractAsync({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "withdraw", args: [id] }))}
                    >
                      Withdraw
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </div>
  );
}

function TrancheEditor({
  tranches,
  setTranches,
  plan,
  amounts,
  decimals,
  symbol,
}: {
  tranches: Tranche[];
  setTranches: (t: Tranche[]) => void;
  plan?: { sumBps: number; datesOk: boolean };
  amounts?: bigint[];
  decimals?: number;
  symbol?: string;
}) {
  const set = (i: number, k: keyof Tranche, v: string) => setTranches(tranches.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const sum = (plan?.sumBps ?? 0) / 100;
  return (
    <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
      <legend className="eyebrow" style={{ marginBottom: 10 }}>
        Unlock in tranches · up to 20
      </legend>
      <div className="chips" style={{ marginBottom: 10 }}>
        <button type="button" className="chip" onClick={() => setTranches(evenTranches(4, 3 * MONTH))}>
          Quarterly × 4
        </button>
        <button type="button" className="chip" onClick={() => setTranches(evenTranches(12, MONTH))}>
          Monthly × 12
        </button>
        <button type="button" className="chip" onClick={() => setTranches(evenTranches(2, 6 * MONTH))}>
          Every 6 months × 2
        </button>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {tranches.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "78px minmax(0, 1fr) 44px", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input className="input" aria-label={`Tranche ${i + 1} percent`} inputMode="decimal" value={t.pct} onChange={(e) => set(i, "pct", e.target.value.replace(/[^\d.]/g, ""))} style={{ paddingRight: 26 }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#5D6573" }}>%</span>
            </div>
            <input className="input" type="date" style={{ minWidth: 0 }} aria-label={`Tranche ${i + 1} date`} value={t.date} onChange={(e) => set(i, "date", e.target.value)} />
            <button type="button" className="btn btn-ghost" style={{ width: 44, minWidth: 44, padding: 0 }} aria-label={`Remove tranche ${i + 1}`} disabled={tranches.length <= 1} onClick={() => setTranches(tranches.filter((_, j) => j !== i))}>
              ✕
            </button>
            {amounts?.[i] !== undefined && decimals !== undefined && (
              <div className="eyebrow" style={{ gridColumn: "1 / -1", marginTop: -2 }}>
                {fmtAmount(amounts[i], decimals)} {symbol ?? ""}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={tranches.length >= 20}
          onClick={() => {
            const last = tranches[tranches.length - 1];
            const lastTs = last?.date ? Math.floor(new Date(`${last.date}T00:00:00Z`).getTime() / 1000) : Math.floor(Date.now() / 1000);
            setTranches([...tranches, { pct: "0", date: isoDay(lastTs + MONTH) }]);
          }}
        >
          + Add tranche
        </button>
        <span className={sum === 100 ? "ok" : "error"} style={{ margin: 0, fontSize: 14 }}>
          Total {sum}%{sum !== 100 ? " · must be 100%" : ""}
        </span>
      </div>
      {plan && !plan.datesOk && <p className="error">Every date must be in the future.</p>}
    </fieldset>
  );
}
