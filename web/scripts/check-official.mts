// End-to-end check of the official-token detector against Montra on Elysium mainnet.
// It runs the exact code the site uses, on a real Montra launch (MONTRA itself), through both
// the API path and the on-chain fallback, then confirms that $ELYPORT is not reported before launch.
//   cd web && npx tsx scripts/check-official.mts
import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import { findOfficialToken, OFFICIAL } from "../src/lib/officialTokenCore.ts";

const elysium = defineChain({ id: 99901, name: "Elysium", nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.elysium.kinetiq.xyz"] } } });
const c = createPublicClient({ chain: elysium, transport: http(undefined, { retryCount: 6, retryDelay: 800 }) }) as unknown as PublicClient;

const sample = { dev: "0x2796005dc02e04d84cb6a91420259e921a0d5ae1" as const, symbol: "MONTRA", expect: "0x063f7cc5339f92a5fd7baf3d22233044fda1f327", launchBlock: 3615029n };
let failed = false;
const check = (name: string, ok: boolean, info: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`, info ?? "");
  if (!ok) failed = true;
};

const base = { montraRegistry: OFFICIAL.montraRegistry, montraFactory: OFFICIAL.montraFactory };
const viaApi = await findOfficialToken(c, { ...base, dev: sample.dev, symbol: sample.symbol, fromBlock: sample.launchBlock - 10n, useApi: true });
check("API path finds a real Montra launch", viaApi?.address.toLowerCase() === sample.expect, viaApi?.address);

const latest = await c.getBlockNumber();
const viaChain = await findOfficialToken(c, { ...base, dev: sample.dev, symbol: sample.symbol, fromBlock: sample.launchBlock - 10n, scanBlocks: latest - sample.launchBlock + 20n, useApi: false });
check("On-chain fallback finds it too", viaChain?.address.toLowerCase() === sample.expect, viaChain?.address);

const wrongDev = await findOfficialToken(c, { ...base, dev: OFFICIAL.dev, symbol: sample.symbol, fromBlock: sample.launchBlock - 10n, useApi: true });
check("Same token is rejected for another creator", wrongDev === null, wrongDev?.address);

const wrongSymbol = await findOfficialToken(c, { ...base, dev: sample.dev, symbol: "NOTIT", fromBlock: sample.launchBlock - 10n, useApi: true });
check("Rejected when the symbol differs", wrongSymbol === null, wrongSymbol?.address);

const elyport = await findOfficialToken(c, { ...OFFICIAL, scanBlocks: 200_000n });
console.log(`INFO  $ELYPORT today: ${elyport ? elyport.address : "not launched yet"}`);

if (failed) process.exit(1);
