"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { erc20Abi, type Address, type Hash } from "viem";
import { contracts, deployBlock, elysium, explorerTx } from "@/lib/config";
import { dropAbi, lockerAbi, vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useMounted } from "@/lib/useMounted";
import { nextRelease, type Sched } from "@/lib/vesting";

const cid = elysium.id;
type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };
type SchedT = Sched & { token: Address; creator: Address; beneficiary: Address; revocable: boolean };

/** Symbols and decimals for a set of tokens, keyed by lowercase address. */
function useTokenMeta(tokens: Address[]) {
  const uniq = Array.from(new Set(tokens.map((t) => t.toLowerCase()))) as Address[];
  const r = useReadContracts({
    contracts: uniq.flatMap((t) => [
      { chainId: cid, address: t, abi: erc20Abi, functionName: "symbol" as const },
      { chainId: cid, address: t, abi: erc20Abi, functionName: "decimals" as const },
    ]),
    query: { enabled: uniq.length > 0 },
  });
  const map: Record<string, { symbol?: string; decimals: number }> = {};
  uniq.forEach((t, i) => {
    map[t] = { symbol: r.data?.[i * 2]?.result as string | undefined, decimals: (r.data?.[i * 2 + 1]?.result as number | undefined) ?? 18 };
  });
  return (t: Address) => map[t.toLowerCase()] ?? { decimals: 18 };
}

export function MeView() {
  const mounted = useMounted();
  const { address } = useAccount();
  const { open } = useAppKit();
  if (!mounted) return null;
  if (!address)
    return (
      <div className="panel" style={{ textAlign: "center", padding: 40 }}>
        <p className="lead" style={{ marginTop: 0 }}>Connect a wallet to see your locks, vesting and drops.</p>
        <button type="button" className="btn btn-dark btn-lg" onClick={() => open()}>
          Connect wallet
        </button>
      </div>
    );
  return (
    <div className="stack" style={{ gap: 40 }}>
      <Vesting me={address} />
      <Locks me={address} />
      <Created me={address} />
      <Drops me={address} />
      <p className="eyebrow">Wallet {short(address)}</p>
    </div>
  );
}

