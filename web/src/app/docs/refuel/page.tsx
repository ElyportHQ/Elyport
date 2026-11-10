import type { Metadata } from "next";
import { Callout, Glance, H2, SpecTable, Step, Steps } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Gas Refuel", description: "Pay on Ethereum, Base, Arbitrum, Robinhood Chain, BNB Chain or HyperEVM and receive HYPE on Elysium." };

export default function RefuelDoc() {
  return (
    <DocPage href="/docs/refuel" minutes={3} lead="Pay a small amount on the chain you already use and receive HYPE on Elysium. Two modes: Instant from Elyport's HYPE stock, or Route through a bridge.">
      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["Fee", "0.5% of the amount"],
          ["Instant amounts", "$1 to $10"],
          ["Per wallet", "Up to $20 a day"],
          ["Delivery", "Usually under a minute"],
        ]}
      />

      <H2 id="modes">Instant vs Route</H2>
      <SpecTable
        head={["", "Instant", "Route"]}
        rows={[
          ["How", "Pay on your chain, Elyport sends HYPE", "Bridge to HyperEVM, then into Elysium"],
          ["Steps", "One payment", "Two transactions"],
          ["Chains", "Ethereum, Base, Arbitrum, Robinhood, BNB, HyperEVM", "All of them, plus Solana"],
          ["Status", "Opening soon", "Available now"],
        ]}
      />

      <H2 id="instant">How Instant works</H2>
      <Steps>
        <Step title="Pick a chain and an amount">Choose $1, $3, $5 or $10. You see the HYPE you will receive before you pay.</Step>
        <Step title="Pay into the deposit contract">
          Your payment goes to Elyport&apos;s public deposit contract on that chain, with your Elysium address as the recipient.
        </Step>
        <Step title="Receive HYPE on Elysium">
          A relayer sees the confirmed payment and sends HYPE from the refuel vault on Elysium. Your receipt shows both transactions.
        </Step>
      </Steps>

      <H2 id="pay-with">What you can pay with</H2>
      <SpecTable
        head={["Chain", "Pay with"]}
        rows={[
          ["Ethereum", "ETH or USDC"],
          ["Base", "ETH or USDC"],
          ["Arbitrum", "ETH or USDC"],
          ["Robinhood Chain", "ETH"],
          ["BNB Chain", "BNB"],
          ["HyperEVM", "HYPE"],
          ["Solana", "Route only"],
        ]}
      />

      <H2 id="refunds">Refunds</H2>
      <p>
        If a payment cannot be delivered, for example because the HYPE stock is empty or a daily limit is reached, it is refunded
        on the chain you paid from. The money comes straight back out of the deposit contract: pending payments are reserved
        there and the owner cannot sweep them, so a refund never depends on Elyport&apos;s HYPE stock.
      </p>

      <Callout kind="warn" title="Limits keep it safe">
        Instant refuels are capped per transaction, per wallet per day and in total per day. The vault holds only a small working
        stock and can be paused. Need more HYPE? Use Route.
      </Callout>
    </DocPage>
  );
}
