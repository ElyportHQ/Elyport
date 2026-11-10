export { elysium } from "./chain.js";
export { ELYPORT_ADDRESSES, REFUEL_DEPOSITS, MONTH, LIMITS, type ElyportAddresses } from "./addresses.js";
export { lockerAbi, vestingAbi, dropAbi, vaultAbi, depositAbi } from "./abis.js";
export { createElyport, type Elyport, type ElyportOptions, type Lock, type Schedule, type Recipient } from "./client.js";
export {
  createElyportApi,
  ElyportApiError,
  type ApiLock,
  type ApiSchedule,
  type ApiToken,
  type ApiWallet,
  type ApiStats,
} from "./api.js";

/** Embed URLs for a token's widgets. */
export const widgetUrls = (token: string, base = "https://elyport.com") => ({
  claim: `${base}/embed/claim/${token}`,
  lock: `${base}/embed/lock/${token}`,
  badge: `${base}/badge/${token}`,
  script: `${base}/embed.js`,
});
