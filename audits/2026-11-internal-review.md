# Elyport internal security review — contracts v3

**Date:** 10 November 2026 · **Commit reviewed:** contracts at v3 deploy (`contracts/src`, OpenZeppelin 5.1.0, Solidity 0.8.28)
**Type:** internal review by the Elyport team. **This is not an independent audit.** A third-party audit is still planned;
until then, treat the contracts as unaudited and use amounts you are comfortable with.

## Scope

| Contract | Chain(s) | Address |
| --- | --- | --- |
| ElyportLocker | Elysium | `0x402073014Aac6a658c7eb23ED7F8c39C8D1ee72b` |
| ElyportVesting | Elysium | `0x33e318a397699A1d55b008089D0d4F11A959c855` |
| ElyportDrop | Elysium | `0xF7633D1033020314BCb5AfDC7864b50f30B493D0` |
| ElyportRefuelVault | Elysium | `0x259EB6eD99225907cB839C73FD2556CF6cBd9456` |
| ElyportRefuelDeposit | Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain | `0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4` |
| ElyportRefuelDeposit | HyperEVM | `0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A` |

Off-chain parts that affect funds were also read: the relayer (`web/src/lib/relayer.ts`), the price feed
(`web/src/lib/prices.ts`) and the public refuel trigger (`/api/refuel/process`).

## Method

- Line-by-line read of every contract and of the relayer, focused on who can move funds, under which conditions.
- Unit tests for every function and revert path (`contracts/test/*.t.sol`).
- Fuzzed properties for any input (`contracts/test/Properties.t.sol`):
  - vesting curve is monotonic, bounded by the total, zero before the cliff and complete at the end;
  - claims over time pay exactly the total and leave the contract empty;
  - the Locker always holds exactly the sum of its active locks;
  - a refuel deposit contract's `reserved` balance always equals the sum of pending deposits, whatever mix of
    deliveries, relayer refunds and sender refunds happens.
- On-chain check after deploy of owner, relayer, fees, caps, ceilings and limits on all seven chains.

## Summary

| Severity | Count | Status |
| --- | --- | --- |
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | 1 fixed in v3, 1 mitigated |
| Low | 5 | 3 fixed in v3, 2 acknowledged |
| Informational | 6 | documented |

## Findings

### M-1 · Refuel deposits could stay pending forever — **fixed in v3**
In v2 only the relayer or owner could refund a pending deposit. If the relayer stopped, a user's payment had no exit.
**Fix:** `claimRefund(id)` lets the sender refund a deposit that is still pending after `REFUND_DELAY` (24 hours), even while
the contract is paused. The relayer stops delivering 4 hours before that window opens and refunds instead, so a deposit
cannot be both delivered and refunded.

### M-2 · A compromised relayer key can mark deposits fulfilled without paying — **mitigated**
`markFulfilled` trusts the relayer; the deposit contract cannot see Elysium. A stolen relayer key could mark pending deposits
as fulfilled (closing the self-refund path) and take up to the vault's daily cap.
**Mitigations:** the relayer is a separate wallet from the owner and deployer; vault caps have hard ceilings
(1 / 3 / 50 HYPE); the vault holds a small working stock; the owner can revoke the relayer on every contract and pause; marked
funds stay in the deposit contract until the owner sweeps them, so affected users can be made whole from them. Each
delivery is public on both chains, so a mismatch is visible.
**Recommendation:** move the owner to a multisig and add monitoring that compares `Fulfilled` events with vault `Dispensed`
events.

### L-1 · Owner could set any fee — **fixed in v3**
Fees now have hard caps (`MAX_LOCK_FEE` 1 HYPE, `MAX_VESTING_FEE` 1 HYPE, `MAX_DROP_FEE` 0.5 HYPE), checked at deploy and on
every change.

### L-2 · Owner could raise refuel caps without limit — **fixed in v3**
`setCaps` and the constructor enforce `CEILING_PER_TX`, `CEILING_PER_WALLET_PER_DAY` and `CEILING_PER_DAY`.

### L-3 · No on-chain minimum for refuel output — **fixed in v3**
Deposits record `minOut`. The relayer refunds instead of delivering less. The app sets it 3% below the quote.

### L-4 · Gas Drop stipend too low for some contract wallets — **fixed in v3**
Raised from 30,000 to 60,000 gas per recipient (`NATIVE_SEND_GAS`). Refusing wallets still get their share returned to
the sender; the batch fee is still charged.

### L-5 · Anyone can add locks or schedules that point at any token or owner — **acknowledged**
Index arrays (`lockIdsByToken`, `lockIdsByOwner`, `scheduleIdsByToken`) can be padded by anyone willing to pay the fee for
each entry. Funds are never at risk; views and pages read the newest entries and the per-item fee makes spam costly.

### I-1 · LP check is structural
`isLP` only checks that `token0()` and `token1()` exist. A fake pair can be locked as "LP". **Handled off-chain:** the app,
badge, widgets and API count an LP lock as liquidity only when the pair comes from a known DEX factory that confirms it.

### I-2 · Token behaviour
Fee-on-transfer tokens are recorded at the amount received (single locks) or rejected (tranches, vesting). Rebasing tokens
are not supported: balances are pooled per token, so a shrinking balance can make the last withdrawal fail. Tokens that can
blacklist addresses can block a claim or revoke to a blacklisted address.

### I-3 · Owner-controlled liveness
If the owner sets a fee recipient that rejects HYPE, creating locks, vesting and drops reverts until it is changed. The
owner can pause Refuel. Neither can move user funds.

### I-4 · Vesting start can be in the past
A creator may set a start date in the past, making tokens claimable at once. Pages show the real dates.

### I-5 · Relayer reorg safety (off-chain)
The relayer waits 3–20 confirmations per chain and keys each payout by the deposit's full contents, so a reorged deposit
with the same id but different contents cannot reuse a payout key.

### I-6 · Price feed (off-chain)
Quotes use the median of CoinGecko, DefiLlama and Hyperliquid and stop if sources disagree by more than 3%. Combined with
`minOut`, a bad price can delay a refuel but cannot make a user receive less than they accepted.

## What we did not find
No path for the owner, relayer or any third party to move locked tokens, shorten a lock, take vested tokens away from a
recipient, or sweep money owed to a pending refuel deposit. No reentrancy path (`nonReentrant` on every function that
moves tokens; checks-effects-interactions elsewhere).
