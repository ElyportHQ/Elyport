import "server-only";
import type { Address } from "viem";
import type { elysiumClient } from "./og";
import { dexFor, factoryAbi, pairCheckAbi, type PairCheck } from "./pairs";

/** Server-side version of useVerifiedPairs: lower-cased pair → result. */
export async function verifyPairs(c: ReturnType<typeof elysiumClient>, pairs: Address[]): Promise<Map<string, PairCheck>> {
  const m = new Map<string, PairCheck>();
  if (pairs.length === 0) return m;
  const first = await c.multicall({
    contracts: pairs.flatMap((p) => [
      { address: p, abi: pairCheckAbi, functionName: "factory" as const },
      { address: p, abi: pairCheckAbi, functionName: "token0" as const },
      { address: p, abi: pairCheckAbi, functionName: "token1" as const },
    ]),
    allowFailure: true,
  });
  const cands = pairs.flatMap((p, i) => {
    const f = first[i * 3]?.result as Address | undefined;
    const t0 = first[i * 3 + 1]?.result as Address | undefined;
    const t1 = first[i * 3 + 2]?.result as Address | undefined;
    m.set(p.toLowerCase(), { verified: false, token0: t0, token1: t1 });
    return f && t0 && t1 && dexFor(f) ? [{ p, f, t0, t1 }] : [];
  });
  if (cands.length === 0) return m;
  const second = await c.multicall({
    contracts: cands.map((x) => ({ address: x.f, abi: factoryAbi, functionName: "getPair" as const, args: [x.t0, x.t1] as const })),
    allowFailure: true,
  });
  cands.forEach((x, i) => {
    const got = second[i]?.result as Address | undefined;
    if (got && got.toLowerCase() === x.p.toLowerCase()) m.set(x.p.toLowerCase(), { verified: true, dex: dexFor(x.f)?.name, token0: x.t0, token1: x.t1 });
  });
  return m;
}
