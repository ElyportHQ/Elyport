import { encodeAbiParameters, formatUnits, keccak256, type Address } from "viem";

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function fmtAmount(value: bigint | undefined, decimals = 18, max = 4): string {
  if (value === undefined) return "—";
  const n = Number(formatUnits(value, decimals));
  if (n === 0) return "0";
  if (n < 10 ** -max) return `<${10 ** -max}`;
  return n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : max });
}

export function fmtDate(ts: bigint | number | undefined): string {
  if (ts === undefined) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function countdown(unlockAt: bigint | number, now = Date.now() / 1000): string {
  let s = Math.max(0, Math.floor(Number(unlockAt) - now));
  if (s === 0) return "Unlocked";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  return `${d}d ${h}h ${m}m`;
}

/** Same key the relayer and the vault use: keccak256(abi.encode(chainId, depositContract, id)). */
export type DepositContent = { sender: Address; recipient: Address; token: Address; amount: bigint; minOut: bigint };

/**
 * Key the vault uses to pay a deposit once. It covers the deposit's contents, not only its id, so if a
 * source chain reorgs and a different deposit lands under the same id, it gets a different key.
 */
export function depositKey(chainId: number, depositContract: Address, id: bigint, d: DepositContent) {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [BigInt(chainId), depositContract, id, d.sender, d.recipient, d.token, d.amount, d.minOut],
    ),
  );
}

export type Recipient = { address: Address; amount: string };

/** Parses "address,amount" lines (comma, space or tab separated). */
export function parseRecipients(text: string, sameAmount?: string) {
  const valid: Recipient[] = [];
  const invalid: string[] = [];
  let duplicates = 0;
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [addr, amt] = line.split(/[\s,;\t]+/);
    const amount = sameAmount && sameAmount.trim() !== "" ? sameAmount.trim() : amt;
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr ?? "") || !amount || !/^\d*\.?\d+$/.test(amount)) {
      invalid.push(line);
      continue;
    }
    const key = addr.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    valid.push({ address: addr as Address, amount });
  }
  return { valid, invalid, duplicates };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
