"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { contracts, elysium } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { fmtDate, short } from "@/lib/format";

const cid = elysium.id;

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
