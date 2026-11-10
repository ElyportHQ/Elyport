import "server-only";
import { formatEther, keccak256, toHex, type Address } from "viem";
import { elysiumPublic, MULTICALL3, sourcePublic } from "./chainClients";
import { contracts, explorerAddress, sourceChains } from "./config";
import { depositContracts, retiredContracts, roles } from "./docs";
import { statusAbi } from "./statusAbi";
import { readOperations, type Operation } from "./timelock";

export type Row = { label: string; value: string; ok?: boolean };
export type ContractCard = { name: string; tag?: string; chain: string; address: Address; href: string; rows: Row[]; ok?: boolean; error?: string };

const V3 = {
  locker: "0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b",
  vesting: "0x33e318a397699A1d55b008089D0d4F11A959c855",
  drop: "0xF7633D1033020314BCb5AfDC7864b50f30B493D0",
  vault: "0x259EB6eD99225907cB839C73FD2556CF6cBd9456",
} as const;

const ethBalanceAbi = [
  { type: "function", name: "getEthBalance", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

type Call = { address: Address; fn: string; args?: readonly unknown[] } | { balance: Address };
type Client = ReturnType<typeof elysiumPublic>;

/** One multicall for a list of reads; failed reads come back undefined. */
async function readAll(client: Client, calls: Call[]): Promise<unknown[]> {
  const res = await client.multicall({
    contracts: calls.map((c) =>
      "balance" in c
        ? { address: MULTICALL3, abi: ethBalanceAbi, functionName: "getEthBalance" as const, args: [c.balance] as const }
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ({ address: c.address, abi: statusAbi, functionName: c.fn, args: c.args } as any),
    ),
    allowFailure: true,
    multicallAddress: MULTICALL3,
  });
  return res.map((r) => (r.status === "success" ? r.result : undefined));
}

const same = (a: unknown, b: string) => typeof a === "string" && a.toLowerCase() === b.toLowerCase();
const short = (a: unknown) => (typeof a === "string" ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const hype = (v: unknown, sym = "HYPE") => (typeof v === "bigint" ? `${trim(formatEther(v))} ${sym}` : "—");
const num = (v: unknown) => (typeof v === "bigint" ? v.toLocaleString("en-US") : "—");
function trim(s: string) {
  const [i, d = ""] = s.split(".");
  const dd = d.slice(0, 4).replace(/0+$/, "");
  return dd ? `${i}.${dd}` : i;
}
const roleRow = (label: string, v: unknown, expect: string, name: string): Row => ({
  label,
  value: v === undefined ? "—" : same(v, expect) ? `${name} ${short(v)}` : `Unexpected ${short(v)}`,
  ok: v === undefined ? undefined : same(v, expect),
});
/** Owner of a timelocked contract: the timelock is the goal; the owner wallet is shown as "no delay". */
const ownerRow = (v: unknown, pending: unknown, timelock: Address): Row => {
  if (v === undefined) return { label: "Owner", value: "—" };
  if (same(v, timelock)) return { label: "Owner", value: `48h timelock ${short(v)}`, ok: true };
  if (same(v, roles.owner))
    return { label: "Owner", value: same(pending, timelock) ? "Owner wallet → timelock (pending)" : `Owner wallet ${short(v)}, no delay` };
  return { label: "Owner", value: `Unexpected ${short(v)}`, ok: false };
};
const feeRow = (label: string, fee: unknown, cap: unknown): Row => ({
  label,
  value: `${hype(fee)} (hard cap ${hype(cap)})`,
  ok: typeof fee === "bigint" && typeof cap === "bigint" ? fee <= cap : undefined,
});
const capRow = (label: string, cur: unknown, ceil: unknown): Row => ({
  label,
  value: `${hype(cur)} (ceiling ${hype(ceil)})`,
  ok: typeof cur === "bigint" && typeof ceil === "bigint" ? cur <= ceil : undefined,
});
const finish = (c: ContractCard): ContractCard => ({ ...c, ok: c.error ? undefined : c.rows.every((r) => r.ok !== false) });

async function currentElysium(): Promise<ContractCard[]> {
  const L = (contracts.locker ?? V3.locker) as Address;
  const Vs = (contracts.vesting ?? V3.vesting) as Address;
  const D = (contracts.drop ?? V3.drop) as Address;
  const R = (contracts.refuelVault ?? V3.vault) as Address;
  const P = contracts.lpCheck as Address;
  const T = contracts.timelock as Address;
  const PROPOSER = keccak256(toHex("PROPOSER_ROLE"));
  const relayer = roles.relayer as Address;
  const calls: Call[] = [
    { address: L, fn: "owner" }, { address: L, fn: "feeRecipient" }, { address: L, fn: "lockFee" }, { address: L, fn: "MAX_LOCK_FEE" }, { address: L, fn: "lockCount" }, { address: L, fn: "discountBps" },
    { address: Vs, fn: "owner" }, { address: Vs, fn: "feeRecipient" }, { address: Vs, fn: "vestingFee" }, { address: Vs, fn: "MAX_VESTING_FEE" }, { address: Vs, fn: "scheduleCount" }, { address: Vs, fn: "discountBps" },
    { address: D, fn: "owner" }, { address: D, fn: "feeRecipient" }, { address: D, fn: "dropFee" }, { address: D, fn: "MAX_DROP_FEE" }, { address: D, fn: "NATIVE_SEND_GAS" }, { address: D, fn: "discountBps" },
    { address: R, fn: "owner" }, { address: R, fn: "paused" }, { address: R, fn: "isRelayer", args: [relayer] }, { balance: R },
    { address: R, fn: "maxPerTx" }, { address: R, fn: "CEILING_PER_TX" }, { address: R, fn: "maxPerWalletPerDay" }, { address: R, fn: "CEILING_PER_WALLET_PER_DAY" }, { address: R, fn: "maxPerDay" }, { address: R, fn: "CEILING_PER_DAY" },
    { address: P, fn: "owner" }, { address: P, fn: "locker" }, { address: P, fn: "factories" },
    { address: L, fn: "pendingOwner" }, { address: Vs, fn: "pendingOwner" }, { address: D, fn: "pendingOwner" }, { address: P, fn: "pendingOwner" },
    { address: T, fn: "getMinDelay" }, { address: T, fn: "hasRole", args: [PROPOSER, roles.owner] },
  ];
  const r = await readAll(elysiumPublic(), calls);
  const disc = (v: unknown): Row => ({ label: "Holder discount", value: typeof v === "number" || typeof v === "bigint" ? (Number(v) ? `${Number(v) / 100}%` : "Off") : "—" });
  const card = (name: string, address: Address, rows: Row[]) => finish({ name, tag: "v3", chain: "Elysium", address, href: explorerAddress(address), rows });
  return [
    card("Locker", L, [ownerRow(r[0], r[31], T), roleRow("Fees go to", r[1], roles.treasury, "Treasury"), feeRow("Lock fee", r[2], r[3]), disc(r[5]), { label: "Locks created", value: num(r[4]) }]),
    card("Vesting", Vs, [ownerRow(r[6], r[32], T), roleRow("Fees go to", r[7], roles.treasury, "Treasury"), feeRow("Vesting fee", r[8], r[9]), disc(r[11]), { label: "Schedules created", value: num(r[10]) }]),
    card("Gas Drop", D, [ownerRow(r[12], r[33], T), roleRow("Fees go to", r[13], roles.treasury, "Treasury"), feeRow("Drop fee", r[14], r[15]), disc(r[17]), { label: "Gas per native send", value: num(r[16]) }]),
    card("Refuel vault", R, [
      roleRow("Owner", r[18], roles.owner, "Owner"),
      { label: "Relayer allowed", value: r[20] === undefined ? "—" : r[20] ? `Yes ${short(relayer)}` : "No", ok: r[20] === undefined ? undefined : r[20] === true },
      { label: "State", value: r[19] === undefined ? "—" : r[19] ? "Paused" : "Active" },
      { label: "HYPE in vault", value: hype(r[21]) },
      capRow("Max per refuel", r[22], r[23]),
      capRow("Max per wallet / day", r[24], r[25]),
      capRow("Max per day (all)", r[26], r[27]),
    ]),
    card("LP checker", P, [
      ownerRow(r[28], r[34], T),
      { label: "Checks locks of", value: same(r[29], L) ? `Locker ${short(L)}` : `Unexpected ${short(r[29])}`, ok: r[29] === undefined ? undefined : same(r[29], L) },
      { label: "DEX factories", value: Array.isArray(r[30]) ? String(r[30].length) : "—" },
    ]),
    card("Timelock", T, [
      { label: "Delay", value: typeof r[35] === "bigint" ? `${Number(r[35]) / 3600} hours` : "—", ok: typeof r[35] === "bigint" ? r[35] >= 172800n : undefined },
      { label: "Can schedule", value: r[36] === undefined ? "—" : r[36] ? `Owner wallet ${short(roles.owner)}` : "Owner missing", ok: r[36] === undefined ? undefined : r[36] === true },
      { label: "Can execute", value: "Anyone, after the delay" },
    ]),
  ];
}

async function depositCard(chainId: number, chain: string, address: Address, href: string): Promise<ContractCard> {
  const src = sourceChains.find((s) => s.id === chainId);
  const sym = src?.native ?? "ETH";
  try {
    const calls: Call[] = [
      { address, fn: "owner" }, { address, fn: "paused" }, { address, fn: "isRelayer", args: [roles.relayer] }, { address, fn: "depositCount" },
      { address, fn: "reserved", args: ["0x0000000000000000000000000000000000000000"] }, { balance: address },
    ];
    if (src?.usdc) calls.push({ address, fn: "reserved", args: [src.usdc] });
    const r = await readAll(sourcePublic(chainId), calls);
    const rows: Row[] = [
      roleRow("Owner", r[0], roles.owner, "Owner"),
      { label: "Relayer allowed", value: r[2] === undefined ? "—" : r[2] ? "Yes" : "No", ok: r[2] === undefined ? undefined : r[2] === true },
      { label: "State", value: r[1] === undefined ? "—" : r[1] ? "Paused" : "Active" },
      { label: "Deposits", value: num(r[3]) },
      {
        label: `Held vs owed (${sym})`,
        value: `${hype(r[5], sym)} / ${hype(r[4], sym)}`,
        ok: typeof r[5] === "bigint" && typeof r[4] === "bigint" ? r[5] >= r[4] : undefined,
      },
    ];
    if (src?.usdc) rows.push({ label: "Owed in USDC", value: typeof r[6] === "bigint" ? `${(Number(r[6]) / 1e6).toLocaleString("en-US")} USDC` : "—" });
    return finish({ name: "Refuel deposit", tag: "v3", chain, address, href, rows });
  } catch (e) {
    return { name: "Refuel deposit", tag: "v3", chain, address, href, rows: [], error: (e as Error).message?.slice(0, 120) || "unreachable" };
  }
}

const usageFn: Record<string, string | undefined> = { locker: "lockCount", vesting: "scheduleCount", drop: undefined, vault: undefined };

/** Retired contracts: every count and balance should read zero, proving they were never used. */
async function retired(): Promise<ContractCard[]> {
  const list = retiredContracts.elysium;
  const calls: Call[] = list.flatMap((c) => {
    const fn = usageFn[c.kind];
    return [...(fn ? [{ address: c.address as Address, fn }] : []), { balance: c.address as Address }];
  });
  let r: unknown[] = [];
  let err: string | undefined;
  try {
    r = await readAll(elysiumPublic(), calls);
  } catch (e) {
    err = (e as Error).message?.slice(0, 120);
  }
  let i = 0;
  const ely = list.map((c) => {
    const fn = usageFn[c.kind];
    const rows: Row[] = [];
    if (fn) {
      const v = r[i++];
      rows.push({ label: c.kind === "locker" ? "Locks ever created" : "Schedules ever created", value: num(v), ok: typeof v === "bigint" ? v === 0n : undefined });
    }
    const b = r[i++];
    rows.push({ label: "Funds held", value: hype(b), ok: typeof b === "bigint" ? b === 0n : undefined });
    if (c.kind === "drop") rows.push({ label: "Note", value: "Gas Drop never holds funds between transactions" });
    return finish({ name: c.name, tag: c.version, chain: "Elysium", address: c.address as Address, href: explorerAddress(c.address), rows, error: err });
  });

  const deps = await Promise.all(
    retiredContracts.deposits.map(async (c) => {
      const src = sourceChains.find((s) => s.id === c.chainId);
      const explorer = depositContracts.find((d) => d.chainId === c.chainId)?.explorer ?? "";
      try {
        const [n, b] = await readAll(sourcePublic(c.chainId), [{ address: c.address as Address, fn: "depositCount" }, { balance: c.address as Address }]);
        return finish({
          name: "Refuel deposit",
          tag: "v1–v2",
          chain: c.chain,
          address: c.address as Address,
          href: explorer + c.address,
          rows: [
            { label: "Deposits ever made", value: num(n), ok: typeof n === "bigint" ? n === 0n : undefined },
            { label: "Funds held", value: hype(b, src?.native ?? "ETH"), ok: typeof b === "bigint" ? b === 0n : undefined },
          ],
        });
      } catch (e) {
        return { name: "Refuel deposit", tag: "v1–v2", chain: c.chain, address: c.address as Address, href: explorer + c.address, rows: [], error: (e as Error).message?.slice(0, 120) };
      }
    }),
  );
  return [...ely, ...deps];
}

export type StatusReport = { checkedAt: string; current: ContractCard[]; deposits: ContractCard[]; retired: ContractCard[]; operations?: Operation[] };

export async function getStatus(): Promise<StatusReport> {
  const [current, deposits, old, operations] = await Promise.all([
    currentElysium().catch((e) => [{ name: "Elysium contracts", chain: "Elysium", address: V3.locker as Address, href: "", rows: [], error: (e as Error).message?.slice(0, 120) }]),
    Promise.all(depositContracts.map((d) => depositCard(d.chainId, d.chain, d.address as Address, d.explorer + d.address))),
    retired(),
    readOperations(elysiumPublic()).catch(() => undefined),
  ]);
  return { checkedAt: new Date().toISOString(), current, deposits, retired: old, operations };
}
