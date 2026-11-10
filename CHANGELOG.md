# Changelog

## Unreleased

### New
- **Manage from the page**: lock owners can extend, top up, transfer and withdraw from the lock page; vesting creators
  can cancel cancellable schedules and recipients can move a schedule to a new wallet.
- **Widgets**: a claim widget and a live lock widget for any website, via `embed.js` or a plain iframe, with light and
  dark themes and a custom accent color. Only `/embed/*` can be framed.
- **Public API** at `/api/v1`: token, lock, vesting, wallet and stats endpoints. Read-only, no key, open CORS.
- **SDK** in `sdk/` (`@elyport/sdk`): locks, tranche locks, vesting, gas drops and an API client, built on viem.

## v1.2.0 — Claim pages, tranche locks and holder discounts (2026-11-10)

### New
- **Claim page** at `elyport.com/claim/<token>`: one link a project shares so recipients can connect and claim,
  with project-wide vesting progress and a share card.
- **Tranche locks**: lock one token in up to 20 tranches with different unlock dates in a single transaction
  (presets for quarterly, monthly and 6-month).
- **Holder discount**: the owner can give holders of a chosen token a discount on every fee. The app shows the
  discounted fee per wallet.
- **Explore**: search by name, symbol or address; filters for LP, tokens, unlocking in 7 days and active locks;
  sort by newest or unlocking soon; LP pairs labelled by their tokens.
- **New docs**: 15 pages in five groups with a sidebar, an on-this-page outline, a mobile reader with a contents
  sheet and reading progress, and previous / next links. Terms, Privacy and Risks use the same layout.

### Contracts (v2, Elysium)
| Contract | Address |
| --- | --- |
| ElyportLocker | `0x7868e66c72df8dd0827f93e3674e53f72f8939cc` |
| ElyportVesting | `0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e` |
| ElyportDrop | `0x7ba7b360771b23277991f29488afe8827d2bce33` |

The v1 Locker, Vesting and Drop were never used and are retired. Refuel contracts are unchanged. 52 tests pass.

## v1.1.0 — Dashboard, token safety and lock badge (2026-11-10)

### New
- **My Elyport** (`/me`): vesting that pays you with **Claim** and **Claim all**, your locks with **Withdraw**,
  schedules you created, and every Gas Drop you sent.
- **Next release and reminders**: vesting pages show when the next tokens unlock and how many, with a
  one-tap calendar reminder.
- **Token safety**: liquidity locked as a share of each LP pair, tokens locked and still vesting as a share of
  supply, and a supply breakdown bar.
- **Lock badge** at `elyport.com/badge/<token>`: a live "Liquidity locked 92% · until Mar 2027" badge with
  copy-paste HTML and Markdown on the token page.

### Improved
- Home shows Elyport at a glance: 7 chains, 10 verified contracts, 500 wallets per drop.
- Launch app opens Gas Drop. Refuel marks Instant as opening soon.
- LP locks on token pages are shown in LP units.
- GitHub and X links across the app. Fonts are self-hosted.

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
