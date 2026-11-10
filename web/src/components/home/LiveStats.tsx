"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { fmtDate, short } from "@/lib/format";

const cid = elysium.id;

export function LiveStats() {
  const items = [
    { label: "Chains", value: "7", note: "pay from to refuel" },
    { label: "Verified contracts", value: "10", note: "open source, on every chain" },
    { label: "Wallets per drop", value: "500", note: "in one transaction" },
  ];

  return (
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "32px 24px" }}>
      {items.map((i) => (
        <div key={i.label}>
          <div className="eyebrow">{i.label}</div>
          <div style={{ marginTop: 6, fontSize: 44, fontWeight: 300, letterSpacing: "-0.04em" }}>{i.value}</div>
          <div style={{ marginTop: 2, fontSize: 14, color: "#5D6573" }}>{i.note}</div>
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
