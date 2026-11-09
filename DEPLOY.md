# Deploying Elyport

The last step before launch. Do it on **Elysium Testnet first**, test every tool end to end, then repeat on mainnet.

> Never paste a private key into chat, an issue, or a commit. Keys go only in your own terminal and in Vercel's encrypted env vars.

## 0. Wallets

| Wallet | Holds | Used for |
| --- | --- | --- |
| **Deployer / owner** | A little HYPE on Elysium + gas on each source chain | Deploys and configures the contracts. Later hand ownership to a multisig with `transferOwnership` + `acceptOwnership` (Ownable2Step). |
| **Fee recipient** | Nothing needed | Receives every Locker, Vesting and Gas Drop fee. A multisig or a cold wallet. |
| **Relayer** | HYPE on Elysium + native gas on every source chain | Signs `dispense` on Elysium and `markFulfilled` / `refund` on source chains. A fresh hot wallet, used for nothing else. |

## 1. Elysium contracts

Fees are flat amounts in HYPE wei. Work them out from the HYPE price on the day (e.g. $10 at $40/HYPE = 0.25 HYPE = `250000000000000000`).

```bash
cd contracts
forge install foundry-rs/forge-std@v1.9.4 --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
forge test

export ELYSIUM_RPC_URL=https://testnet-rpc.elysium.kinetiq.xyz   # mainnet: the published RPC
export OWNER=0xYourDeployer            # same as the deployer, so the script can set the relayer
export FEE_RECIPIENT=0xYourFeeWallet
export RELAYER=0xYourRelayer
export LOCK_FEE_WEI=250000000000000000      # ≈ $10
export VESTING_FEE_WEI=250000000000000000   # ≈ $10 per create
export DROP_FEE_WEI=75000000000000000       # ≈ $3 per batch
export VAULT_MAX_PER_TX_WEI=250000000000000000          # ≈ $10
export VAULT_MAX_PER_WALLET_DAY_WEI=500000000000000000  # ≈ $20
export VAULT_MAX_PER_DAY_WEI=25000000000000000000       # ≈ $1,000

forge script script/Deploy.s.sol:DeployElysium --rpc-url $ELYSIUM_RPC_URL --broadcast --interactives 1
```

`--interactives 1` asks for the key in the terminal so it never lands in your shell history.
The script prints the four `NEXT_PUBLIC_*_ADDRESS=` lines; keep them for step 3.

Then fund the vault with the refuel stock (≈ $1,000 of HYPE) by sending HYPE straight to the vault address.

## 2. Source-chain deposit contracts

Repeat for Base, Arbitrum, Ethereum, BNB Chain and HyperEVM (skip any chain you do not want for Instant refuel; users there still get the bridge Route).

| Chain | `USDC` |
| --- | --- |
| Base | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Arbitrum | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| BNB Chain, HyperEVM | leave empty (native only) |

```bash
export OWNER=0xYourDeployer RELAYER=0xYourRelayer
export USDC=0x...        # from the table, or unset
export USDC_MIN=1000000 USDC_MAX=10000000          # $1 to $10 (6 decimals)
export NATIVE_MIN_WEI=...  NATIVE_MAX_WEI=...      # ≈ $1 and ≈ $10 of the chain's coin

forge script script/Deploy.s.sol:DeploySource --rpc-url $SOURCE_RPC_URL --broadcast --interactives 1
```

## 3. Vercel environment variables

Project → Settings → Environment Variables (Production):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_LOCKER_ADDRESS` `NEXT_PUBLIC_VESTING_ADDRESS` `NEXT_PUBLIC_DROP_ADDRESS` `NEXT_PUBLIC_REFUEL_VAULT_ADDRESS` | from step 1 |
| `NEXT_PUBLIC_DEPLOY_BLOCK` | the Elysium block of the deploy (speeds up scans) |
| `NEXT_PUBLIC_REFUEL_DEPOSIT_<chainId>` | from step 2 (`8453`, `42161`, `1`, `56`, `999`) |
| `RELAYER_PRIVATE_KEY` | the relayer key (mark as **Sensitive**) |
| `CRON_SECRET` | any long random string |
| `RPC_URL_<chainId>` | a private RPC per source chain (Alchemy, QuickNode…) |
| `ELYSIUM_RPC_URL_SERVER` | a private Elysium RPC for the relayer |

For **mainnet**, also set `NEXT_PUBLIC_ELYSIUM_CHAIN_ID`, `NEXT_PUBLIC_ELYSIUM_NAME`, `NEXT_PUBLIC_ELYSIUM_RPC_URL`,
`NEXT_PUBLIC_ELYSIUM_EXPLORER_URL` (and the `_TX_PATH` / `_ADDRESS_PATH` if the explorer is not Blockscout) and
`NEXT_PUBLIC_ELYSIUM_MULTICALL3` from Kinetiq's published network details. When the domain is live, set
`NEXT_PUBLIC_SITE_URL=https://elyport.com` and add it to the Reown allowlist.

Redeploy after saving.

## 4. Relayer schedule

Refuels are delivered right after payment (the app calls `/api/refuel/process`). Two sweeps catch anything missed:

- **Vercel Cron** (`vercel.json`, every minute; per-minute crons need a Pro plan).
- **GitHub Actions** (`.github/workflows/relayer.yml`, every 5 minutes). Add the repository secret `CRON_SECRET`
  and the repository variable `RELAYER_URL` (e.g. `https://elyport.com`).

## 5. Smoke test

1. Refuel $1 from Base with USDC → HYPE arrives, status turns Delivered, history shows the payment.
2. Gas Drop 0.001 HYPE to two wallets.
3. Lock a test token for 1 day → lock page and token page show it; share card renders.
4. Create a vesting schedule with a short cliff → claim after the cliff.
5. Check the fee recipient received each fee.

## 6. Hand over ownership

On every contract: `transferOwnership(multisig)` from the deployer, then `acceptOwnership()` from the multisig.
