import { defineChain } from "viem";

/** Elysium mainnet: Kinetiq's Layer 2 for Hyperliquid, with HYPE as gas. */
export const elysium = defineChain({
  id: 99901,
  name: "Elysium",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.elysium.kinetiq.xyz"] } },
  blockExplorers: { default: { name: "Elysium Explorer", url: "https://elysium.kinetiq.xyz/explorer" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});
