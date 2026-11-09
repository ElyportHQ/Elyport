"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, isAddress } from "viem";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";

const cid = elysium.id;
const PAGE = 25;

export function ExploreLocks() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "lp" | "token">("all");

  const data = useReadContract({
    chainId: cid,
    address: contracts.locker,
    abi: lockerAbi,
    functionName: "getLocks",
    args: [BigInt(page * PAGE), BigInt(PAGE), true],
    query: { enabled: !!contracts.locker },
  });
  const count = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockCount", query: { enabled: !!contracts.locker } });
  const locks = data.data?.[0] ?? [];
  const ids = data.data?.[1] ?? [];
  const tokens = Array.from(new Set(locks.map((l) => l.token)));
  const meta = useReadContracts({
    contracts: tokens.flatMap((t) => [
      { chainId: cid, address: t, abi: erc20Abi, functionName: "symbol" as const },
      { chainId: cid, address: t, abi: erc20Abi, functionName: "decimals" as const },
    ]),
    query: { enabled: tokens.length > 0 },
  });
  const info = (t: string) => {
    const i = tokens.indexOf(t as `0x${string}`);
    return {
      symbol: meta.data?.[i * 2]?.result as string | undefined,
      decimals: (meta.data?.[i * 2 + 1]?.result as number | undefined) ?? 18,
    };
  };

  const rows = locks
    .map((l, i) => ({ l, id: ids[i] }))
    .filter(({ l }) => (filter === "all" ? true : filter === "lp" ? l.isLP : !l.isLP));
  const total = Number(count.data ?? 0n);

  return (
    <div className="stack">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isAddress(q)) router.push(`/token/${q}`);
          else if (/^\d+$/.test(q)) router.push(`/lock/${q}`);
        }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <input className="input" style={{ flex: "1 1 320px" }} aria-label="Search" placeholder="Token address or lock number" value={q} onChange={(e) => setQ(e.target.value.trim())} />
        <button type="submit" className="btn btn-dark">
          Search
        </button>
      </form>
      <div className="tabs" role="tablist" aria-label="Filter" style={{ width: "fit-content" }}>
        {(["all", "lp", "token"] as const).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "lp" ? "LP" : "Tokens"}
          </button>
        ))}
      </div>

      {!contracts.locker ? (
        <p className="warn">Locker is not deployed on this network yet.</p>
      ) : rows.length === 0 ? (
        <p className="note">{data.isLoading ? "Loading locks…" : "No locks yet."}</p>
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
              {rows.map(({ l, id }) => {
                const t = info(l.token);
                return (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>
                      <Link href={`/token/${l.token}`}>
                        {t.symbol ?? short(l.token)}
                        {l.isLP ? " LP" : ""}
                      </Link>
                    </td>
                    <td className="mono">{fmtAmount(l.amount, t.decimals)}</td>
                    <td className="mono">{fmtDate(l.unlockAt)}</td>
                    <td className="mono">{l.withdrawn ? "Withdrawn" : countdown(l.unlockAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE && (
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Newer
          </button>
          <button type="button" className="btn btn-ghost" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>
            Older
          </button>
        </div>
      )}
    </div>
  );
}
