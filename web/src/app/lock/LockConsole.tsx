"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, isAddress, parseEventLogs, parseUnits, type Address } from "viem";
import { contracts, elysium, explorerTx } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { SuccessMoment, useCelebratePreview, type Moment } from "@/components/SuccessMoment";
import { useMounted } from "@/lib/useMounted";
import { LockRing } from "@/components/home/Scenes";

const cid = elysium.id;
const DAY = 86_400;
const presets = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
];

export function LockConsole() {
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
      {tab === "create" ? <CreateLock /> : <MyLocks />}
    </>
  );
}

function CreateLock() {
  const mounted = useMounted();
  const { address } = useAccount();
  const [isLP, setIsLP] = useState(true);
  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState(180);
  const [date, setDate] = useState("");
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
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

  const fee = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockFee", query: { enabled: !!contracts.locker } });

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

  const ready =
    !!contracts.locker && !!tokenAddr && !!amountWei && amountWei > 0n && (balance === undefined || amountWei <= balance) && isAddress(owner) && unlockAt > Date.now() / 1000 && fee.data !== undefined;

  async function lock() {
    if (!ready || !contracts.locker || !tokenAddr || !amountWei) return;
    const locker = contracts.locker;
    setCreatedId(undefined);
    const ok = await run("Approve", () => writeContractAsync({ chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "approve", args: [locker, amountWei] }));
    if (!ok) return;
    const receipt = await run("Lock", () =>
      writeContractAsync({
        chainId: cid,
        address: locker,
        abi: lockerAbi,
        functionName: "createLock",
        args: [tokenAddr, amountWei, BigInt(unlockAt), owner as Address, isLP, note],
        value: fee.data,
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

        <label className="field">
          Withdraws to
          <input className="input" value={owner} onChange={(e) => setOwner(e.target.value.trim())} />
        </label>
        <label className="field">
          Note (optional, public)
          <input className="input" maxLength={120} value={note} placeholder="e.g. Liquidity for launch" onChange={(e) => setNote(e.target.value)} />
        </label>

        <p className="note">Extend or top up anytime. A lock can never be shortened.</p>

        <dl className="summary">
          <dt>Locking</dt>
          <dd>
            {amount || "0"} {symbol ?? ""}
            {isLP ? " LP" : ""}
          </dd>
          <dt>Of supply</dt>
          <dd>{pct !== undefined ? `${pct}%` : "—"}</dd>
          <dt>Unlocks</dt>
          <dd>{mounted ? fmtDate(unlockAt) : "—"}</dd>
          <dt>Fee</dt>
          <dd>{fee.data !== undefined ? `${fmtAmount(fee.data, 18, 4)} HYPE` : "—"}</dd>
        </dl>
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
                {short(l.token)}
                {l.isLP ? " LP" : ""}
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
