"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData, formatEther, isAddress, keccak256, parseEther, toHex, zeroHash, type Address, type Hex, type PublicClient } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { contracts, elysium } from "@/lib/config";
import { roles } from "@/lib/docs";
import { ACCEPT_SALT, TIMELOCK_DELAY, ownedAbi, readOperations, timelockAbi, timelocked, type Operation } from "@/lib/timelock";
import { useChainTx } from "@/lib/useChainTx";

const cid = elysium.id;
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const fmtWhen = (ts: number) => new Date(ts * 1000).toUTCString().replace(" GMT", " UTC");

type Action = "lockFee" | "vestingFee" | "dropFee" | "feeRecipient" | "discount" | "dex";
const actions: Record<Action, string> = {
  lockFee: "Lock fee (HYPE)",
  vestingFee: "Vesting fee (HYPE)",
  dropFee: "Gas Drop fee (HYPE)",
  feeRecipient: "Fee recipient (all three tools)",
  discount: "Holder discount (all three tools)",
  dex: "LP checker: add or disable a DEX",
};

export function AdminConsole() {
  const { address } = useAccount();
  const pub = usePublicClient({ chainId: cid });
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const timelock = contracts.timelock as Address;
  const list = useMemo(() => timelocked(), []);
  const isOwner = same(address, roles.owner);
  const busy = state.status === "pending";

  const reads = useReadContracts({
    contracts: list.flatMap((c) => [
      { chainId: cid, address: c.address, abi: ownedAbi, functionName: "owner" } as const,
      { chainId: cid, address: c.address, abi: ownedAbi, functionName: "pendingOwner" } as const,
    ]),
  });
  const owners = list.map((c, i) => ({
    ...c,
    owner: reads.data?.[i * 2]?.result as Address | undefined,
    pending: reads.data?.[i * 2 + 1]?.result as Address | undefined,
  }));
  const allTimelocked = owners.length > 0 && owners.every((o) => same(o.owner, timelock));
  const allPending = owners.every((o) => same(o.owner, timelock) || same(o.pending, timelock));

  const [ops, setOps] = useState<Operation[] | undefined>();
  const loadOps = useCallback(async () => {
    if (!pub) return;
    try {
      setOps(await readOperations(pub as unknown as PublicClient));
    } catch {
      setOps([]);
    }
  }, [pub]);
  useEffect(() => {
    loadOps();
  }, [loadOps]);
  const refresh = () => {
    reads.refetch();
    loadOps();
  };

  // ---- hand-over
  const toAccept = owners.filter((o) => !same(o.owner, timelock));
  const acceptScheduled = ops?.find((o) => o.salt === ACCEPT_SALT && o.state !== "cancelled");

  const handOver = async (c: { name: string; address: Address }) => {
    const r = await run(`Hand ${c.name} to the timelock`, () =>
      writeContractAsync({ chainId: cid, address: c.address, abi: ownedAbi, functionName: "transferOwnership", args: [timelock] }),
    );
    if (r) refresh();
  };
  const scheduleAccept = async () => {
    const targets = toAccept.map((o) => o.address);
    const payload = encodeFunctionData({ abi: ownedAbi, functionName: "acceptOwnership" });
    const r = await run("Schedule the hand-over", () =>
      writeContractAsync({
        chainId: cid,
        address: timelock,
        abi: timelockAbi,
        functionName: "scheduleBatch",
        args: [targets, targets.map(() => 0n), targets.map(() => payload), zeroHash, ACCEPT_SALT, BigInt(TIMELOCK_DELAY)],
      }),
    );
    if (r) refresh();
  };

  // ---- execute / cancel
  const execute = async (op: Operation) => {
    const r = await run("Execute", () =>
      writeContractAsync({ chainId: cid, address: timelock, abi: timelockAbi, functionName: "executeBatch", args: [op.targets, op.values, op.payloads, op.predecessor, op.salt] }),
    );
    if (r) refresh();
  };
  const cancel = async (op: Operation) => {
    const r = await run("Cancel", () => writeContractAsync({ chainId: cid, address: timelock, abi: timelockAbi, functionName: "cancel", args: [op.id] }));
    if (r) refresh();
  };

  // ---- propose
  const [action, setAction] = useState<Action>("lockFee");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [v3, setV3] = useState("");
  const tools = [contracts.locker, contracts.vesting, contracts.drop] as Address[];
  const proposal = useMemo((): { targets: Address[]; payloads: Hex[] } | undefined => {
    try {
      switch (action) {
        case "lockFee":
          return v1 ? { targets: [contracts.locker!], payloads: [encodeFunctionData({ abi: ownedAbi, functionName: "setLockFee", args: [parseEther(v1)] })] } : undefined;
        case "vestingFee":
          return v1 ? { targets: [contracts.vesting!], payloads: [encodeFunctionData({ abi: ownedAbi, functionName: "setVestingFee", args: [parseEther(v1)] })] } : undefined;
        case "dropFee":
          return v1 ? { targets: [contracts.drop!], payloads: [encodeFunctionData({ abi: ownedAbi, functionName: "setDropFee", args: [parseEther(v1)] })] } : undefined;
        case "feeRecipient":
          return isAddress(v1) ? { targets: tools, payloads: tools.map(() => encodeFunctionData({ abi: ownedAbi, functionName: "setFeeRecipient", args: [v1] })) } : undefined;
        case "discount": {
          const bps = Math.round(Number(v3) * 100);
          if (!isAddress(v1) || !v2 || !(bps >= 0 && bps <= 10_000)) return undefined;
          return { targets: tools, payloads: tools.map(() => encodeFunctionData({ abi: ownedAbi, functionName: "setDiscount", args: [v1, parseEther(v2), bps] })) };
        }
        case "dex":
          return isAddress(v1) && v2.trim() ? { targets: [contracts.lpCheck!], payloads: [encodeFunctionData({ abi: ownedAbi, functionName: "setDex", args: [v1, v2.trim(), v3 !== "off"] })] } : undefined;
      }
    } catch {
      return undefined;
    }
  }, [action, v1, v2, v3, tools]);
  const propose = async () => {
    if (!proposal) return;
    const salt = keccak256(toHex(`${Date.now()}-${Math.random()}`));
    const r = await run("Schedule change", () =>
      writeContractAsync({
        chainId: cid,
        address: timelock,
        abi: timelockAbi,
        functionName: "scheduleBatch",
        args: [proposal.targets, proposal.targets.map(() => 0n), proposal.payloads, zeroHash, salt, BigInt(TIMELOCK_DELAY)],
      }),
    );
    if (r) {
      setV1("");
      setV2("");
      setV3("");
      refresh();
    }
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {!address && <p className="note">Connect the owner wallet to make changes. Anyone can read this page.</p>}
      {address && !isOwner && <p className="warn">This wallet is not the owner. You can execute changes whose 48 hours have passed, nothing else.</p>}

      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>1. Ownership</h2>
        {owners.map((o) => (
          <div key={o.address} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span>
              <strong>{o.name}</strong>{" "}
              <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
                {same(o.owner, timelock) ? "Timelock ✓" : same(o.pending, timelock) ? "Owner wallet → waiting for timelock" : o.owner ? "Owner wallet (no delay)" : "…"}
              </span>
            </span>
            {isOwner && same(o.owner, address) && !same(o.pending, timelock) && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => handOver(o)}>
                Hand over
              </button>
            )}
          </div>
        ))}
        {!allTimelocked && (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "var(--body)" }}>
              Step 1: hand each contract over (one transaction each). Step 2: schedule the timelock to accept. Step 3: after 48
              hours, execute it below. Until then the owner wallet stays in control.
            </p>
            {isOwner && allPending && !acceptScheduled && (
              <button type="button" className="btn btn-dark btn-block" disabled={busy} onClick={scheduleAccept}>
                Schedule the timelock to accept ({toAccept.length})
              </button>
            )}
          </>
        )}
      </section>

      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>2. Scheduled changes</h2>
        {!ops && <p className="note">Loading…</p>}
        {ops?.length === 0 && <p style={{ margin: 0, color: "var(--muted)" }}>Nothing scheduled yet.</p>}
        {ops?.map((op) => (
          <div key={op.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12, display: "grid", gap: 6 }}>
            {op.lines.map((l, i) => (
              <span key={i} style={{ fontSize: 14 }}>
                {l}
              </span>
            ))}
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {op.state === "pending" && `Can run from ${fmtWhen(op.readyAt)}`}
              {op.state === "ready" && "Ready to execute"}
              {op.state === "done" && "Done"}
              {op.state === "cancelled" && "Cancelled"}
            </span>
            {(op.state === "ready" || (op.state === "pending" && isOwner)) && (
              <div style={{ display: "flex", gap: 8 }}>
                {op.state === "ready" && address && (
                  <button type="button" className="btn btn-dark" disabled={busy} onClick={() => execute(op)}>
                    Execute
                  </button>
                )}
                {isOwner && (
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => cancel(op)}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {isOwner && allPending && (
        <section className="panel" style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>3. Propose a change</h2>
          {!allTimelocked && (
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)" }}>
              You can schedule now. Execute the ownership hand-over first, then this change; until then it will not run.
            </p>
          )}
          <select className="input" value={action} onChange={(e) => { setAction(e.target.value as Action); setV1(""); setV2(""); setV3(""); }}>
            {Object.entries(actions).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          {(action === "lockFee" || action === "vestingFee" || action === "dropFee") && (
            <input className="input" inputMode="decimal" placeholder="New fee in HYPE, e.g. 0.1" value={v1} onChange={(e) => setV1(e.target.value)} />
          )}
          {action === "feeRecipient" && <input className="input" placeholder="0x… new fee recipient" value={v1} onChange={(e) => setV1(e.target.value)} />}
          {action === "discount" && (
            <>
              <input className="input" placeholder="0x… token holders must hold" value={v1} onChange={(e) => setV1(e.target.value)} />
              <input className="input" inputMode="decimal" placeholder="Minimum balance (tokens, 18 decimals)" value={v2} onChange={(e) => setV2(e.target.value)} />
              <input className="input" inputMode="decimal" placeholder="Discount % (0–100)" value={v3} onChange={(e) => setV3(e.target.value)} />
            </>
          )}
          {action === "dex" && (
            <>
              <input className="input" placeholder="0x… DEX factory" value={v1} onChange={(e) => setV1(e.target.value)} />
              <input className="input" placeholder="DEX name" value={v2} onChange={(e) => setV2(e.target.value)} />
              <select className="input" value={v3 || "on"} onChange={(e) => setV3(e.target.value)}>
                <option value="on">Active</option>
                <option value="off">Disabled</option>
              </select>
            </>
          )}
          <button type="button" className="btn btn-dark btn-block" disabled={!proposal || busy} onClick={propose}>
            Schedule (runs in 48 hours)
          </button>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Fees still cannot go above their hard caps, whatever is scheduled.</p>
        </section>
      )}

      <VaultPanel isOwner={isOwner} />

      {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
    </div>
  );
}

const vaultAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "unpause", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

/** Instant Refuel vault: stays with the owner wallet (not the timelock), so changes here apply at once. */
function VaultPanel({ isOwner }: { isOwner: boolean }) {
  const vault = contracts.refuelVault;
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { state, run } = useChainTx(cid);
  const bal = useBalance({ chainId: cid, address: vault, query: { enabled: !!vault, refetchInterval: 30_000 } });
  const reads = useReadContracts({
    contracts: vault
      ? [
          { chainId: cid, address: vault, abi: vaultAbi, functionName: "owner" } as const,
          { chainId: cid, address: vault, abi: vaultAbi, functionName: "paused" } as const,
        ]
      : [],
    query: { enabled: !!vault },
  });
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  if (!vault) return null;

  const owner = reads.data?.[0]?.result as Address | undefined;
  const paused = reads.data?.[1]?.result as boolean | undefined;
  const canAct = isOwner && same(address, owner);
  const busy = state.status === "pending";
  const balance = bal.data?.value;
  let wei: bigint | undefined;
  try {
    wei = amount ? parseEther(amount) : undefined;
  } catch {
    wei = undefined;
  }
  const valid = isAddress(to) && wei !== undefined && wei > 0n && (balance === undefined || wei <= balance);
  const refresh = () => {
    bal.refetch();
    reads.refetch();
  };

  const withdraw = async () => {
    if (!valid || wei === undefined) return;
    const r = await run(`Withdraw ${amount} HYPE`, () => writeContractAsync({ chainId: cid, address: vault, abi: vaultAbi, functionName: "withdraw", args: [to as Address, wei] }));
    if (r) {
      setAmount("");
      refresh();
    }
  };
  const toggle = async () => {
    const r = await run(paused ? "Resume Instant Refuel" : "Pause Instant Refuel", () =>
      writeContractAsync({ chainId: cid, address: vault, abi: vaultAbi, functionName: paused ? "unpause" : "pause" }),
    );
    if (r) refresh();
  };

  return (
    <section className="panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 20 }}>Refuel vault</h2>
      <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
        Pays out Instant Refuel on Elysium. It stays with the owner wallet, not the timelock, so these act at once. With an empty or paused vault,
        refuels wait until it is topped up or resumed.
      </p>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Balance</div>
          <div style={{ fontSize: 28 }}>{balance === undefined ? "…" : `${Number(formatEther(balance)).toLocaleString("en-US", { maximumFractionDigits: 4 })} HYPE`}</div>
        </div>
        <div>
          <div className="eyebrow">Status</div>
          <div style={{ fontSize: 28 }}>{paused === undefined ? "…" : paused ? "Paused" : "Running"}</div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 14 }}>
        Top up by sending HYPE on Elysium to <code style={{ overflowWrap: "anywhere" }}>{vault}</code>.
      </p>
      {canAct ? (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            <input className="input" placeholder="Send to (0x…)" value={to} onChange={(e) => setTo(e.target.value.trim())} />
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" inputMode="decimal" placeholder="Amount in HYPE" value={amount} onChange={(e) => setAmount(e.target.value.trim())} style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" disabled={balance === undefined} onClick={() => balance !== undefined && setAmount(formatEther(balance))}>
                Max
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-dark" disabled={!valid || busy} onClick={withdraw}>
                Withdraw
              </button>
              <button type="button" className="btn btn-ghost" disabled={paused === undefined || busy} onClick={toggle}>
                {paused ? "Resume refuels" : "Pause refuels"}
              </button>
            </div>
          </div>
          {state.message && <p className={state.status === "error" ? "error" : state.status === "success" ? "ok" : "note"}>{state.message}</p>}
        </>
      ) : (
        <p className="note" style={{ margin: 0 }}>Connect the owner wallet to withdraw or pause.</p>
      )}
    </section>
  );
}
