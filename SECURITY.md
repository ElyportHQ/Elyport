# Security

Elyport's contracts hold user tokens (Locker, Vesting) and HYPE stock (Refuel vault). Reports are welcome.

## Reporting

Please report vulnerabilities privately through
[GitHub private vulnerability reporting](https://github.com/ElyportHQ/Elyport/security/advisories/new).
Do not open a public issue. Include the contract or page, the steps to reproduce, and the impact.

We aim to acknowledge reports within 72 hours.

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
