# Changelog

## Unreleased

### Added
- **Refuel widget** for other dapps: `data-elyport="refuel-button"` (a "Need gas?" button that opens Refuel in a popup)
  or `data-elyport="refuel"` (inline form), with an optional `data-to` recipient. Page: `/embed/refuel?to=0x…`.
- **Gas Drop: import token holders.** Load any Elysium token's holders straight from its Transfer logs, skip contracts,
  set a minimum balance, then split the same amount each or by holdings. API: `/api/v1/holders/{token}`.
- **Instant Refuel is live**: the refuel vault is funded and deposits on Ethereum, Base, Arbitrum, Robinhood Chain,
  BNB Chain and HyperEVM are delivered as HYPE on Elysium by the relayer, within the vault's fixed caps.
- **Official $ELYPORT token, detected automatically**: once launched on Montra from the dev wallet, the contract address
  appears on the home page, `/docs/status` and `/api/v1/official`. Montra's API only suggests candidates; each one is
  verified on-chain (launch receipt from the dev wallet, TokenLaunched from Montra's factory, `creator()` and `symbol()`).

- Token pages and `/api/v1/token` recognise Montra launches (checked against the launch receipt) and show their launch
  liquidity as sealed in the Montra pool instead of "No LP locked".

### Security
- **48-hour timelock** (`ElyportTimelock`, `0x51aed68990a24D6e2712d98e7837F3d89269D06e`) becomes owner of the Locker,
  Vesting, Gas Drop and LP checker. Fee, fee recipient, discount and DEX list changes are public 48 hours ahead on
  `/docs/status`. Owner console at `/admin`.
- **Stand-alone refuel monitor** (`monitor/check-refuel.mjs`): public RPCs only, no secrets, no Elyport server; runs every
  15 minutes in GitHub Actions and anyone can run it.
- **Global rate limit** at the edge (Vercel Firewall): 60 requests/minute/IP on `/api/v1` and `/api/refuel/process`.
- **Verified LP pairs**: LP locks count as locked liquidity only when the pair comes from a known DEX factory that
  confirms it (Uniswap V2 on Elysium; more via `NEXT_PUBLIC_DEX_FACTORIES`). Others show "Unverified pair" and are left
  out of the badge, widget and API liquidity figures.
- **Relayer**: finds pending deposits by id instead of a 3,000-block log window, waits for source-chain confirmations,
  keys each deposit by its full contents (reorg-safe), honours the sender's minimum, and refunds instead of delivering
  close to the self-refund window.
- **Prices** from CoinGecko, DefiLlama and Hyperliquid, median per asset; quoting stops if sources disagree by >3%.
- **Rate limits** on `/api/refuel/process` (with per-deposit dedupe) and `/api/v1`.
- **Delivery monitor**: every 5 minutes an independent check confirms each refuel marked delivered was paid by the vault
  and each vault payout matches a deposit (`/api/refuel/monitor`, GitHub Actions fails on a mismatch).
- **Live status** page (`/docs/status`, `/status`): owner, fee recipient, fees vs hard caps, Refuel caps vs ceilings,
  deposit balances vs what they owe, and the retired v1/v2 contracts with on-chain proof they were never used.
- **On-chain LP checker** (`ElyportLPCheck`, `0xB672a7D0d3CeA82525fB0a6128fE0a31d0858AC3`): the same pair check as the
  app, callable by anyone (`checkLock(id)`, `checkPair(pair)`).

### Contracts v3 (deployed 2026-11-10)
- Hard fee caps (Locker 1, Vesting 1, Drop 0.5 HYPE), vault cap ceilings (1 / 3 / 50 HYPE), sender self-refund after
  24 hours (works while paused), `minOut` recorded with each refuel deposit, 60k gas per Gas Drop HYPE recipient.
- Elysium: Locker `0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b`, Vesting `0x33e318a397699A1d55b008089D0d4F11A959c855`,
  Drop `0xF7633D1033020314BCb5AfDC7864b50f30B493D0`, Vault `0x259EB6eD99225907cB839C73FD2556CF6cBd9456`.
- Deposits: `0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4` (Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain),
  `0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A` (HyperEVM). v2 contracts were never used and are retired.

### Security programme
- Internal security review of the v3 contracts (`audits/2026-11-internal-review.md`) with fuzzed property tests.
- Bug bounty: up to $5,000 for critical issues (SECURITY.md, docs).

### SDK
- `@elyport/sdk` 0.2.0 points at the v3 contracts and the v3 deposit ABI.
- `@elyport/sdk` 0.3.0 adds `ely.lp.checkPair()` / `ely.lp.checkLock()` and `lpCheckAbi`.

### Other
- Terms list contact channels; docs cover the owner wallet, LP verification and known limits; footer shows the network
  before the first block loads; web package version matches releases.

## v1.3.0 — Widgets, public API and SDK (2026-11-10)

### New
- **Manage from the page**: lock owners can extend, top up, transfer and withdraw from the lock page; vesting creators
  can cancel cancellable schedules and recipients can move a schedule to a new wallet.
- **Widgets**: a claim widget and a live lock widget for any website, via `embed.js` or a plain iframe, with light and
  dark themes and a custom accent color. Only `/embed/*` can be framed.
- **Public API** at `/api/v1`: token, lock, vesting, wallet and stats endpoints. Read-only, no key, open CORS.
- **SDK** [`@elyport/sdk`](https://www.npmjs.com/package/@elyport/sdk) on npm: locks, tranche locks, vesting, gas drops
  and an API client, built on viem. Published from GitHub Actions through npm trusted publishing, with provenance.

### Maintenance
- GitHub Actions moved to Node 24 based versions (checkout, setup-node, upload-artifact v6).

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
