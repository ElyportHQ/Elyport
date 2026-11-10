import type { Address } from "viem";

/**
 * DEX factories whose pairs count as real liquidity. A locked "LP token" only counts when its
 * pair says it comes from one of these factories AND that factory confirms the pair, so a fake
 * pair contract can't claim "liquidity locked". Extra factories: NEXT_PUBLIC_DEX_FACTORIES="Name:0x…,Name:0x…".
 */
const BUILT_IN: { name: string; factory: Address }[] = [
  // Uniswap V2 on Elysium (matches Uniswap's sdk-core ELYSIUM V2_FACTORY_ADDRESSES).
  { name: "Uniswap V2", factory: "0xBbBcC62853a5fA27b93d6Bab3E6F7ce841E25Df2" },
];

const EXTRA = (process.env.NEXT_PUBLIC_DEX_FACTORIES ?? "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean)
  .flatMap((x) => {
    const [name, addr] = x.includes(":") ? x.split(":") : ["DEX", x];
    return /^0x[0-9a-fA-F]{40}$/.test(addr ?? "") ? [{ name: name.trim(), factory: addr.trim() as Address }] : [];
  });

export const DEX_FACTORIES = [...BUILT_IN, ...EXTRA];

export const dexFor = (factory?: string) => DEX_FACTORIES.find((d) => d.factory.toLowerCase() === factory?.toLowerCase());

export const pairCheckAbi = [
  { type: "function", name: "factory", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const factoryAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [
      { name: "a", type: "address" },
      { name: "b", type: "address" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

export type PairCheck = { verified: boolean; dex?: string; token0?: Address; token1?: Address };
