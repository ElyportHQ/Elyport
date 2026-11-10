# Security

Elyport's contracts hold user tokens (Locker, Vesting) and HYPE stock (Refuel vault). Reports are welcome.

## Reporting

Please report vulnerabilities privately through
[GitHub private vulnerability reporting](https://github.com/ElyportHQ/Elyport/security/advisories/new).
Do not open a public issue. Include the contract or page, the steps to reproduce, and the impact.

We aim to acknowledge reports within 72 hours.

## Bug bounty

Elyport pays for valid, previously unknown vulnerabilities reported privately through the link above.

| Severity | Example | Reward |
| --- | --- | --- |
| Critical | Anyone other than the owner/recipient can take locked tokens, vested tokens, refuel deposits or the vault stock | up to $5,000 |
| High | Funds can be frozen permanently, or a lock can be shortened | up to $1,500 |
| Medium | A refuel can be delivered twice, or a user can be made to receive less than their minimum | up to $500 |
| Low | Wrong data shown in a way that could mislead users (badge, API, widgets) | up to $100 |

Rules:
- Report privately and give us a reasonable time to fix before any disclosure.
- Test only on a local fork or testnet. Do not touch other users' funds, run phishing or social engineering, or overload
  the site or RPCs.
- Issues already listed in `audits/2026-11-internal-review.md` or caused by a compromised owner or relayer key are out of
  scope.
- Rewards are paid in USDC or HYPE from the Elyport treasury. Amount depends on impact and report quality; the first
  valid report of an issue wins.

## Reviews

- [Internal security review, November 2026](audits/2026-11-internal-review.md) (not an independent audit).

## Scope

- `contracts/src/*` deployed by Elyport
- The refuel relayer (`web/src/lib/relayer.ts`, `/api/relayer`, `/api/refuel/process`)
- The web app at the official domain

Third-party bridges linked from the Route option, wallets, and the Elysium chain itself are out of scope.

## Design notes

- Locks can be extended or topped up, never shortened. Only the lock owner can withdraw, and only after unlock.
- Vesting can be revoked only when created as revocable; the vested part always stays with the beneficiary.
- The refuel vault pays each deposit key at most once and enforces per-transaction, per-wallet-per-day and daily caps.
  It can be paused by the owner.
- Fees are flat native amounts set by the owner and forwarded directly to the fee recipient.
- The owner is a single wallet today, separate from the deployer and the relayer. A multisig is planned.
- LP locks only count as locked liquidity in the app, badge, widgets and API when the pair comes from a known DEX
  factory that confirms it (`web/src/lib/pairs.ts`).
- The relayer delivers only after source-chain confirmations, keys each payment by its full contents, reads prices
  from three sources and refuses to quote when they disagree.
- Rebasing tokens and Uniswap V3/V4 positions are not supported by the Locker.
