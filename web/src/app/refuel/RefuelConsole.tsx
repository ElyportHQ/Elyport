"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useConfig, useReadContract, useWriteContract } from "wagmi";
import { readContract } from "wagmi/actions";
import { erc20Abi, isAddress, parseEther, parseEventLogs, parseUnits, type Address, type Hash } from "viem";
import { contracts, elysium, REFUEL_FEE_BPS, REFUEL_MAX_USD, REFUEL_PRESETS_USD, sourceChains } from "@/lib/config";
import { depositAbi, vaultAbi } from "@/lib/abis";
import { depositKey, fmtAmount, short } from "@/lib/format";
import { useChainTx } from "@/lib/useChainTx";
import { SuccessMoment, useCelebratePreview, type Moment } from "@/components/SuccessMoment";
import type { UsdPrices } from "@/lib/prices";

type Pay = "usdc" | "native";
type HistoryItem = { chain: string; usd: number; tx: Hash; key: `0x${string}`; ts: number };
const HISTORY_KEY = "elyport.refuels";

function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as HistoryItem[];
  } catch {
    return [];
  }
}
function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    /* storage unavailable */
  }
}

export function RefuelConsole() {
  const { address } = useAccount();
  const config = useConfig();
  const [chainId, setChainId] = useState<number | "solana">(8453);
  const [pay, setPay] = useState<Pay>("usdc");
  const [usd, setUsd] = useState(5);
  const [custom, setCustom] = useState("");
  const [recipient, setRecipient] = useState("");
  const [key, setKey] = useState<`0x${string}` | undefined>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [moment, setMoment] = useState<Moment | null>(null);
  useCelebratePreview(setMoment, { kind: "refuel", title: "Refueled", detail: "≈ 0.1200 HYPE landed in your wallet on Elysium. You are ready to go." });

  useEffect(() => setHistory(loadHistory()), []);
  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  const source = typeof chainId === "number" ? sourceChains.find((c) => c.id === chainId) : undefined;
  const instant = !!source?.deposit;
  const canUsdc = !!source?.usdc;
  const payMode: Pay = canUsdc ? pay : "native";
  const amountUsd = custom.trim() !== "" ? Math.min(Number(custom) || 0, REFUEL_MAX_USD) : usd;

  const prices = useQuery({
    queryKey: ["prices"],
    queryFn: async () => {
      const r = await fetch("/api/price");
      if (!r.ok) throw new Error("price");
      return (await r.json()) as UsdPrices;
    },
    refetchInterval: 60_000,
  });

  const receiveHype = useMemo(() => {
    const hype = prices.data?.hyperliquid;
    if (!hype || !amountUsd) return undefined;
    return (amountUsd * (1 - REFUEL_FEE_BPS / 10_000)) / hype;
  }, [prices.data, amountUsd]);

  const stock = useReadContract({
    chainId: elysium.id,
    address: contracts.refuelVault,
    abi: vaultAbi,
    functionName: "stock",
    query: { enabled: !!contracts.refuelVault, refetchInterval: 15_000 },
  });
  const delivered = useReadContract({
    chainId: elysium.id,
    address: contracts.refuelVault,
    abi: vaultAbi,
    functionName: "processed",
    args: key ? [key] : undefined,
    query: { enabled: !!key && !!contracts.refuelVault, refetchInterval: (q) => (q.state.data ? false : 3000) },
  });

  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(typeof chainId === "number" ? chainId : 8453);

  const validRecipient = isAddress(recipient);
  const ready = instant && validRecipient && amountUsd >= 1 && amountUsd <= REFUEL_MAX_USD && (payMode === "usdc" || !!prices.data);

  async function refuel() {
    if (!source?.deposit || !validRecipient) return;
    const deposit = source.deposit;
    const to = recipient as Address;
    setKey(undefined);

    let receipt;
    if (payMode === "usdc" && source.usdc) {
      const usdc = source.usdc;
      const amount = parseUnits(amountUsd.toFixed(2), 6);
      if (address) {
        const allowance = await readContract(config, { chainId: source.id, address: usdc, abi: erc20Abi, functionName: "allowance", args: [address, deposit] }).catch(() => 0n);
        if (allowance < amount) {
          const ok = await run("Approve USDC", () => writeContractAsync({ chainId: source.id, address: usdc, abi: erc20Abi, functionName: "approve", args: [deposit, amount] }));
          if (!ok) return;
        }
      }
      receipt = await run("Refuel", () => writeContractAsync({ chainId: source.id, address: deposit, abi: depositAbi, functionName: "depositToken", args: [usdc, amount, to] }));
    } else {
      const price = prices.data?.[source.coingeckoId as keyof UsdPrices];
      if (!price) return;
      const value = parseEther((amountUsd / price).toFixed(8));
      receipt = await run("Refuel", () => writeContractAsync({ chainId: source.id, address: deposit, abi: depositAbi, functionName: "depositNative", args: [to], value }));
    }
    if (!receipt) return;

    const logs = parseEventLogs({ abi: depositAbi, logs: receipt.logs, eventName: "Deposited" });
    const id = logs[0]?.args.id;
    if (id === undefined) return;
    const k = depositKey(source.id, deposit, id);
    setKey(k);
    // Ask the relayer to deliver now; cron picks it up anyway if this call fails.
    fetch("/api/refuel/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chainId: source.id, id: id.toString() }),
    }).catch(() => undefined);
    const next = [{ chain: source.name, usd: amountUsd, tx: receipt.transactionHash, key: k, ts: Date.now() }, ...history];
    setHistory(next);
    saveHistory(next);
  }

  const step = delivered.data ? 3 : key ? 2 : state.status === "pending" ? 1 : 0;

  const [celebrated, setCelebrated] = useState<string | undefined>();
  useEffect(() => {
    if (!key || !delivered.data || celebrated === key) return;
    setCelebrated(key);
    setMoment({
      kind: "refuel",
      title: "Refueled",
      detail: `${receiveHype ? `≈ ${receiveHype.toFixed(4)} HYPE` : "Your HYPE"} landed on Elysium. You are ready to go.`,
      href: "/drop",
      hrefLabel: "Explore the toolkit",
    });
  }, [key, delivered.data, celebrated, receiveHype]);

  return (
    <div className="app-grid">
      <SuccessMoment moment={moment} onClose={() => setMoment(null)} />
      <div className="console">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span className="console-title">New refuel</span>
          <span className="pill pill-info">{chainId === "solana" || !instant ? "Route · via bridge" : "Instant · from Elyport stock"}</span>
        </div>

        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 10 }}>
            Pay from
          </legend>
          <div className="chips">
            {sourceChains.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={chainId === c.id} onClick={() => setChainId(c.id)}>
                {c.name}
              </button>
            ))}
            <button type="button" className="chip" aria-pressed={chainId === "solana"} onClick={() => setChainId("solana")}>
              Solana
            </button>
          </div>
        </fieldset>

        {chainId === "solana" || !instant ? (
          <RouteSteps solana={chainId === "solana"} />
        ) : (
          <>
            {canUsdc && (
              <div className="segmented" role="group" aria-label="Pay with">
                <button type="button" aria-pressed={payMode === "usdc"} onClick={() => setPay("usdc")}>
                  USDC
                </button>
                <button type="button" aria-pressed={payMode === "native"} onClick={() => setPay("native")}>
                  {source?.native}
                </button>
              </div>
            )}

            <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
              <legend className="eyebrow" style={{ marginBottom: 10 }}>
                Amount
              </legend>
              <div className="preset-grid">
                {REFUEL_PRESETS_USD.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="preset"
                    aria-pressed={custom === "" && usd === v}
                    onClick={() => {
                      setUsd(v);
                      setCustom("");
                    }}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <label className="field" style={{ marginTop: 10 }}>
                Custom amount (USD, up to {REFUEL_MAX_USD})
                <input className="input" inputMode="decimal" placeholder="e.g. 7.50" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))} />
              </label>
            </fieldset>

            <label className="field">
              Send to (Elysium)
              <input className="input" value={recipient} placeholder="0x…" onChange={(e) => setRecipient(e.target.value.trim())} />
            </label>
            {recipient && !validRecipient && <p className="error">That is not a valid address.</p>}

            <dl className="summary">
              <dt>You pay</dt>
              <dd>
                ${amountUsd.toFixed(2)} in {payMode === "usdc" ? "USDC" : source?.native}
              </dd>
              <dt>You receive</dt>
              <dd>{receiveHype ? `≈ ${receiveHype.toFixed(4)} HYPE` : "…"}</dd>
              <dt>Fee · 0.5%</dt>
              <dd>${((amountUsd * REFUEL_FEE_BPS) / 10_000).toFixed(2)}</dd>
              <dt>Arrives</dt>
              <dd>usually under a minute</dd>
            </dl>

            <button type="button" className="btn btn-dark btn-lg btn-block" disabled={!ready || state.status === "pending"} onClick={refuel}>
              {address ? `Refuel $${amountUsd.toFixed(amountUsd % 1 ? 2 : 0)}` : "Connect wallet"}
            </button>
            <p className="eyebrow center" style={{ margin: "-8px 0 0" }}>
              Instant limit · ${REFUEL_MAX_USD} per tx · $20 per wallet per day
            </p>
            {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
          </>
        )}
      </div>

      <div className="stack">
        <section className="panel" aria-label="Status">
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Status
          </div>
          <ol className="status-steps">
            <li className={step > 1 ? "done" : step === 1 ? "active" : ""}>
              <span className="d" />
              <div>
                <div style={{ fontSize: 17 }}>Pending</div>
                <div className="eyebrow">Waiting for your payment</div>
              </div>
            </li>
            <li className={step > 2 ? "done" : step === 2 ? "active" : ""}>
              <span className="d" />
              <div>
                <div style={{ fontSize: 17 }}>Sent</div>
                <div className="eyebrow">Paid, HYPE on its way</div>
              </div>
            </li>
            <li className={step === 3 ? "done" : ""}>
              <span className="d" />
              <div>
                <div style={{ fontSize: 17 }}>Delivered</div>
                <div className="eyebrow">Ready for your first transaction</div>
              </div>
            </li>
          </ol>
        </section>

        <section className="panel" aria-label="Instant stock">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span className="eyebrow">Instant stock</span>
            <span className="mono" style={{ fontSize: 13 }}>
              {stock.data !== undefined ? `${fmtAmount(stock.data, 18, 2)} HYPE` : "—"}
            </span>
          </div>
          <div className="bar" style={{ margin: "14px 0 10px" }}>
            <div style={{ width: stock.data && stock.data > 0n ? "70%" : "4%" }} />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            If the stock runs out or a payment cannot be delivered, the relayer refunds it on the chain you paid from.
          </p>
        </section>

        <section className="panel" aria-label="History">
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Your refuels
          </div>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 15, color: "#444B57" }}>Nothing yet. Each refuel shows up here.</p>
          ) : (
            <ul className="list-rows">
              {history.map((h) => (
                <li key={h.tx}>
                  <span>
                    ${h.usd} from {h.chain}
                  </span>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {short(h.tx)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {delivered.data && key && (
            <p className="ok" style={{ marginTop: 12 }}>
              Delivered on Elysium. Your HYPE is in the wallet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function RouteSteps({ solana }: { solana: boolean }) {
  return (
    <div className="stack">
      <p className="note">
        {solana
          ? "Solana goes through a bridge: first to HyperEVM, then into Elysium."
          : "Instant refuel from this chain is not open yet. You can still get there through a bridge."}
      </p>
      <ol className="steps" style={{ gridTemplateColumns: "1fr" }}>
        <li style={{ padding: "14px 0" }}>
          <div className="eyebrow">01</div>
          <h3 style={{ fontSize: 19 }}>Get HYPE on HyperEVM</h3>
          <p>Use Relay to swap into HYPE on HyperEVM.</p>
          <a className="link-accent" href="https://relay.link/bridge" target="_blank" rel="noreferrer">
            Open Relay ↗
          </a>
        </li>
        <li style={{ padding: "14px 0" }}>
          <div className="eyebrow">02</div>
          <h3 style={{ fontSize: 19 }}>Bridge HYPE into Elysium</h3>
          <p>Use the official Elysium bridge. HYPE moves 1:1.</p>
          <a className="link-accent" href="https://elysium.kinetiq.xyz/bridge" target="_blank" rel="noreferrer">
            Open the Elysium bridge ↗
          </a>
        </li>
      </ol>
    </div>
  );
}
