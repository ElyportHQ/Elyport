# Refuel delivery monitor

A stand-alone check anyone can run. It reads only public chain data: no Elyport server, no API,
no secrets.

```bash
cd monitor
npm install
node check-refuel.mjs
```

It exits with code 1 if a refuel deposit is marked delivered on its source chain but the Elysium
vault never paid it, or if the vault paid out for something that matches no deposit. Pending
deposits older than 24 hours are printed as warnings (the sender can refund themselves).

Use your own RPCs with `RPC_URL_<chainId>`, for example `RPC_URL_1=https://... node check-refuel.mjs`.

GitHub Actions runs it every 15 minutes (`.github/workflows/refuel-monitor.yml`).
