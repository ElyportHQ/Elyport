import type { Address } from "viem";

export type ElyportAddresses = {
  locker: Address;
  vesting: Address;
  drop: Address;
  refuelVault: Address;
};

/** Elyport v3 contracts on Elysium mainnet (chain 99901). */
export const ELYPORT_ADDRESSES: ElyportAddresses = {
  locker: "0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b",
  vesting: "0x33e318a397699A1d55b008089D0d4F11A959c855",
  drop: "0xF7633D1033020314BCb5AfDC7864b50f30B493D0",
  refuelVault: "0x259EB6eD99225907cB839C73FD2556CF6cBd9456",
};

/** Instant Refuel deposit contracts on source chains, by chain id. */
export const REFUEL_DEPOSITS: Record<number, Address> = {
  1: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4",
  8453: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4",
  42161: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4",
  4663: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4",
  56: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4",
  999: "0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A",
};

/** Seconds in one vesting "month" step. */
export const MONTH = 2_592_000;
/** Limits enforced by the contracts. */
export const LIMITS = { dropRecipients: 500, tranches: 20, vestingRecipients: 100, noteLength: 280 } as const;
