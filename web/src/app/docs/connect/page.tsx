import type { Metadata } from "next";
import { Callout, Glance, H2, SpecTable, Step, Steps } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";
import { elysium } from "@/lib/config";

export const metadata: Metadata = { title: "Connect to Elysium", description: "Wallets that work with Elyport and the Elysium network details: chain ID, RPC and explorer." };

export default function Connect() {
  return (
    <DocPage href="/docs/connect" minutes={2} lead="Any EVM wallet works. Elyport adds the Elysium network for you the first time you switch to it.">
      <H2 id="wallets">Supported wallets</H2>
      <p>
        Connect with MetaMask, Rabby, OKX Wallet, Coinbase Wallet or any wallet that supports WalletConnect. On mobile, open
        elyport.com inside your wallet&apos;s browser or scan the WalletConnect QR code.
      </p>

      <H2 id="steps">Connect in three steps</H2>
      <Steps>
        <Step title="Tap Connect wallet">Top right on desktop, or in the menu on mobile. Pick your wallet from the list.</Step>
        <Step title="Approve the connection">Your wallet shows which site is asking. Elyport never asks for a seed phrase or a private key.</Step>
        <Step title="Switch to Elysium">
          When a tool needs Elysium, Elyport asks your wallet to switch. If the network is new to your wallet, approve adding it.
        </Step>
      </Steps>

      <H2 id="network">Network details</H2>
      <p>To add Elysium by hand, use these values:</p>
      <Glance
        items={[
          ["Network name", elysium.name],
          ["Chain ID", String(elysium.id)],
          ["Currency symbol", "HYPE"],
          ["RPC URL", elysium.rpcUrls.default.http[0]],
          ["Block explorer", elysium.blockExplorers.default.url],
          ["Block time", "100 ms"],
        ]}
      />

      <H2 id="chains">Chains Elyport talks to</H2>
      <p>Most tools run on Elysium. Refuel also reads and accepts payments on other chains:</p>
      <SpecTable
        head={["Chain", "Used for", "Gas"]}
        rows={[
          ["Elysium", "All tools, locks, vesting, drops", "HYPE"],
          ["Ethereum, Base, Arbitrum", "Refuel payments in ETH or USDC", "ETH"],
          ["Robinhood Chain", "Refuel payments in ETH", "ETH"],
          ["BNB Chain", "Refuel payments in BNB", "BNB"],
          ["HyperEVM", "Refuel payments in HYPE", "HYPE"],
          ["Solana", "Refuel through a bridge (Route)", "SOL"],
        ]}
      />

      <Callout kind="warn">
        Only connect through <strong>elyport.com</strong>. Elyport will never DM you, ask you to &ldquo;validate&rdquo; a wallet,
        or ask for a seed phrase.
      </Callout>
    </DocPage>
  );
}
