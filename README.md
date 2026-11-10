<p align="center">
  <img src=".github/assets/banner.png" alt="Elyport: the port into Elysium" width="100%">
</p>

<h3 align="center">The port into Elysium</h3>

<p align="center">
  Gas from any chain, airdrops to thousands, and locks and vesting that traders can verify,<br>
  all in one place on Elysium, the Hyperliquid L2.
</p>

<p align="center">
  <a href="https://elyport.com"><b>Open the app</b></a> ·
  <a href="https://elyport.com/docs">Docs</a> ·
  <a href="#contracts">Contracts</a> ·
  <a href="#run-it-locally">Run locally</a>
</p>

<p align="center">
  <a href="https://github.com/ElyportHQ/Elyport/actions/workflows/ci.yml"><img src="https://github.com/ElyportHQ/Elyport/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <img src="https://img.shields.io/badge/Solidity-0.8.28-14171C?logo=solidity&logoColor=white" alt="Solidity 0.8.28">
  <img src="https://img.shields.io/badge/Foundry-tested-4A56C2" alt="Foundry">
  <img src="https://img.shields.io/badge/Next.js-15-14171C?logo=nextdotjs&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/Elysium-L2-BFD7FF" alt="Elysium">
</p>

<p align="center">
  <img src=".github/assets/preview-home.png" alt="Elyport home" width="100%">
</p>

## What Elyport does

| Tool | For | What it does |
| --- | --- | --- |
| **Refuel** | Users | Get HYPE for gas on Elysium, paid from Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain, HyperEVM or Solana |
| **Gas Drop** | Builders | Send HYPE or any token to up to 500 wallets per batch, from a list or CSV |
| **Locker** | Builders | Lock LP and tokens until a set date, or in up to 20 tranches. Extend or top up, never shorten |
| **Vesting** | Builders | Cliff plus linear or monthly release, for one wallet or a whole CSV |
| **Token safety** | Traders | See how much of a token's LP and supply is locked or vesting before buying |
| **Claim page** | Builders | One shareable link per token where recipients connect and claim: `elyport.com/claim/<token>` |
| **My Elyport** | Everyone | Your locks, vesting and drops in one place, with Claim, Claim all and Withdraw |
| **Lock badge** | Builders | A live "Liquidity locked" badge for your site or README at `elyport.com/badge/<token>` |

<p align="center">
  <img src=".github/assets/preview-tools.png" alt="Refuel, Gas Drop, Locker and Vesting on mobile" width="100%">
</p>

## How Instant Refuel works

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant D as RefuelDeposit<br/>(source chain)
    participant R as Relayer
    participant V as RefuelVault<br/>(Elysium)
    U->>D: Pay USDC or native gas
    D-->>R: Deposited event
    R->>V: dispense(depositKey, user, HYPE)
    V-->>U: HYPE lands on Elysium
    R->>D: markFulfilled(id, elysiumTx)
    Note over R,D: If a cap or the stock blocks it, the deposit is refunded
