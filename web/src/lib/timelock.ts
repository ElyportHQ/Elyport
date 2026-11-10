import { decodeFunctionData, formatEther, parseAbi, parseAbiItem, type Address, type Hex, type PublicClient } from "viem";
import { contracts, timelockBlock } from "./config";

export const TIMELOCK_DELAY = 48 * 3600;
export const ACCEPT_SALT = "0x656c79706f72742d6163636570742d6f776e6572736869702d76310000000000" as Hex; // "elyport-accept-ownership-v1"

export const timelockAbi = parseAbi([
  "function getMinDelay() view returns (uint256)",
  "function getTimestamp(bytes32 id) view returns (uint256)",
  "function hashOperationBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt) pure returns (bytes32)",
  "function scheduleBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt, uint256 delay)",
  "function executeBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt) payable",
  "function cancel(bytes32 id)",
]);

/** Every owner function the timelock can be asked to call. */
export const ownedAbi = parseAbi([
  "function owner() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function acceptOwnership()",
  "function setLockFee(uint256 fee)",
  "function setVestingFee(uint256 fee)",
  "function setDropFee(uint256 fee)",
  "function setFeeRecipient(address newFeeRecipient)",
  "function setDiscount(address token, uint256 minBalance, uint16 bps)",
  "function setDex(address factory, string name, bool active)",
]);

const scheduledEvent = parseAbiItem(
  "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",
);
const saltEvent = parseAbiItem("event CallSalt(bytes32 indexed id, bytes32 salt)");

/** Contracts the timelock owns (or will own once the hand-over finishes). */
export const timelocked = () =>
  [
    { name: "Locker", address: contracts.locker },
    { name: "Vesting", address: contracts.vesting },
    { name: "Gas Drop", address: contracts.drop },
    { name: "LP checker", address: contracts.lpCheck },
  ].filter((c): c is { name: string; address: Address } => !!c.address);

export function contractName(a: Address) {
  return timelocked().find((c) => c.address.toLowerCase() === a.toLowerCase())?.name ?? `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Plain-English line for one call. */
export function describeCall(target: Address, data: Hex): string {
  const where = contractName(target);
  try {
    const { functionName, args } = decodeFunctionData({ abi: ownedAbi, data });
    const a = (args ?? []) as readonly unknown[];
    switch (functionName) {
      case "acceptOwnership":
        return `${where}: timelock takes ownership`;
      case "setLockFee":
      case "setVestingFee":
      case "setDropFee":
        return `${where}: fee becomes ${formatEther(a[0] as bigint)} HYPE`;
      case "setFeeRecipient":
        return `${where}: fees go to ${a[0]}`;
      case "setDiscount":
        return `${where}: holder discount ${Number(a[2]) / 100}% for holders of ${a[1]} wei of ${a[0]}`;
      case "setDex":
        return `${where}: ${a[2] ? "add" : "disable"} DEX "${a[1]}" (factory ${a[0]})`;
      case "transferOwnership":
        return `${where}: ownership moves to ${a[0]}`;
      default:
        return `${where}: ${functionName}`;
    }
  } catch {
    return `${where}: unknown call ${data.slice(0, 10)}`;
  }
}

export type Operation = {
  id: Hex;
  targets: Address[];
  values: bigint[];
  payloads: Hex[];
  predecessor: Hex;
  salt: Hex;
  readyAt: number; // unix seconds; 0 = cancelled, 1 = done
  state: "pending" | "ready" | "done" | "cancelled";
  lines: string[];
};

/** All operations ever scheduled on the timelock, newest first, with their current state. */
export async function readOperations(client: PublicClient): Promise<Operation[]> {
  const timelock = contracts.timelock as Address;
  const latest = await client.getBlockNumber();
  const CHUNK = 50_000n;
  const calls: { id: Hex; index: bigint; target: Address; value: bigint; data: Hex; predecessor: Hex }[] = [];
  const salts = new Map<Hex, Hex>();
  for (let from = timelockBlock; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    const [s, t] = await Promise.all([
      client.getLogs({ address: timelock, event: scheduledEvent, fromBlock: from, toBlock: to }),
      client.getLogs({ address: timelock, event: saltEvent, fromBlock: from, toBlock: to }),
    ]);
    for (const l of s) calls.push({ id: l.args.id!, index: l.args.index!, target: l.args.target!, value: l.args.value!, data: l.args.data!, predecessor: l.args.predecessor! });
    for (const l of t) salts.set(l.args.id!, l.args.salt!);
  }
  const byId = new Map<Hex, typeof calls>();
  for (const c of calls) byId.set(c.id, [...(byId.get(c.id) ?? []), c]);
  const ids = [...byId.keys()];
  if (!ids.length) return [];
  const stamps = await Promise.all(ids.map((id) => client.readContract({ address: timelock, abi: timelockAbi, functionName: "getTimestamp", args: [id] })));
  const now = Math.floor(Date.now() / 1000);
  return ids
    .map((id, i) => {
      const parts = byId.get(id)!.sort((a, b) => Number(a.index - b.index));
      const ts = Number(stamps[i]);
      const state: Operation["state"] = ts === 0 ? "cancelled" : ts === 1 ? "done" : ts <= now ? "ready" : "pending";
      return {
        id,
        targets: parts.map((p) => p.target),
        values: parts.map((p) => p.value),
        payloads: parts.map((p) => p.data),
        predecessor: parts[0].predecessor,
        salt: salts.get(id) ?? ("0x" + "0".repeat(64)) as Hex,
        readyAt: ts,
        state,
        lines: parts.map((p) => describeCall(p.target, p.data)),
      };
    })
    .reverse();
}
