import "server-only";
import { createPublicClient, http, type Chain, type PublicClient } from "viem";
import { arbitrum, base, bsc, mainnet } from "viem/chains";
import { elysium, hyperEvm, robinhoodChain } from "./config";

const chains: Record<number, Chain> = { 1: mainnet, 8453: base, 42161: arbitrum, 4663: robinhoodChain, 56: bsc, 999: hyperEvm };
const cache = new Map<number, PublicClient>();

/** Read-only client for a source chain, using RPC_URL_<chainId> when set. */
export function sourcePublic(chainId: number): PublicClient {
  const hit = cache.get(chainId);
  if (hit) return hit;
  const chain = chains[chainId];
  if (!chain) throw new Error(`Unknown chain ${chainId}`);
  const c = createPublicClient({ chain, transport: http(process.env[`RPC_URL_${chainId}`] || undefined, { timeout: 8000 }) });
  cache.set(chainId, c);
  return c;
}

const ely: { client?: PublicClient } = {};

/** Read-only Elysium client for server code. */
export function elysiumPublic(): PublicClient {
  ely.client ??= createPublicClient({ chain: elysium, transport: http(process.env.ELYSIUM_RPC_URL_SERVER || undefined, { timeout: 8000 }) });
  return ely.client;
}

export const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;