```

The app asks the relayer to deliver as soon as the payment confirms, and scheduled sweeps catch anything missed.
Every deposit has a unique key, so the vault can never pay the same deposit twice.
Instant refuels are capped per transaction, per wallet per day and per day. Larger amounts go through a bridge route.

## Contracts

| Contract | Chain | What it does |
| --- | --- | --- |
| `ElyportLocker` | Elysium | Time-locks LP and tokens. Public and indexed by token and owner |
| `ElyportVesting` | Elysium | Cliff and linear or periodic vesting, single or batch, optionally revocable |
| `ElyportDrop` | Elysium | Multisend HYPE or any ERC-20. Failed native sends are refunded |
| `ElyportRefuelVault` | Elysium | Holds the HYPE stock. Relayer-only payouts with caps and pause |
| `ElyportRefuelDeposit` | Source chains | Takes USDC or native payments with a minimum to receive. Sender can self-refund after 24 hours |

### Mainnet addresses

| Contract | Chain | Address |
| --- | --- | --- |
| `ElyportLocker` | Elysium | [`0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b`](https://elysium.kinetiq.xyz/explorer/address/0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b) |
| `ElyportVesting` | Elysium | [`0x33e318a397699A1d55b008089D0d4F11A959c855`](https://elysium.kinetiq.xyz/explorer/address/0x33e318a397699A1d55b008089D0d4F11A959c855) |
| `ElyportDrop` | Elysium | [`0xF7633D1033020314BCb5AfDC7864b50f30B493D0`](https://elysium.kinetiq.xyz/explorer/address/0xF7633D1033020314BCb5AfDC7864b50f30B493D0) |
| `ElyportRefuelVault` | Elysium | [`0x259EB6eD99225907cB839C73FD2556CF6cBd9456`](https://elysium.kinetiq.xyz/explorer/address/0x259EB6eD99225907cB839C73FD2556CF6cBd9456) |
| `ElyportLPCheck` | Elysium | [`0xB672a7D0d3CeA82525fB0a6128fE0a31d0858AC3`](https://elysium.kinetiq.xyz/explorer/address/0xB672a7D0d3CeA82525fB0a6128fE0a31d0858AC3) |
| `ElyportTimelock` (48h) | Elysium | [`0x51aed68990a24D6e2712d98e7837F3d89269D06e`](https://elysium.kinetiq.xyz/explorer/address/0x51aed68990a24D6e2712d98e7837F3d89269D06e) |
| `ElyportRefuelDeposit` | Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain | `0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4` |
| `ElyportRefuelDeposit` | HyperEVM | `0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A` |

All contracts are v3: hard fee caps, vault cap ceilings, sender self-refunds after 24 hours and a recorded minimum for each refuel. Earlier versions were never used and are retired.

Built on OpenZeppelin v5 (`Ownable2Step`, `ReentrancyGuard`, `Pausable`, `SafeERC20`). Fees are flat amounts in HYPE, forwarded straight to the fee recipient.

| Action | Fee |
| --- | --- |
| Refuel | 0.5% |
| Lock | about $10 in HYPE |
| Vesting | about $10 in HYPE per create |
| Gas Drop | about $3 in HYPE per batch |

## Build on Elyport

| | |
| --- | --- |
| **Widgets** | Claim and live lock widgets for any site: `<div data-elyport="claim" data-token="0x…">` + [`embed.js`](https://elyport.com/docs/widgets) |
| **Public API** | Read-only JSON at [`/api/v1`](https://elyport.com/api/v1): token, lock, vesting, wallet, stats. No key, open CORS |
| **SDK** | [`@elyport/sdk`](https://www.npmjs.com/package/@elyport/sdk) on npm ([source](sdk)): locks, tranches, vesting, drops and an API client on viem |

## Repository

```
contracts/   Foundry project: src, tests, deploy scripts
web/         Next.js app: home, tool consoles, public pages, docs, widgets, public API, refuel relayer
sdk/         @elyport/sdk: TypeScript SDK on viem
.github/     CI for contracts, web and SDK
```

## Run it locally

**Contracts**

```bash
cd contracts
forge install foundry-rs/forge-std@v1.9.4 --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
forge test
```

**Web**

```bash
cd web
cp .env.example .env.local   # fill in contract addresses and the Reown project ID
npm install
npm run dev
```

Full launch checklist: **[DEPLOY.md](DEPLOY.md)**. Security reports: **[SECURITY.md](SECURITY.md)**.

<details>
<summary><b>Deploying (short version)</b></summary>

<br>

**Elysium side**

```bash
OWNER=0x… FEE_RECIPIENT=0x… RELAYER=0x… LOCK_FEE_WEI=… VESTING_FEE_WEI=… DROP_FEE_WEI=… \
VAULT_MAX_PER_TX_WEI=… VAULT_MAX_PER_WALLET_DAY_WEI=… VAULT_MAX_PER_DAY_WEI=… \
forge script script/Deploy.s.sol:DeployElysium --rpc-url $ELYSIUM_RPC_URL --broadcast --private-key $DEPLOYER_KEY
```

**Each source chain**

```bash
OWNER=0x… RELAYER=0x… USDC=0x… USDC_MIN=1000000 USDC_MAX=10000000 NATIVE_MIN_WEI=… NATIVE_MAX_WEI=… \
forge script script/Deploy.s.sol:DeploySource --rpc-url $SOURCE_RPC_URL --broadcast --private-key $DEPLOYER_KEY
```

**Web on Vercel**

Set **Root Directory** to `web`. The refuel relayer runs at `/api/relayer`, called by Vercel Cron (`vercel.json`)
and protected by `CRON_SECRET`. The relayer wallet needs HYPE on Elysium and native gas on every source chain.

</details>

## Security

- [Internal security review (November 2026)](audits/2026-11-internal-review.md): 0 critical, 0 high; not an independent audit.
- Bug bounty up to $5,000 for critical issues. Report privately, see [SECURITY.md](SECURITY.md).

## License

- **App and tooling** (`web/`, workflows, docs): [Business Source License 1.1](LICENSE). Free to read, audit, run and test;
  running a competing hosted service is not allowed. Converts to GPL-2.0-or-later on 2030-11-10.
- **Smart contracts** (`contracts/`): [MIT](contracts/LICENSE), the same source that is verified on-chain.
- **SDK** (`sdk/`): [MIT](sdk/LICENSE).

## Principles

- **Verifiable by default.** Every lock and schedule has a public page anyone can check.
- **Capped and careful.** Instant refuels have hard limits and can be paused.
- **No token required.** Fees are paid in HYPE.

---

<p align="center">
  <img src=".github/assets/logo.png" alt="Elyport" width="56"><br>
  <sub>Elyport is an independent tool. Not affiliated with Kinetiq or Elysium.</sub>
</p>
