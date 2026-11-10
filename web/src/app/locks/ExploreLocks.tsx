"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, isAddress, type Address } from "viem";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";
import { useVerifiedPairs } from "@/lib/useVerifiedPairs";
import { useMounted } from "@/lib/useMounted";

const cid = elysium.id;
const LOAD = 200;
const PAGE = 25;
const WEEK = 7 * 86_400;
const pairAbi = [
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

type Kind = "all" | "lp" | "token";
type Sort = "new" | "soon";

export function ExploreLocks() {
  const router = useRouter();
  const mounted = useMounted();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [soon, setSoon] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [sort, setSort] = useState<Sort>("new");
  const [page, setPage] = useState(0);

  const data = useReadContract({
    chainId: cid,
    address: contracts.locker,
    abi: lockerAbi,
    functionName: "getLocks",
    args: [0n, BigInt(LOAD), true],
    query: { enabled: !!contracts.locker },
  });
  const count = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockCount", query: { enabled: !!contracts.locker } });
  const locks = useMemo(() => data.data?.[0] ?? [], [data.data]);
  const ids = useMemo(() => data.data?.[1] ?? [], [data.data]);

  const tokens = useMemo(() => Array.from(new Set(locks.map((l) => l.token.toLowerCase()))) as Address[], [locks]);
  const lpTokens = useMemo(() => Array.from(new Set(locks.filter((l) => l.isLP).map((l) => l.token.toLowerCase()))) as Address[], [locks]);

  const meta = useReadContracts({
    contracts: tokens.flatMap((t) => [
      { chainId: cid, address: t, abi: erc20Abi, functionName: "symbol" as const },
      { chainId: cid, address: t, abi: erc20Abi, functionName: "name" as const },
      { chainId: cid, address: t, abi: erc20Abi, functionName: "decimals" as const },
    ]),
    query: { enabled: tokens.length > 0 },
  });
  const pairs = useReadContracts({
    contracts: lpTokens.flatMap((t) => [
      { chainId: cid, address: t, abi: pairAbi, functionName: "token0" as const },
      { chainId: cid, address: t, abi: pairAbi, functionName: "token1" as const },
    ]),
    query: { enabled: lpTokens.length > 0 },
  });
  const pairCheck = useVerifiedPairs(lpTokens);
  const underlying = useMemo(
    () => Array.from(new Set((pairs.data ?? []).map((r) => (r.result as string | undefined)?.toLowerCase()).filter(Boolean))) as Address[],
    [pairs.data],
  );
  const underMeta = useReadContracts({
    contracts: underlying.map((t) => ({ chainId: cid, address: t, abi: erc20Abi, functionName: "symbol" as const })),
    query: { enabled: underlying.length > 0 },
  });

  const info = (t: string) => {
    const i = tokens.indexOf(t.toLowerCase() as Address);
    return {
      symbol: meta.data?.[i * 3]?.result as string | undefined,
      name: meta.data?.[i * 3 + 1]?.result as string | undefined,
      decimals: (meta.data?.[i * 3 + 2]?.result as number | undefined) ?? 18,
    };
  };
  const pairLabel = (t: string) => {
    const i = lpTokens.indexOf(t.toLowerCase() as Address);
    if (i < 0) return undefined;
    const a = (pairs.data?.[i * 2]?.result as string | undefined)?.toLowerCase();
    const b = (pairs.data?.[i * 2 + 1]?.result as string | undefined)?.toLowerCase();
    const sym = (x?: string) => (x ? (underMeta.data?.[underlying.indexOf(x as Address)]?.result as string | undefined) : undefined);
    const sa = sym(a);
    const sb = sym(b);
    return sa && sb ? `${sa}/${sb}` : undefined;
  };
  const unverifiedPair = (t: string) => !pairCheck.loading && pairCheck.map.get(t.toLowerCase())?.verified === false;

  const now = mounted ? Date.now() / 1000 : 0;
  const needle = q.trim().toLowerCase();
  const rows = locks
    .map((l, i) => ({ l, id: ids[i] }))
    .filter(({ l }) => (kind === "all" ? true : kind === "lp" ? l.isLP : !l.isLP))
    .filter(({ l }) => (activeOnly ? !l.withdrawn && Number(l.unlockAt) > now : true))
    .filter(({ l }) => (soon ? Number(l.unlockAt) > now && Number(l.unlockAt) - now <= WEEK : true))
    .filter(({ l }) => {
      if (!needle || isAddress(needle) || /^\d+$/.test(needle)) return true;
      const m = info(l.token);
      const hay = `${m.symbol ?? ""} ${m.name ?? ""} ${pairLabel(l.token) ?? ""} ${l.token}`.toLowerCase();
      return hay.includes(needle);
    })
    .sort((a, b) => (sort === "new" ? Number(b.id - a.id) : Number(a.l.unlockAt - b.l.unlockAt)));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const total = Number(count.data ?? 0n);

  return (
    <div className="stack">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddress(q.trim())) router.push(`/token/${q.trim()}`);
          else if (/^\d+$/.test(q.trim())) router.push(`/lock/${q.trim()}`);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input
          className="input"
          style={{ flex: "1 1 320px" }}
          aria-label="Search locks"
          placeholder="Token name, symbol, address or lock number"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <button type="submit" className="btn btn-dark">
          Search
        </button>
      </form>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div className="tabs" role="tablist" aria-label="Type" style={{ width: "fit-content" }}>
          {(["all", "lp", "token"] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={kind === f} onClick={() => (setKind(f), setPage(0))}>
              {f === "all" ? "All" : f === "lp" ? "LP" : "Tokens"}
            </button>
          ))}
        </div>
        <button type="button" className="chip" aria-pressed={soon} onClick={() => (setSoon((v) => !v), setPage(0))}>
          Unlocking in 7 days
        </button>
        <button type="button" className="chip" aria-pressed={activeOnly} onClick={() => (setActiveOnly((v) => !v), setPage(0))}>
          Active only
        </button>
        <div className="tabs" role="tablist" aria-label="Sort" style={{ width: "fit-content", marginLeft: "auto" }}>
          <button type="button" role="tab" aria-selected={sort === "new"} onClick={() => setSort("new")}>
            Newest
          </button>
          <button type="button" role="tab" aria-selected={sort === "soon"} onClick={() => setSort("soon")}>
            Unlocking soon
          </button>
        </div>
      </div>

      {!contracts.locker ? (
        <p className="warn">Locker is not deployed on this network yet.</p>
      ) : shown.length === 0 ? (
        <p className="note">{data.isLoading ? "Loading locks…" : locks.length === 0 ? "No locks yet. Be the first." : "No locks match these filters."}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lock</th>
                <th>Token</th>
                <th>Amount</th>
                <th>Unlocks</th>
                <th>Time left</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ l, id }) => {
                const t = info(l.token);
                const pl = l.isLP ? pairLabel(l.token) : undefined;
                return (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>
                      <Link href={`/token/${l.token}`}>{pl ? `${pl} LP` : `${t.symbol ?? short(l.token)}${l.isLP ? " LP" : ""}`}</Link>
                      {l.isLP && unverifiedPair(l.token) && (
                        <span className="pill pill-warn" style={{ marginLeft: 6, padding: "2px 8px", fontSize: 11 }} title="This LP token's pair is not from a known DEX">
                          Unverified pair
                        </span>
                      )}
                    </td>
                    <td className="mono">{fmtAmount(l.amount, t.decimals)}</td>
                    <td className="mono">{fmtDate(l.unlockAt)}</td>
                    <td className="mono">{!mounted ? "…" : l.withdrawn ? "Withdrawn" : countdown(l.unlockAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {pages > 1 && (
          <>
            <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="eyebrow">
              Page {page + 1} of {pages}
            </span>
            <button type="button" className="btn btn-ghost" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </>
        )}
        <span className="eyebrow" style={{ marginLeft: "auto" }}>
          {total > LOAD ? `Showing the latest ${LOAD} of ${total} locks` : `${total} ${total === 1 ? "lock" : "locks"} in total`}
        </span>
      </div>
    </div>
  );
}
