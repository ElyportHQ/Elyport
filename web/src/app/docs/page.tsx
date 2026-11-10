import type { Metadata } from "next";
import Link from "next/link";
import { contracts, elysium, explorerAddress, githubUrl, sourceChains } from "@/lib/config";

export const metadata: Metadata = { title: "Docs", description: "How Elyport works: Refuel, Gas Drop, Locker, Vesting, fees, limits and contracts." };

const sections = [
  ["start", "Getting started"],
  ["refuel", "Refuel"],
  ["drop", "Gas Drop"],
  ["locker", "Locker"],
  ["vesting", "Vesting"],
  ["fees", "Fees & limits"],
  ["contracts", "Contracts"],
  ["security", "Security & risks"],
] as const;

export default function DocsPage() {
  const deployed = [
    ["Locker", contracts.locker],
    ["Vesting", contracts.vesting],
    ["Gas Drop", contracts.drop],
    ["Refuel vault", contracts.refuelVault],
  ] as const;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Docs</div>
          <h1>How Elyport works</h1>
          <p>Short, practical answers. Every contract and limit is listed here.</p>
        </div>
      </div>
      <div className="docs-grid">
        <nav className="docs-nav" aria-label="Docs sections">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <article className="prose">
          <h2 id="start">Getting started</h2>
          <p>
            Elysium is a Layer 2 for Hyperliquid, built by Kinetiq. It uses <strong>HYPE</strong> as gas. To do anything on
            Elysium, your wallet needs a little HYPE there.
          </p>
          <p>
            Connect any EVM wallet (MetaMask, Rabby, OKX, Coinbase or WalletConnect). Elyport adds the Elysium network to your
            wallet when you first switch to it. Current network: <code>{elysium.name}</code>, chain ID <code>{elysium.id}</code>.
          </p>

          <h2 id="refuel">Refuel</h2>
          <p>
            Pay a small amount on the chain you already use and receive HYPE on Elysium. Instant refuels are sent from
            Elyport&apos;s HYPE stock as soon as your payment confirms, usually in under a minute.
          </p>
          <ul>
            {sourceChains.map((c) => (
              <li key={c.id}>
                {c.name}: {c.usdc ? `USDC or ${c.native}` : c.native}
                {c.deposit ? "" : " (Route only for now)"}
              </li>
            ))}
            <li>Solana: Route, through a bridge to HyperEVM and then the official Elysium bridge</li>
          </ul>
          <p>If a payment cannot be delivered (stock empty or a limit reached), it is refunded on the chain you paid from.</p>

          <h2 id="drop">Gas Drop</h2>
          <p>
            Paste a list of <code>address,amount</code> lines or upload a CSV, and send HYPE or any token to every wallet. Large
            lists are split into batches of up to 400 wallets. Duplicates and invalid lines are flagged before you send.
          </p>
          <p>For HYPE drops, if a wallet refuses the transfer, its share is returned to you instead of failing the batch.</p>

          <h2 id="locker">Locker</h2>
          <p>
            Lock LP tokens or regular tokens until a date you choose. A lock can be extended or topped up at any time, but{" "}
            <strong>never shortened</strong>. Tokens can only be withdrawn by the lock owner after the unlock date.
          </p>
          <p>
            Every lock has a public page at <code>/lock/[id]</code> and appears on the token&apos;s page at{" "}
            <code>/token/[address]</code>.
          </p>

          <h2 id="vesting">Vesting</h2>
          <p>
            Create schedules for one wallet or many (CSV). Nothing is claimable before the cliff ends. After that, the vested
            share follows time since the start date, either continuously (linear) or in 30-day steps (monthly).
          </p>
          <p>
            Anyone can trigger a claim; tokens always go to the recipient. If you mark a schedule as cancellable, you can stop it
            later: what has vested stays with the recipient and the rest returns to you.
          </p>

          <h2 id="fees">Fees & limits</h2>
          <ul>
            <li>Refuel: 0.5% of the amount</li>
            <li>Lock: a flat fee of about $10, paid in HYPE</li>
            <li>Vesting: a flat fee of about $10 per create, paid in HYPE</li>
            <li>Gas Drop: a flat fee of about $3 per batch, paid in HYPE</li>
            <li>Instant refuel: up to $10 per transaction and $20 per wallet per day</li>
          </ul>
          <p>Exact fees are read from the contracts and shown before you confirm.</p>

          <h2 id="contracts">Contracts</h2>
          <p>
            Every contract is open source and verified on its explorer. Read the code, tests and deploy scripts on{" "}
            <a href={githubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            .
          </p>
          <ul>
            {deployed.map(([name, a]) => (
              <li key={name}>
                {name}:{" "}
                {a ? (
                  <a href={explorerAddress(a)} target="_blank" rel="noreferrer">
                    <code>{a}</code>
                  </a>
                ) : (
                  "not deployed on this network yet"
                )}
              </li>
            ))}
          </ul>

          <h2 id="security">Security & risks</h2>
          <p>
            The contracts have not been audited yet. Instant refuels are capped per transaction, per wallet and per day, and the
            refuel vault can be paused. Smart contracts and bridges always carry risk; only use amounts you are comfortable with.
            See <Link href="/risk">Risk</Link> for details.
          </p>
          <p>Elyport is an independent tool. Not affiliated with Kinetiq or Elysium.</p>
        </article>
      </div>
    </div>
  );
}
