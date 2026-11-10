import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Lock badge", description: "Embed a live 'liquidity locked' badge for your token on any website or README." };

export default function BadgeDoc() {
  return (
    <DocPage href="/docs/badge" minutes={2} lead="A small live badge for your website or GitHub README that shows how much of your token or liquidity is locked, and until when.">
      <H2 id="preview">Preview</H2>
      <p>The badge is an image that Elyport draws from on-chain data:</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/badge/0x0000000000000000000000000000000000000000" alt="Example Elyport badge" height={36} style={{ display: "block", margin: "8px 0 20px" }} />

      <H2 id="embed">Embed it</H2>
      <p>Replace the address with your token&apos;s contract address.</p>
      <CodeBlock
        label="HTML"
        code={`<a href="https://elyport.com/token/0xYourToken">
  <img src="https://elyport.com/badge/0xYourToken" alt="Locked on Elyport" height="36">
</a>`}
      />
      <CodeBlock label="Markdown" code={`[![Locked on Elyport](https://elyport.com/badge/0xYourToken)](https://elyport.com/token/0xYourToken)`} />
      <p>Your token page also has a ready-made snippet with the address filled in.</p>

      <H2 id="states">What it shows</H2>
      <SpecTable
        head={["Situation", "Badge"]}
        rows={[
          ["LP locked", "Liquidity locked · 92% · until Nov 2027"],
          ["Tokens locked, no LP lock", "TOKEN locked · 15% of supply"],
          ["No active locks", "Elyport · No active locks"],
        ]}
      />
      <p>The image refreshes every 5 minutes, so it follows new locks and withdrawals by itself.</p>

      <Callout kind="tip">
        The badge links to your token page, where anyone can verify each lock on the explorer.
      </Callout>
    </DocPage>
  );
}
