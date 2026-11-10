import type { Address } from "viem";

export type ElyportAddresses = {
  locker: Address;
  vesting: Address;
  drop: Address;
  refuelVault: Address;
};

/** Elyport v2 contracts on Elysium mainnet (chain 99901). */
export const ELYPORT_ADDRESSES: ElyportAddresses = {
  locker: "0x7868e66c72df8dd0827f93e3674e53f72f8939cc",
  vesting: "0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e",
  drop: "0x7ba7b360771b23277991f29488afe8827d2bce33",
  refuelVault: "0xa43e860ec638b039cb926e98590852c2fdcbcf65",
};

/** Instant Refuel deposit contracts on source chains, by chain id. */
export const REFUEL_DEPOSITS: Record<number, Address> = {
  1: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39",
  8453: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39",
  42161: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39",
  4663: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39",
  56: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39",
  999: "0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e",
};

/** Seconds in one vesting "month" step. */
export const MONTH = 2_592_000;
/** Limits enforced by the contracts. */
export const LIMITS = { dropRecipients: 500, tranches: 20, vestingRecipients: 100, noteLength: 280 } as const;
