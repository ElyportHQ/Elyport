# Changelog

## v1.0.0 — Mainnet launch (2026-11-10)

Elyport is live on Elysium mainnet (chain 99901) at [elyport.com](https://elyport.com).

### Live
- **Gas Drop**: send HYPE or any token to up to 500 wallets per transaction, from a list or CSV. Fee 0.04 HYPE per batch.
- **Locker**: lock LP or tokens until a date you set. LP pairs are verified on-chain and indexed under both
  underlying tokens. Locks can be extended or topped up, never shortened. Fee 0.133 HYPE.
- **Vesting**: cliff, then monthly or linear release, for one wallet or up to 100 per batch. Optionally
  revocable. Fee 0.133 HYPE per create.
- **Explore**: public pages and share cards for every lock, schedule and token.

### Ready, switching on soon
- **Instant Refuel** from Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain and HyperEVM.
  Until it opens, Refuel guides users through a bridge.

### Contracts
| Contract | Chain | Address |
| --- | --- | --- |
| ElyportLocker | Elysium | `0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39` |
| ElyportVesting | Elysium | `0xb5cedd59dd57d9145ff6d5fca3fb171304f055f7` |
| ElyportDrop | Elysium | `0x9e5dc700de34a441e1d0b74fc88d1b1f666ff9b4` |
| ElyportRefuelVault | Elysium | `0xa43e860ec638b039cb926e98590852c2fdcbcf65` |
| ElyportRefuelDeposit | Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain | `0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39` |
| ElyportRefuelDeposit | HyperEVM | `0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e` |

All sources are verified (Elysium explorer and Sourcify). 41 tests pass in CI.
