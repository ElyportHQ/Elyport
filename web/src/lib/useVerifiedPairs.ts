"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Address } from "viem";
import { elysium } from "./config";
import { dexFor, factoryAbi, pairCheckAbi, type PairCheck } from "./pairs";

const cid = elysium.id;

/** Checks LP pairs against known DEX factories. Returns lower-cased pair → result. */
export function useVerifiedPairs(pairs: Address[]): { map: Map<string, PairCheck>; loading: boolean } {
  const first = useReadContracts({
    contracts: pairs.flatMap((p) => [
      { chainId: cid, address: p, abi: pairCheckAbi, functionName: "factory" as const },
      { chainId: cid, address: p, abi: pairCheckAbi, functionName: "token0" as const },
      { chainId: cid, address: p, abi: pairCheckAbi, functionName: "token1" as const },
    ]),
    query: { enabled: pairs.length > 0 },
  });
  const candidates = useMemo(
    () =>
      pairs.flatMap((p, i) => {
        const f = first.data?.[i * 3]?.result as Address | undefined;
        const t0 = first.data?.[i * 3 + 1]?.result as Address | undefined;
        const t1 = first.data?.[i * 3 + 2]?.result as Address | undefined;
        return f && t0 && t1 && dexFor(f) ? [{ p, f, t0, t1 }] : [];
      }),
    [pairs, first.data],
  );
  const second = useReadContracts({
    contracts: candidates.map((c) => ({ chainId: cid, address: c.f, abi: factoryAbi, functionName: "getPair" as const, args: [c.t0, c.t1] as const })),
    query: { enabled: candidates.length > 0 },
  });
  const map = useMemo(() => {
    const m = new Map<string, PairCheck>();
    pairs.forEach((p, i) => {
      m.set(p.toLowerCase(), {
        verified: false,
        token0: first.data?.[i * 3 + 1]?.result as Address | undefined,
        token1: first.data?.[i * 3 + 2]?.result as Address | undefined,
      });
    });
    candidates.forEach((c, i) => {
      const got = second.data?.[i]?.result as Address | undefined;
      if (got && got.toLowerCase() === c.p.toLowerCase()) m.set(c.p.toLowerCase(), { verified: true, dex: dexFor(c.f)?.name, token0: c.t0, token1: c.t1 });
    });
    return m;
  }, [pairs, first.data, candidates, second.data]);
  return { map, loading: first.isLoading || second.isLoading };
}
