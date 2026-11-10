import type { Metadata } from "next";
import { Callout, Glance, H2, Step, Steps } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Gas Drop", description: "Send HYPE or any token to up to 500 wallets per transaction on Elysium." };

export default function GasDropDoc() {
  return (
    <DocPage href="/docs/gas-drop" minutes={3} lead="Paste a list or upload a CSV and send HYPE or any token to every wallet. Big lists are split into batches for you.">
      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["Assets", "HYPE or any ERC-20"],
          ["Per transaction", "Up to 500 wallets"],
          ["Batch size in the app", "400 wallets"],
          ["Fee", "0.04 HYPE per batch"],
        ]}
      />

      <H2 id="format">List format</H2>
      <p>One wallet per line: an address, then the amount in whole tokens. Commas, spaces, semicolons and tabs all work as separators.</p>
      <CodeBlock
        label="recipients.csv"
        code={`0x1111111111111111111111111111111111111111,25
0x2222222222222222222222222222222222222222,12.5
0x3333333333333333333333333333333333333333,100`}
      />
      <p>
        Want everyone to get the same amount? Paste only the addresses and set one amount for all. Before you send, duplicate
        addresses are counted and dropped (the first line wins) and invalid lines are listed so you can fix them.
      </p>

      <H2 id="steps">Send a drop</H2>
      <Steps>
        <Step title="Choose HYPE or a token">For a token, paste its contract address. Elyport reads the name, decimals and your balance.</Step>
        <Step title="Add recipients">Paste the list or upload a CSV. The summary shows wallets, total and number of batches.</Step>
        <Step title="Approve (tokens only)">One approval covers the total. HYPE drops skip this step.</Step>
        <Step title="Send each batch">Confirm one transaction per batch. Each finished batch links to the explorer.</Step>
      </Steps>

      <H2 id="refused">When a wallet refuses HYPE</H2>
      <p>
        Some contracts cannot receive HYPE. Instead of failing the whole batch, that wallet&apos;s share is sent back to you and
        the rest of the drop goes through.
      </p>

      <Callout kind="tip">
        Your sent drops show up in <a href="/docs/my-elyport">My Elyport</a>, read straight from the chain.
      </Callout>
    </DocPage>
  );
}
