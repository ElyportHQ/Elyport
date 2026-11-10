#!/usr/bin/env node
// Elyport refuel delivery check. Stand-alone: it talks only to public RPCs, uses no Elyport
// server and no secrets, so anyone can run it:
//
//   cd monitor && npm install && node check-refuel.mjs
//
// It fails (exit code 1) if
//   - a deposit is marked Fulfilled on a source chain but the Elysium vault never paid it, or
//   - the vault paid out for a key that matches no deposit on any chain.
// Deposits still pending after 24 hours are reported as warnings (senders can self-refund).
// Override any RPC with RPC_URL_<chainId>, e.g. RPC_URL_1=https://... node check-refuel.mjs

import { createPublicClient, defineChain, encodeAbiParameters, http, keccak256, parseAbi, parseAbiItem } from "viem";
import { arbitrum, base, bsc, mainnet } from "viem/chains";

const elysium = defineChain({ id: 99901, name: "Elysium", nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.elysium.kinetiq.xyz"] } } });
const hyperEvm = defineChain({ id: 999, name: "HyperEVM", nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } } });
const robinhood = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } } });

const VAULT = "0x259EB6eD99225907cB839C73FD2556CF6cBd9456";
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const DEPOSITS = [
  [mainnet, "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4"],
  [base, "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4"],
  [arbitrum, "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4"],
  [robinhood, "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4"],
  [bsc, "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4"],
  [hyperEvm, "0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A"],
];
const DEPTH = Number(process.env.MONITOR_DEPTH || 300);
const LOG_BLOCKS = BigInt(process.env.MONITOR_LOG_BLOCKS || 200000);
const CHUNK = 20000n;

const depositAbi = parseAbi([
  "function depositCount() view returns (uint256)",
  "function getDeposit(uint256 id) view returns ((address sender, address recipient, address token, uint256 amount, uint256 minOut, uint64 createdAt, uint8 status))",
]);
const vaultAbi = parseAbi(["function processed(bytes32) view returns (bool)"]);
const dispensed = parseAbiItem("event Dispensed(bytes32 indexed depositKey, address indexed to, uint256 amount)");

const client = (chain) => createPublicClient({ chain, transport: http(process.env[`RPC_URL_${chain.id}`] || undefined, { timeout: 15000 }) });
const keyOf = (chainId, contract, id, d) =>
  keccak256(
    encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "uint256" }, { type: "address" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }],
      [BigInt(chainId), contract, id, d.sender, d.recipient, d.token, d.amount, d.minOut],
    ),
  );

const problems = [];
const warnings = [];
const known = new Set();
const fulfilled = [];
const now = Math.floor(Date.now() / 1000);

for (const [chain, address] of DEPOSITS) {
  try {
    const pub = client(chain);
    const count = Number(await pub.readContract({ address, abi: depositAbi, functionName: "depositCount" }));
    const from = Math.max(0, count - DEPTH);
    const ids = Array.from({ length: count - from }, (_, i) => BigInt(from + i));
    let pending = 0;
    if (ids.length) {
      const res = await pub.multicall({ contracts: ids.map((id) => ({ address, abi: depositAbi, functionName: "getDeposit", args: [id] })), allowFailure: true, multicallAddress: MULTICALL3 });
      res.forEach((r, i) => {
        if (r.status !== "success") return warnings.push(`${chain.name}: could not read deposit #${ids[i]}`);
        const d = r.result;
        const key = keyOf(chain.id, address, ids[i], d);
        known.add(key.toLowerCase());
        if (d.status === 1) {
          pending++;
          if (now - Number(d.createdAt) > 24 * 3600) warnings.push(`${chain.name}: deposit #${ids[i]} pending over 24h`);
        }
        if (d.status === 2) fulfilled.push({ where: `${chain.name} #${ids[i]}`, key });
      });
    }
    console.log(`${chain.name.padEnd(16)} deposits ${count}, checked ${ids.length}, pending ${pending}`);
  } catch (e) {
    warnings.push(`${chain.name}: ${e.shortMessage || e.message}`);
  }
}

const ely = client(elysium);
if (fulfilled.length) {
  const res = await ely.multicall({ contracts: fulfilled.map((f) => ({ address: VAULT, abi: vaultAbi, functionName: "processed", args: [f.key] })), allowFailure: true, multicallAddress: MULTICALL3 });
  res.forEach((r, i) => {
    if (r.status !== "success") warnings.push(`vault check failed for ${fulfilled[i].where}`);
    else if (r.result === false) problems.push(`${fulfilled[i].where} is marked delivered but the vault never paid it`);
  });
}

let payouts = 0;
try {
  const latest = await ely.getBlockNumber();
  const start = latest > LOG_BLOCKS ? latest - LOG_BLOCKS : 0n;
  for (let from = start; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    for (const l of await ely.getLogs({ address: VAULT, event: dispensed, fromBlock: from, toBlock: to })) {
      payouts++;
      if (!known.has(l.args.depositKey.toLowerCase())) problems.push(`vault payout ${l.transactionHash} matches no deposit`);
    }
  }
  console.log(`Elysium vault     payouts checked ${payouts} (blocks ${start}–${latest}), delivered deposits checked ${fulfilled.length}`);
} catch (e) {
  warnings.push(`vault payouts: ${e.shortMessage || e.message}`);
}

for (const w of warnings) console.log(`WARN  ${w}`);
for (const p of problems) console.log(`FAIL  ${p}`);
if (problems.length) process.exit(1);
console.log("OK    every delivered refuel was paid and every payout matches a deposit");
