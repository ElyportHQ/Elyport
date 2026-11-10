# @elyport/sdk

[![npm](https://img.shields.io/npm/v/@elyport/sdk?color=1b1f26)](https://www.npmjs.com/package/@elyport/sdk) ![license](https://img.shields.io/npm/l/@elyport/sdk?color=1b1f26) ![provenance](https://img.shields.io/badge/provenance-signed-2bb58a)

TypeScript SDK for [Elyport](https://elyport.com) on Elysium, the Hyperliquid L2 by Kinetiq.
Lock LP or tokens (one date or up to 20 tranches), create vesting for up to 100 wallets, send gas drops to up to
500 wallets, and read everything through the public API. Built on [viem](https://viem.sh).

```bash
npm install @elyport/sdk viem
```

## Write: locks, vesting, drops

```ts
import { createWalletClient, custom, parseUnits } from "viem";
import { createElyport, elysium } from "@elyport/sdk";

const walletClient = createWalletClient({ chain: elysium, transport: custom(window.ethereum), account });
const ely = createElyport({ walletClient });

// Lock LP until 1 January 2027 (approves first if needed, pays the fee automatically)
const hash = await ely.locks.create({ token: lpToken, amount: parseUnits("1000", 18), unlockAt: new Date("2027-01-01"), isLP: true });
const [lockId] = ely.locks.idsFromReceipt(await ely.wait(hash));

// 25% every quarter
await ely.locks.createTranches({
  token,
  tranches: [3, 6, 9, 12].map((m) => ({ amount: parseUnits("250000", 18), unlockAt: new Date(Date.UTC(2027, m - 1, 1)) })),
});

// Team vesting: 3-month cliff, 12 months, monthly
await ely.vesting.create({
  token,
  recipients: [{ address: alice, amount: parseUnits("500000", 18) }],
  start: new Date(),
  cliff: 90 * 86_400,
  duration: 360 * 86_400,
  release: "monthly",
  cancellable: true,
});

// Gas drop
await ely.drop.native([{ address: bob, amount: parseUnits("0.05", 18) }]);
```

Also: `locks.extend`, `locks.topUp`, `locks.transfer`, `locks.withdraw`, `vesting.claim`, `vesting.cancel`,
`vesting.transfer`, `drop.token`, and fee readers `fees.lock()`, `fees.vesting()`, `fees.drop()`.

## Read: on-chain

```ts
const ely = createElyport(); // public Elysium RPC
const ids = await ely.locks.idsByToken(token);
const lock = await ely.locks.get(ids[0]);
const claimable = await ely.vesting.claimable(7n);

// Is this LP lock on a real DEX pair? (checked on-chain by ElyportLPCheck)
const { isLP, verified, dex } = await ely.lp.checkLock(ids[0]);
```

## Read: public API

```ts
import { createElyportApi } from "@elyport/sdk";

const api = createElyportApi();
const t = await api.token("0x…");
console.log(t.summary.bestLiquidityLockedPercent, t.summary.nextUnlock);
```

## Widgets

```ts
import { widgetUrls } from "@elyport/sdk";
widgetUrls("0x…").claim; // https://elyport.com/embed/claim/0x…
```

Docs: <https://elyport.com/docs/sdk> · Contracts: <https://elyport.com/docs/contracts> · License: MIT