function Section({ title, sub, children, action }: { title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontWeight: 500, fontSize: 26, margin: 0 }}>{title}</h2>
          {sub && <p className="note" style={{ margin: "4px 0 0" }}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Vesting({ me }: { me: Address }) {
  const ids = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByBeneficiary", args: [me], query: { enabled: !!contracts.vesting } });
  const list = (ids.data ?? []).slice().reverse();
  const scheds = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
    query: { enabled: list.length > 0 },
  });
  const claimables = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claimable" as const, args: [id] as const })),
    query: { enabled: list.length > 0, refetchInterval: 20_000 },
  });
  const rows = list.map((id, i) => ({ id, s: scheds.data?.[i]?.result as SchedT | undefined, c: (claimables.data?.[i]?.result as bigint | undefined) ?? 0n }));
  const meta = useTokenMeta(rows.flatMap((r) => (r.s ? [r.s.token] : [])));
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const ready = rows.filter((r) => r.c > 0n);

  const claim = (id: bigint) => run("Claim", () => writeContractAsync({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "claim", args: [id] }));
  const claimAll = async () => {
    for (const r of ready) await claim(r.id);
    claimables.refetch();
  };

  return (
    <Section
      title="Vesting paying you"
      sub={ready.length ? `${ready.length} ${ready.length === 1 ? "schedule has" : "schedules have"} tokens ready to claim.` : "Tokens appear here as they vest."}
      action={
        ready.length > 1 ? (
          <button type="button" className="btn btn-dark" disabled={state.status === "pending"} onClick={claimAll}>
            Claim all ({ready.length})
          </button>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <p className="note">No vesting schedules pay this wallet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Token</th>
                <th>Claimable now</th>
                <th>Next release</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ id, s, c }) => {
                const m = s ? meta(s.token) : { decimals: 18 };
                const n = s ? nextRelease(s) : undefined;
                return (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/vest/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>{s ? (m.symbol ?? short(s.token)) : "…"}</td>
                    <td className="mono">{fmtAmount(c, m.decimals)}</td>
                    <td className="mono">
                      {!n ? "…" : n.kind === "done" ? "Fully vested" : n.kind === "streaming" ? `~${fmtAmount(n.perDay, m.decimals)}/day` : `${fmtDate(n.ts)} · ${countdown(n.ts)}`}
                    </td>
                    <td>
                      <button type="button" className={c > 0n ? "btn btn-dark" : "btn btn-ghost"} disabled={c === 0n || state.status === "pending"} onClick={() => claim(id).then(() => claimables.refetch())}>
                        Claim
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </Section>
  );
}

function Locks({ me }: { me: Address }) {
  const ids = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByOwner", args: [me], query: { enabled: !!contracts.locker } });
  const list = (ids.data ?? []).slice().reverse();
  const locks = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    query: { enabled: list.length > 0 },
  });
  const rows = list.map((id, i) => ({ id, l: locks.data?.[i]?.result as LockT | undefined }));
  const meta = useTokenMeta(rows.flatMap((r) => (r.l ? [r.l.token] : [])));
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const now = Date.now() / 1000;

  return (
    <Section title="My locks" sub="Locks you own. Withdraw once the unlock date has passed.">
      {list.length === 0 ? (
        <p className="note">
          You have no locks. <Link href="/lock">Create one</Link>.
        </p>
      ) : (
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
              {rows.map(({ id, l }) => {
                const m = l ? meta(l.token) : { decimals: 18 };
                const open = l ? Number(l.unlockAt) <= now : false;
                return (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>{l ? `${m.symbol ?? short(l.token)}${l.isLP ? " LP" : ""}` : "…"}</td>
                    <td className="mono">{l ? fmtAmount(l.amount, m.decimals) : "…"}</td>
                    <td className="mono">{!l ? "…" : l.withdrawn ? "Withdrawn" : `${fmtDate(l.unlockAt)} · ${countdown(l.unlockAt)}`}</td>
                    <td>
                      <button
                        type="button"
                        className={open && l && !l.withdrawn ? "btn btn-dark" : "btn btn-ghost"}
                        disabled={!l || !open || l.withdrawn || state.status === "pending"}
                        onClick={() => run("Withdraw", () => writeContractAsync({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "withdraw", args: [id] })).then(() => locks.refetch())}
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
      )}
      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </Section>
  );
}

function Created({ me }: { me: Address }) {
  const ids = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByCreator", args: [me], query: { enabled: !!contracts.vesting } });
  const list = (ids.data ?? []).slice().reverse();
  const scheds = useReadContracts({
    contracts: list.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
    query: { enabled: list.length > 0 },
  });
  const rows = list.map((id, i) => ({ id, s: scheds.data?.[i]?.result as SchedT | undefined }));
  const meta = useTokenMeta(rows.flatMap((r) => (r.s ? [r.s.token] : [])));
  if (list.length === 0) return null;
  return (
    <Section title="Vesting you created" sub="Schedules you funded for your team, investors or community.">
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
            {rows.map(({ id, s }) => {
              const m = s ? meta(s.token) : { decimals: 18 };
              return (
                <tr key={id.toString()}>
                  <td>
                    <Link href={`/vest/${id}`}>#{id.toString()}</Link>
                  </td>
                  <td className="mono">{s ? short(s.beneficiary) : "…"}</td>
                  <td className="mono">{s ? `${fmtAmount(s.total - s.released, m.decimals)} ${m.symbol ?? ""}` : "…"}</td>
                  <td className="mono">{!s ? "…" : s.revoked ? "Cancelled" : fmtDate(s.start + s.duration)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

type DropRow = { tx: Hash; token: Address; recipients: bigint; total: bigint; block: bigint };

function Drops({ me }: { me: Address }) {
  const client = usePublicClient({ chainId: cid });
  const [rows, setRows] = useState<DropRow[] | undefined>();
  useEffect(() => {
    if (!client || !contracts.drop) return;
    let stop = false;
    (async () => {
      try {
        const latest = await client.getBlockNumber();
        const from = deployBlock > 0n ? deployBlock : latest > 500_000n ? latest - 500_000n : 0n;
        const logs = await client.getContractEvents({ address: contracts.drop!, abi: dropAbi, eventName: "Dropped", args: { sender: me }, fromBlock: from, toBlock: latest });
        if (!stop)
          setRows(
            logs
              .map((l) => ({ tx: l.transactionHash as Hash, token: l.args.token as Address, recipients: l.args.recipients ?? 0n, total: l.args.total ?? 0n, block: l.blockNumber ?? 0n }))
              .reverse(),
          );
      } catch {
        if (!stop) setRows([]);
      }
    })();
    return () => {
      stop = true;
    };
  }, [client, me]);
  const meta = useTokenMeta((rows ?? []).filter((r) => r.token !== "0x0000000000000000000000000000000000000000").map((r) => r.token));
  if (!rows || rows.length === 0) return null;
  return (
    <Section title="Drops you sent" sub="Every Gas Drop batch from this wallet.">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Wallets</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const native = r.token === "0x0000000000000000000000000000000000000000";
              const m = native ? { symbol: "HYPE", decimals: 18 } : meta(r.token);
              return (
                <tr key={r.tx}>
                  <td>{m.symbol ?? short(r.token)}</td>
                  <td className="mono">{r.recipients.toString()}</td>
                  <td className="mono">{fmtAmount(r.total, m.decimals)}</td>
                  <td>
                    <a href={explorerTx(r.tx)} target="_blank" rel="noreferrer">
                      View ↗
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
