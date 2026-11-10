import { defineChain, type Address } from "viem";
import { arbitrum, base, bsc, mainnet } from "viem/chains";

const env = (v: string | undefined, fallback = "") => (v && v.trim() !== "" ? v.trim() : fallback);

const asAddress = (v: string | undefined): Address | undefined =>
  v && /^0x[0-9a-fA-F]{40}$/.test(v.trim()) ? (v.trim() as Address) : undefined;

const multicall3 = asAddress(process.env.NEXT_PUBLIC_ELYSIUM_MULTICALL3) ?? "0xcA11bde05977b3631167028862bE2a173976CA11";

/** Elysium mainnet (chain 99901) by default; every value can be overridden from env. */
export const elysium = defineChain({
  id: Number(env(process.env.NEXT_PUBLIC_ELYSIUM_CHAIN_ID, "99901")),
  name: env(process.env.NEXT_PUBLIC_ELYSIUM_NAME, "Elysium"),
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: [env(process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL, "https://rpc.elysium.kinetiq.xyz")] },
  },
  blockExplorers: {
    default: {
      name: "Elysium Explorer",
      url: env(process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_URL, "https://elysium.kinetiq.xyz/explorer"),
    },
  },
  contracts: { multicall3: { address: multicall3 } },
});

export const hyperEvm = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } },
  blockExplorers: { default: { name: "HyperEVMScan", url: "https://hyperevmscan.io" } },
});

/** Robinhood Chain: Arbitrum Orbit L2 with ETH gas, live since July 2026. */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" } },
});

export const contracts = {
  locker: asAddress(process.env.NEXT_PUBLIC_LOCKER_ADDRESS),
  vesting: asAddress(process.env.NEXT_PUBLIC_VESTING_ADDRESS),
  drop: asAddress(process.env.NEXT_PUBLIC_DROP_ADDRESS),
  refuelVault: asAddress(process.env.NEXT_PUBLIC_REFUEL_VAULT_ADDRESS),
  lpCheck: asAddress(process.env.NEXT_PUBLIC_LP_CHECK_ADDRESS) ?? ("0xB672a7D0d3CeA82525fB0a6128fE0a31d0858AC3" as Address),
};

export const deployBlock = BigInt(env(process.env.NEXT_PUBLIC_DEPLOY_BLOCK, "0"));

// Reown project IDs are public (they ship to every browser); the env var can override this one.
export const reownProjectId = env(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID, "ad50cb8494cbdb5f848d883ed7b470b5");
const vercelProd = env(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL);
/** Public site URL: the env override, else the Vercel production domain, else elyport.com. */
export const siteUrl = env(process.env.NEXT_PUBLIC_SITE_URL, vercelProd ? `https://${vercelProd}` : "https://elyport.com").replace(/\/$/, "");

export type SourceChain = {
  id: number;
  name: string;
  native: string;
  coingeckoId: string;
  usdc?: Address;
  deposit?: Address;
};

/** Chains users can pay from. Solana is served through the Route option (third-party bridge). */
export const sourceChains: SourceChain[] = [
  {
    id: mainnet.id,
    name: "Ethereum",
    native: "ETH",
    coingeckoId: "ethereum",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_1),
  },
  {
    id: base.id,
    name: "Base",
    native: "ETH",
    coingeckoId: "ethereum",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_8453),
  },
  {
    id: arbitrum.id,
    name: "Arbitrum",
    native: "ETH",
    coingeckoId: "ethereum",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_42161),
  },
  {
    id: robinhoodChain.id,
    name: "Robinhood",
    native: "ETH",
    coingeckoId: "ethereum",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_4663),
  },
  {
    id: bsc.id,
    name: "BNB Chain",
    native: "BNB",
    coingeckoId: "binancecoin",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_56),
  },
  {
    id: hyperEvm.id,
    name: "HyperEVM",
    native: "HYPE",
    coingeckoId: "hyperliquid",
    deposit: asAddress(process.env.NEXT_PUBLIC_REFUEL_DEPOSIT_999),
  },
];

export const githubUrl = "https://github.com/ElyportHQ/Elyport";
export const xUrl = "https://x.com/ElyportHQ";

export const REFUEL_FEE_BPS = 50; // 0.5%
export const REFUEL_PRESETS_USD = [1, 3, 5, 10];
export const REFUEL_MAX_USD = 10;

const txPath = env(process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_TX_PATH, "/tx/");
const addressPath = env(process.env.NEXT_PUBLIC_ELYSIUM_EXPLORER_ADDRESS_PATH, "/address/");
export const explorerTx = (hash: string) => `${elysium.blockExplorers.default.url}${txPath}${hash}`;
export const explorerAddress = (a: string) => `${elysium.blockExplorers.default.url}${addressPath}${a}`;
