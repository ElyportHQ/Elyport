"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi, vaultAbi, vestingAbi } from "@/lib/abis";
import { fmtAmount, fmtDate, short } from "@/lib/format";

const cid = elysium.id;

export function LiveStats() {
  const locks = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockCount", query: { enabled: !!contracts.locker } });
  const schedules = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "scheduleCount", query: { enabled: !!contracts.vesting } });
  const stock = useReadContract({ chainId: cid, address: contracts.refuelVault, abi: vaultAbi, functionName: "stock", query: { enabled: !!contracts.refuelVault } });

  const items = [
    { label: "Locks created", value: locks.data !== undefined ? locks.data.toString() : "—" },
    { label: "Vesting schedules", value: schedules.data !== undefined ? schedules.data.toString() : "—" },
    { label: "Instant refuel stock", value: stock.data !== undefined ? `${fmtAmount(stock.data, 18, 2)} HYPE` : "—" },
  ];

  return (
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "32px 24px" }}>
      {items.map((i) => (
        <div key={i.label}>
          <div className="eyebrow">{i.label}</div>
          <div style={{ marginTop: 6, fontSize: 44, fontWeight: 300, letterSpacing: "-0.04em" }}>{i.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTicker() {
  const recent = useReadContract({
    chainId: cid,
    address: contracts.locker,
    abi: lockerAbi,
    functionName: "getLocks",
    args: [0n, 8n, true],
    query: { enabled: !!contracts.locker },
  });
  const page = recent.data?.[0] ?? [];
  const symbols = useReadContracts({
    contracts: page.map((l) => ({ chainId: cid, address: l.token, abi: erc20Abi, functionName: "symbol" as const })),
    query: { enabled: page.length > 0 },
  });

  const lines =
    page.length > 0
      ? page.map((l, i) => {
          const sym = (symbols.data?.[i]?.result as string | undefined) ?? short(l.token);
          return `${sym}${l.isLP ? " LP" : ""} locked until ${fmtDate(l.unlockAt)}`;
        })
      : [
          "Refuel · HYPE gas from seven chains",
          "Gas Drop · one list, thousands of wallets",
          "Locker · extend anytime, never shorten",
          "Vesting · cliff, linear or monthly",
        ];

  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...lines, ...lines].map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
