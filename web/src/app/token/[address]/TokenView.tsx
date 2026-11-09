"use client";

import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { contracts, elysium, explorerAddress } from "@/lib/config";
import { lockerAbi, vestingAbi } from "@/lib/abis";
import { countdown, fmtAmount, fmtDate, short } from "@/lib/format";

const cid = elysium.id;
const now = () => Math.floor(Date.now() / 1000);

type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };
type SchedT = { token: Address; beneficiary: Address; total: bigint; released: bigint; start: bigint; cliff: bigint; duration: bigint; revoked: boolean };

export function TokenView({ token }: { token: Address }) {
  const meta = useReadContracts({
    contracts: [
      { chainId: cid, address: token, abi: erc20Abi, functionName: "symbol" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "decimals" },
      { chainId: cid, address: token, abi: erc20Abi, functionName: "totalSupply" },
    ],
  });
  const symbol = meta.data?.[0]?.result as string | undefined;
  const decimals = (meta.data?.[1]?.result as number | undefined) ?? 18;
  const supply = meta.data?.[2]?.result as bigint | undefined;

  const lockIds = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token], query: { enabled: !!contracts.locker } });
  const schedIds = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token], query: { enabled: !!contracts.vesting } });
  const lIds = lockIds.data ?? [];
  const sIds = schedIds.data ?? [];

  const locks = useReadContracts({
    contracts: lIds.map((id) => ({ chainId: cid, address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
    query: { enabled: lIds.length > 0 },
  });
  const scheds = useReadContracts({
    contracts: sIds.map((id) => ({ chainId: cid, address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
    query: { enabled: sIds.length > 0 },
  });

  const lockList = lIds.map((id, i) => ({ id, l: locks.data?.[i]?.result as LockT | undefined })).filter((x) => x.l && !x.l.withdrawn) as { id: bigint; l: LockT }[];
  const schedList = sIds.map((id, i) => ({ id, s: scheds.data?.[i]?.result as SchedT | undefined })).filter((x) => x.s) as { id: bigint; s: SchedT }[];

  const lockedTotal = lockList.reduce((a, x) => a + x.l.amount, 0n);
  const vestingLeft = schedList.reduce((a, x) => a + (x.s.total - x.s.released), 0n);
  const pct = (v: bigint) => (supply && supply > 0n ? `${Number((v * 10_000n) / supply) / 100}%` : "—");
  const upcoming = lockList
    .filter((x) => Number(x.l.unlockAt) > now())
    .sort((a, b) => Number(a.l.unlockAt - b.l.unlockAt))
    .slice(0, 5);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="panel">
          <div className="eyebrow">Locked (LP + tokens)</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{pct(lockedTotal)}</div>
          <div className="eyebrow">of supply · {fmtAmount(lockedTotal, decimals)}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Still vesting</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{pct(vestingLeft)}</div>
          <div className="eyebrow">of supply · {fmtAmount(vestingLeft, decimals)}</div>
        </div>
        <div className="panel">
          <div className="eyebrow">Next unlock</div>
          <div style={{ fontSize: 34, fontWeight: 300 }}>{upcoming[0] ? countdown(upcoming[0].l.unlockAt) : "None"}</div>
          <div className="eyebrow">{upcoming[0] ? fmtDate(upcoming[0].l.unlockAt) : "No active locks"}</div>
        </div>
      </div>

      <section>
        <h2 style={{ fontWeight: 500, fontSize: 24 }}>Locks</h2>
        {lockList.length === 0 ? (
          <p className="note">No active locks for this token on Elyport.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Lock</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Unlocks</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {lockList.map(({ id, l }) => (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/lock/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td>{l.isLP ? "LP" : "Token"}</td>
                    <td className="mono">{fmtAmount(l.amount, decimals)}</td>
                    <td className="mono">
                      {fmtDate(l.unlockAt)} · {countdown(l.unlockAt)}
                    </td>
                    <td className="mono">
                      <a href={explorerAddress(l.owner)} target="_blank" rel="noreferrer">
                        {short(l.owner)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontWeight: 500, fontSize: 24 }}>Vesting</h2>
        {schedList.length === 0 ? (
          <p className="note">No vesting schedules for this token on Elyport.</p>
        ) : (
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
                {schedList.map(({ id, s }) => (
                  <tr key={id.toString()}>
                    <td>
                      <Link href={`/vest/${id}`}>#{id.toString()}</Link>
                    </td>
                    <td className="mono">{short(s.beneficiary)}</td>
                    <td className="mono">{fmtAmount(s.total - s.released, decimals)}</td>
                    <td className="mono">{s.revoked ? "Cancelled" : fmtDate(s.start + s.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="eyebrow">
        {symbol ?? "Token"} · <a href={explorerAddress(token)} target="_blank" rel="noreferrer">{token}</a>
      </p>
    </div>
  );
}
