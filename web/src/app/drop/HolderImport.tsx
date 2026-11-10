"use client";

import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits } from "viem";

type Holder = { address: string; balance: string; contract: boolean };
type List = { symbol: string; decimals: number; holders: Holder[]; truncated: boolean };

/** Fills the Gas Drop list with a token's holders, rebuilt on-chain by /api/v1/holders. */
export function HolderImport({
  dropDecimals,
  dropSymbol,
  onUse,
}: {
  dropDecimals: number | undefined;
  dropSymbol: string;
  onUse: (text: string, sameAmount?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ca, setCa] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("400");
  const [skipContracts, setSkipContracts] = useState(true);
  const [split, setSplit] = useState<"same" | "share">("same");
  const [amount, setAmount] = useState("");
  const [list, setList] = useState<List | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "error"; msg?: string }>({ kind: "idle" });

  async function load() {
    if (!isAddress(ca)) return;
    setStatus({ kind: "loading", msg: "Reading every transfer of this token on Elysium…" });
    setList(null);
    try {
      const r = await fetch(`/api/v1/holders/${ca}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Could not load holders.");
      setList(d as List);
      setStatus({ kind: "idle" });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    }
  }

  const picked = useMemo(() => {
    if (!list) return [];
    let minUnits = 0n;
    try {
      minUnits = min ? parseUnits(min, list.decimals) : 0n;
    } catch {
      /* ignore bad input */
    }
    const cap = Math.max(1, Math.min(5000, Number(max) || 400));
    return list.holders.filter((h) => (!skipContracts || !h.contract) && BigInt(h.balance) >= minUnits).slice(0, cap);
  }, [list, min, max, skipContracts]);

  function use() {
    if (!picked.length || dropDecimals === undefined || !amount) return;
    if (split === "same") {
      onUse(picked.map((h) => h.address).join("\n"), amount);
      return;
    }
    let total: bigint;
    try {
      total = parseUnits(amount, dropDecimals);
    } catch {
      return;
    }
    const sum = picked.reduce((a, h) => a + BigInt(h.balance), 0n);
    if (sum === 0n) return;
    const lines = picked
      .map((h) => ({ a: h.address, v: (total * BigInt(h.balance)) / sum }))
      .filter((x) => x.v > 0n)
      .map((x) => `${x.a},${formatUnits(x.v, dropDecimals)}`);
    onUse(lines.join("\n"));
  }

  if (!open) {
    return (
      <button type="button" className="chip" onClick={() => setOpen(true)}>
        Import token holders
      </button>
    );
  }

  return (
    <section className="panel" style={{ display: "grid", gap: 12, width: "100%", flex: "1 1 100%" }} aria-label="Import token holders">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Import token holders</strong>
        <button type="button" className="chip" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <label className="field">
        Holders of (token address)
        <input className="input" placeholder="0x…" value={ca} onChange={(e) => setCa(e.target.value.trim())} />
      </label>
      <button type="button" className="btn btn-ghost" disabled={!isAddress(ca) || status.kind === "loading"} onClick={load}>
        {status.kind === "loading" ? "Loading…" : "Load holders"}
      </button>
      {status.msg && <p className={status.kind === "error" ? "error" : "note"}>{status.msg}</p>}

      {list && (
        <>
          <p className="note" style={{ margin: 0 }}>
            {list.holders.length.toLocaleString("en-US")} holders of {list.symbol}
            {list.truncated ? " (largest 10,000 shown)" : ""}. Read from the chain, largest first.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="field">
              Min balance ({list.symbol})
              <input className="input" inputMode="decimal" placeholder="0" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} />
            </label>
            <label className="field">
              Max wallets
              <input className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
          <button type="button" className="chip" aria-pressed={skipContracts} onClick={() => setSkipContracts((v) => !v)}>
            Skip contracts (pools, lockers, vaults)
          </button>
          <div className="segmented" role="group" aria-label="How to split">
            <button type="button" aria-pressed={split === "same"} onClick={() => setSplit("same")}>
              Same amount each
            </button>
            <button type="button" aria-pressed={split === "share"} onClick={() => setSplit("share")}>
              By holdings
            </button>
          </div>
          <label className="field">
            {split === "same" ? `Amount per wallet (${dropSymbol})` : `Total to share (${dropSymbol})`}
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
          <button type="button" className="btn btn-dark btn-block" disabled={!picked.length || !amount || dropDecimals === undefined} onClick={use}>
            Use {picked.length.toLocaleString("en-US")} wallets
          </button>
        </>
      )}
    </section>
  );
}
