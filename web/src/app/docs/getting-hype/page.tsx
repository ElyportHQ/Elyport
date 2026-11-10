import type { Metadata } from "next";
import { Callout, Cards, H2, Step, Steps } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Get HYPE for gas", description: "How to get HYPE on Elysium for your first transaction." };

export default function GettingHype() {
  return (
    <DocPage href="/docs/getting-hype" minutes={2} lead="Every transaction on Elysium is paid in HYPE. A small amount goes a long way: a few cents covers many transactions.">
      <H2 id="how-much">How much you need</H2>
      <p>
        Elysium fees are tiny, so $1 to $3 of HYPE is enough for everyday use. If you plan to create locks, vesting or drops,
        add the tool fee on top (see <a href="/docs/fees">Fees &amp; limits</a>).
      </p>

      <H2 id="options">Two ways to get it</H2>
      <Cards
        items={[
          { href: "/refuel", title: "Elyport Refuel", blurb: "Pay on the chain you already use. Instant mode is opening soon.", icon: "drop" },
          { href: "https://elysium.kinetiq.xyz/bridge", title: "Official bridge", blurb: "Move HYPE from HyperEVM into Elysium 1:1.", icon: "fuel", external: true },
        ]}
      />

      <H2 id="route">Route: through the official bridge</H2>
      <p>This works today from any chain, Solana included:</p>
      <Steps>
        <Step title="Get HYPE on HyperEVM">
          Use a bridge such as <a href="https://relay.link/bridge" target="_blank" rel="noreferrer">Relay</a> to swap into HYPE on HyperEVM.
        </Step>
        <Step title="Bridge HYPE into Elysium">
          Open the <a href="https://elysium.kinetiq.xyz/bridge" target="_blank" rel="noreferrer">Elysium bridge</a> and deposit. HYPE moves 1:1.
        </Step>
        <Step title="Check your balance">Switch your wallet to Elysium. Your HYPE shows up there, ready to pay gas.</Step>
      </Steps>

      <Callout kind="note" title="Instant Refuel">
        When Instant mode opens, you pay once on your chain and Elyport sends HYPE to your wallet on Elysium, usually in under a
        minute. No second step. Details in <a href="/docs/refuel">Gas Refuel</a>.
      </Callout>
    </DocPage>
  );
}
