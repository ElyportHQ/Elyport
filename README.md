# Elyport

**The port into Elysium.** Refuel, Gas Drop, Locker and Vesting for Elysium, the Hyperliquid L2.

```
contracts/   Solidity (Foundry): Locker, Vesting, Drop, RefuelVault, RefuelDeposit
web/         Next.js app: home, tool consoles, public lock/vesting/token pages, docs, refuel relayer
```

## Contracts

| Contract | Chain | What it does |
| --- | --- | --- |
| `ElyportLocker` | Elysium | Time-locks LP and tokens. Extend or top up, never shorten. Public and indexed by token and owner. |
| `ElyportVesting` | Elysium | Cliff + linear or monthly vesting, single or batch. Optional cancel for the creator. |
| `ElyportDrop` | Elysium | Multisend HYPE or any ERC-20, up to 500 wallets per batch. |
| `ElyportRefuelVault` | Elysium | Holds the HYPE stock. Relayer-only dispense with per-tx, per-wallet-per-day and daily caps. |
| `ElyportRefuelDeposit` | Source chains | Takes USDC or native payments for Instant refuels. Refundable until fulfilled. |

Fees are flat amounts in native wei set by the owner, forwarded straight to the fee recipient.

```bash
cd contracts
forge install foundry-rs/forge-std@v1.9.4 --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
forge test

# Elysium side
OWNER=0x… FEE_RECIPIENT=0x… RELAYER=0x… LOCK_FEE_WEI=… VESTING_FEE_WEI=… DROP_FEE_WEI=… \
VAULT_MAX_PER_TX_WEI=… VAULT_MAX_PER_WALLET_DAY_WEI=… VAULT_MAX_PER_DAY_WEI=… \
forge script script/Deploy.s.sol:DeployElysium --rpc-url $ELYSIUM_RPC_URL --broadcast --private-key $DEPLOYER_KEY

# Each source chain
OWNER=0x… RELAYER=0x… USDC=0x… USDC_MIN=1000000 USDC_MAX=10000000 NATIVE_MIN_WEI=… NATIVE_MAX_WEI=… \
forge script script/Deploy.s.sol:DeploySource --rpc-url $SOURCE_RPC_URL --broadcast --private-key $DEPLOYER_KEY
```

## Web

```bash
cd web
cp .env.example .env.local   # fill in addresses and the Reown project ID
npm install
npm run dev
```

Deploy on Vercel with **Root Directory = `web`**. The refuel relayer runs at `/api/relayer`, called every minute by Vercel Cron
(`vercel.json`) and protected by `CRON_SECRET`. The relayer wallet needs HYPE on Elysium (gas) and native gas on every source chain.

---

Elyport is an independent tool. Not affiliated with Kinetiq or Elysium.
