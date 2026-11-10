"use client";

import { useReadContract, useWriteContract } from "wagmi";
import type { Address, Hash } from "viem";
import { depositAbi } from "@/lib/abis";
import { short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useMounted } from "@/lib/useMounted";

type Item = { chain: string; usd: number; tx: Hash; ts: number; chainId?: number; id?: string; deposit?: Address };
const STATUS = ["", "Pending", "Delivered", "Refunded"] as const;
const REFUND_DELAY = 24 * 3600;

/** One past refuel: live status from the source chain, and a self-refund button once it is allowed. */
export function RefuelHistoryRow({ item }: { item: Item }) {
  const mounted = useMounted();
  const known = item.chainId !== undefined && item.id !== undefined && !!item.deposit;
  const d = useReadContract({
    chainId: item.chainId,
    address: item.deposit,
    abi: depositAbi,
    functionName: "getDeposit",
    args: known ? [BigInt(item.id!)] : undefined,
    query: { enabled: known, refetchInterval: (q) => ((q.state.data as { status?: number } | undefined)?.status === 1 ? 20_000 : false) },
  });
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(item.chainId ?? 8453);

  const status = d.data ? Number(d.data.status) : undefined;
  const refundAt = d.data ? Number(d.data.createdAt) + REFUND_DELAY : undefined;
  const now = mounted ? Date.now() / 1000 : 0;
  const canRefund = status === 1 && refundAt !== undefined && now >= refundAt;
  const hoursLeft = status === 1 && refundAt !== undefined ? Math.max(0, Math.ceil((refundAt - now) / 3600)) : undefined;

  return (
    <li style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>
          ${item.usd} from {item.chain}
        </span>
        <span className="mono" style={{ fontSize: 13 }}>
          {status ? STATUS[status] : short(item.tx)}
        </span>
      </div>
      {canRefund && (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={state.status === "pending"}
          onClick={() =>
            run("Refund", () => writeContractAsync({ chainId: item.chainId!, address: item.deposit!, abi: depositAbi, functionName: "claimRefund", args: [BigInt(item.id!)] })).then(() => d.refetch())
          }
        >
          Refund to my wallet on {item.chain}
        </button>
      )}
      {status === 1 && !canRefund && hoursLeft !== undefined && mounted && Date.now() / 1000 - item.ts / 1000 > 600 && (
        <span className="eyebrow">Still pending. Self-refund opens in about {hoursLeft} h.</span>
      )}
      {state.message && <span className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</span>}
    </li>
  );
}
