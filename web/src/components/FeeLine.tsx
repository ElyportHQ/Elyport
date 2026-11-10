"use client";

import { fmtAmount } from "@/lib/format";
import { useHolderDiscount, type ToolFee } from "@/lib/useToolFee";

/** Fee value for the summary list, with the holder discount when it applies. */
export function FeeValue({ f, times = 1 }: { f: ToolFee; times?: number }) {
  if (f.fee === undefined) return <>—</>;
  const n = BigInt(Math.max(1, times));
  return (
    <>
      {f.discounted && f.base !== undefined && (
        <s style={{ color: "#9AA1AC", marginRight: 6 }}>{fmtAmount(f.base * n, 18, 4)}</s>
      )}
      {fmtAmount(f.fee * n, 18, 4)} HYPE
    </>
  );
}

/** "Hold X to save Y%" hint, shown only once a discount exists. */
export function DiscountHint({ f }: { f: ToolFee }) {
  const d = useHolderDiscount();
  if (!d.active || d.bps === undefined) return null;
  const pct = d.bps / 100;
  return (
    <p className="note" style={{ margin: 0 }}>
      {f.discounted
        ? `Holder discount applied: ${pct}% off.`
        : `Hold ${d.minBalance !== undefined ? fmtAmount(d.minBalance, d.decimals, 2) : ""} ${d.symbol ?? "tokens"} to save ${pct}% on every fee.`}
    </p>
  );
}
