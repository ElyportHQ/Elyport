import type { Metadata } from "next";
import { Callout, Cards, Glance, H2 } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = {
  title: "Docs",
  description: "Elyport is the gas and builder toolkit for Elysium: Refuel, Gas Drop, Locker and Vesting. Start here.",
};

export default function DocsHome() {
  return (
    <DocPage
      href="/docs"
      minutes={4}
      lead="Elyport is the gas and builder toolkit for Elysium. Get HYPE for gas from the chain you already use, send tokens to hundreds of wallets, lock liquidity and run vesting, all from one place."
    >
      <H2 id="why">Why Elyport exists</H2>
      <p>
        Elysium is a high-performance Layer 2 for Hyperliquid, built by Kinetiq. It settles to HyperEVM, uses{" "}
        <strong>HYPE as gas</strong> and produces a block every 100 ms. That speed is great for builders, but every new wallet
        starts with the same problem: no HYPE on Elysium means no transactions.
      </p>
      <p>
        Launching a token adds more chores on top: airdrops to a community, a liquidity lock holders can check, and vesting for the
        team and investors. Elyport puts these jobs into four simple tools with public, verified contracts.
      </p>

      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["Network", "Elysium mainnet · 99901"],
          ["Gas token", "HYPE"],
          ["Tools", "Refuel, Gas Drop, Locker, Vesting"],
          ["Pay from", "7 chains"],
          ["Contracts", "10 deployed, all verified"],
          ["Sign-up", "None. Just a wallet"],
        ]}
      />

      <H2 id="tools">The tools</H2>
      <Cards
        items={[
          { href: "/docs/refuel", title: "Gas Refuel", blurb: "Pay on Ethereum, Base, Arbitrum, BNB and more. Receive HYPE on Elysium.", icon: "drop" },
          { href: "/docs/gas-drop", title: "Gas Drop", blurb: "Send HYPE or any token to up to 500 wallets per transaction.", icon: "send" },
          { href: "/docs/locker", title: "Locker", blurb: "Lock LP or tokens on one date or in tranches. Never shortened.", icon: "lock" },
          { href: "/docs/vesting", title: "Vesting", blurb: "Cliffs, linear or monthly release, up to 100 wallets at once.", icon: "bars" },
        ]}
      />

      <H2 id="pages">Pages you can share</H2>
      <p>Everything Elyport creates gets a public page, so holders can check it without trusting anyone&apos;s screenshot.</p>
      <ul>
        <li>
          <strong>Token pages</strong> show every lock behind a token, how much of the supply is locked and how much of each LP pair.
        </li>
        <li>
          <strong>Claim pages</strong> give your holders one link to find and claim their vesting.
        </li>
        <li>
          <strong>Lock badges</strong> put a live &ldquo;liquidity locked&rdquo; badge on your website.
        </li>
      </ul>

      <H2 id="build">Build on Elyport</H2>
      <p>Projects and developers can bring Elyport into their own products.</p>
      <Cards
        items={[
          { href: "/docs/widgets", title: "Widgets", blurb: "Claim and lock widgets for any website, two lines of HTML.", icon: "embed" },
          { href: "/docs/api", title: "Public API", blurb: "Locks and vesting as JSON. Free, no key.", icon: "api" },
          { href: "/docs/sdk", title: "SDK", blurb: "Lock, vest and drop from your own app.", icon: "package" },
        ]}
      />

      <Callout kind="tip" title="New to Elysium?">
        Start with <a href="/docs/connect">Connect to Elysium</a>, then <a href="/docs/getting-hype">Get HYPE for gas</a>. Two
        minutes and your wallet is ready.
      </Callout>

      <H2 id="independent">An independent tool</H2>
      <p>
        Elyport is built by an independent team and is not affiliated with Kinetiq or Elysium. The app and the contracts are open
        source on GitHub, and every contract is verified on its explorer. See <a href="/docs/contracts">Contracts</a> for the
        addresses.
      </p>
    </DocPage>
  );
}
