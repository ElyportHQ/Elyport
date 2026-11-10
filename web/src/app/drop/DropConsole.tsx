"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, isAddress, parseUnits, type Address } from "viem";
import { contracts, elysium } from "@/lib/config";
import { dropAbi } from "@/lib/abis";
import { chunk, fmtAmount, parseRecipients } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { useDropFee } from "@/lib/useToolFee";
import { DiscountHint, FeeValue } from "@/components/FeeLine";
import { SuccessMoment, useCelebratePreview, type Moment } from "@/components/SuccessMoment";
import { FanOut } from "@/components/home/Scenes";
import { HolderImport } from "./HolderImport";

const BATCH = 400; // below the contract's 500 cap, leaves gas headroom

export function DropConsole() {
  const { address } = useAccount();
  const [mode, setMode] = useState<"native" | "token">("native");
  const [token, setToken] = useState("");
  const [text, setText] = useState("");
  const [same, setSame] = useState("");
  const [useSame, setUseSame] = useState(false);
  const [done, setDone] = useState(0);
  const [moment, setMoment] = useState<Moment | null>(null);
  useCelebratePreview(setMoment, { kind: "drop", title: "Drop sent", detail: "Sent to 1,240 wallets in 3 batches." });

  const cid = elysium.id;
  const tokenAddr = isAddress(token) ? (token as Address) : undefined;

  const fee = useDropFee();
  const meta = useReadContracts({
    contracts: tokenAddr
      ? [
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
          { chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
        ]
      : [],
    query: { enabled: mode === "token" && !!tokenAddr },
  });
  const decimals = mode === "native" ? 18 : (meta.data?.[0]?.result as number | undefined);
  const symbol = mode === "native" ? "HYPE" : ((meta.data?.[1]?.result as string | undefined) ?? "token");
  const balance = meta.data?.[2]?.result as bigint | undefined;

  const parsed = useMemo(() => parseRecipients(text, useSame ? same : undefined), [text, same, useSame]);
  const amounts = useMemo(() => {
    if (decimals === undefined) return undefined;
    try {
      return parsed.valid.map((r) => parseUnits(r.amount, decimals));
    } catch {
      return undefined;
    }
  }, [parsed, decimals]);
  const total = amounts?.reduce((a, b) => a + b, 0n) ?? 0n;
  const batches = Math.ceil(parsed.valid.length / BATCH);
  const feeEach = fee.fee ?? 0n;

  const { writeContractAsync } = useWriteContract();
  const { state, setState, run } = useChainTx(cid);

  async function send() {
    if (!contracts.drop || !amounts || parsed.valid.length === 0) return;
    const drop = contracts.drop;
    const recips = chunk(parsed.valid.map((r) => r.address), BATCH);
    const amts = chunk(amounts, BATCH);
    setDone(0);

    if (mode === "token" && tokenAddr) {
      const ok = await run("Approve", () => writeContractAsync({ chainId: cid, address: tokenAddr, abi: erc20Abi, functionName: "approve", args: [drop, total] }));
      if (!ok) return;
    }
    for (let i = 0; i < recips.length; i++) {
      const sum = amts[i].reduce((a, b) => a + b, 0n);
      const label = `Batch ${i + 1} of ${recips.length}`;
      const receipt =
        mode === "native"
          ? await run(label, () => writeContractAsync({ chainId: cid, address: drop, abi: dropAbi, functionName: "dropNative", args: [recips[i], amts[i]], value: sum + feeEach }))
          : await run(label, () => writeContractAsync({ chainId: cid, address: drop, abi: dropAbi, functionName: "dropToken", args: [tokenAddr!, recips[i], amts[i]], value: feeEach }));
      if (!receipt) return;
      setDone(i + 1);
    }
    setState({ status: "success", message: `Sent to ${parsed.valid.length} wallets.` });
    setMoment({
      kind: "drop",
      title: "Drop sent",
      detail: `Sent to ${parsed.valid.length.toLocaleString("en-US")} wallets in ${recips.length} ${recips.length === 1 ? "batch" : "batches"}.`,
    });
  }

  const notEnough = mode === "token" && balance !== undefined && total > balance;
  const ready = !!contracts.drop && parsed.valid.length > 0 && !!amounts && (mode === "native" || !!tokenAddr) && !notEnough;

  return (
    <div className="app-grid">
      <SuccessMoment moment={moment} onClose={() => setMoment(null)} />
      <div className="console">
        <span className="console-title">New drop</span>
        <div className="segmented" role="group" aria-label="What to send">
          <button type="button" aria-pressed={mode === "native"} onClick={() => setMode("native")}>
            HYPE (gas)
          </button>
          <button type="button" aria-pressed={mode === "token"} onClick={() => setMode("token")}>
            Any token
          </button>
        </div>
        {mode === "token" && (
          <label className="field">
            Token address
            <input className="input" placeholder="0x…" value={token} onChange={(e) => setToken(e.target.value.trim())} />
            {tokenAddr && decimals !== undefined && (
              <span>
                {symbol} · balance {fmtAmount(balance, decimals)}
              </span>
            )}
          </label>
        )}

        <label className="field">
          Recipients · one per line{useSame ? " (address only)" : " (address, amount)"}
          <textarea className="textarea" rows={8} placeholder={useSame ? "0x…\n0x…" : "0x…,0.05\n0x…,0.05"} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="chips" style={{ marginTop: -10 }}>
          <label className="chip" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            Upload CSV
            <input
              type="file"
              accept=".csv,.txt"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
              }}
            />
          </label>
          <button type="button" className="chip" aria-pressed={useSame} onClick={() => setUseSame((v) => !v)}>
            Same amount for all
          </button>
          <HolderImport
            dropDecimals={decimals}
            dropSymbol={symbol}
            onUse={(t, sameAmount) => {
              setText(t);
              if (sameAmount !== undefined) {
                setUseSame(true);
                setSame(sameAmount);
              } else setUseSame(false);
            }}
          />
        </div>
        {useSame && (
          <label className="field">
            Amount per wallet ({symbol})
            <input className="input" inputMode="decimal" value={same} onChange={(e) => setSame(e.target.value.replace(/[^\d.]/g, ""))} />
          </label>
        )}

        <div className="chips">
          <span className="pill pill-ok">{parsed.valid.length} valid</span>
          <span className="pill pill-warn">{parsed.duplicates} duplicates</span>
          <span className="pill pill-bad">{parsed.invalid.length} invalid</span>
        </div>

        <dl className="summary">
          <dt>Recipients</dt>
          <dd>{parsed.valid.length}</dd>
          <dt>Total</dt>
          <dd>
            {decimals !== undefined ? formatUnits(total, decimals) : "—"} {symbol}
          </dd>
          <dt>Batches</dt>
          <dd>{batches}</dd>
          <dt>Fee · per batch</dt>
          <dd>
            <FeeValue f={fee} times={Math.max(batches, 1)} />
          </dd>
        </dl>
        <DiscountHint f={fee} />
        {notEnough && <p className="error">Your balance is lower than the total.</p>}
        {!contracts.drop && <p className="warn">Gas Drop is not deployed on this network yet.</p>}

        <button type="button" className="btn btn-dark btn-lg btn-block" disabled={!ready || state.status === "pending"} onClick={send}>
          {address ? "Send Gas Drop" : "Connect wallet"}
        </button>
        {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
      </div>

      <div className="stack">
        <section className="panel" aria-label="Preview">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Preview
          </div>
          <FanOut width={440} />
        </section>
        <section className="panel" aria-label="Batches">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span className="eyebrow">Batches</span>
            <span className="mono" style={{ fontSize: 13 }}>
              {done} / {batches}
            </span>
          </div>
          <div className="bar">
            <div style={{ width: batches ? `${Math.max(4, (done / batches) * 100)}%` : "4%" }} />
          </div>
        </section>
        <section className="panel-holo">
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>Onboarding a community?</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#3E4552" }}>
            Drop a little HYPE to every holder so they can make their first move on Elysium without bridging. Use Import
            token holders to load them straight from the chain.
          </p>
        </section>
      </div>
    </div>
  );
}
