import type { Metadata } from "next";
import { Callout, H2, SpecTable, Step, Steps } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Widgets", description: "Embed an Elyport claim widget or a live lock widget on any website with two lines of HTML." };

const SAMPLE = "0x0000000000000000000000000000000000000000";

export default function WidgetsDoc() {
  return (
    <DocPage href="/docs/widgets" minutes={3} lead="Put Elyport on your own website. Holders claim their vesting without leaving your site, and visitors see your locks live.">
      <H2 id="widgets">Two widgets</H2>
      <SpecTable
        head={["Widget", "What it does", "Wallet"]}
        rows={[
          ["Claim", "Holders connect, see what they can claim and claim it", "Yes"],
          ["Lock", "Liquidity and supply locked, next unlock, latest locks", "No, read-only"],
        ]}
      />
      <div className="doc-embeds">
        <figure>
          <iframe src={`/embed/claim/${SAMPLE}`} title="Claim widget preview" loading="lazy" />
          <figcaption>Claim widget</figcaption>
        </figure>
        <figure>
          <iframe src={`/embed/lock/${SAMPLE}?theme=dark`} title="Lock widget preview" loading="lazy" />
          <figcaption>Lock widget, dark theme</figcaption>
        </figure>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>Previews use an empty sample address. With your token they show your real data.</p>

      <H2 id="install">Add it to your site</H2>
      <Steps>
        <Step title="Paste a placeholder">Put this where the widget should appear, with your token&apos;s contract address.</Step>
        <Step title="Load the script once">It turns every placeholder into a widget and keeps its height right.</Step>
      </Steps>
      <CodeBlock
        label="HTML"
        code={`<div data-elyport="claim" data-token="0xYourToken"></div>
<div data-elyport="lock" data-token="0xYourToken" data-theme="dark"></div>

<script src="https://elyport.com/embed.js" async></script>`}
      />

      <H2 id="options">Options</H2>
      <SpecTable
        head={["Attribute", "Values", "Default"]}
        rows={[
          [<code key="a">data-elyport</code>, "claim or lock", "required"],
          [<code key="b">data-token</code>, "Token contract address", "required"],
          [<code key="c">data-theme</code>, "light or dark", "light"],
          [<code key="d">data-accent</code>, "Button color as hex, e.g. 4a56c2", "dark graphite"],
        ]}
      />

      <H2 id="iframe">Plain iframe</H2>
      <p>No scripts allowed on your site? Use the iframe directly and give it a fixed height.</p>
      <CodeBlock
        label="iframe"
        code={`<iframe src="https://elyport.com/embed/claim/0xYourToken?theme=light&accent=4a56c2"
  style="width:100%;max-width:460px;height:460px;border:0" title="Claim on Elyport"></iframe>`}
      />

      <H2 id="notes">Good to know</H2>
      <ul>
        <li>The widget runs on elyport.com inside the frame. Your site never touches the wallet or the transaction.</li>
        <li>The lock widget refreshes every minute and links each lock to its public page.</li>
        <li>Every widget has an &ldquo;Open on Elyport&rdquo; link, so holders always have a way to the full app.</li>
      </ul>
      <Callout kind="tip" title="Wallet in a frame">
        WalletConnect works everywhere. Some browser-extension wallets don&apos;t connect inside frames; those holders can use
        the &ldquo;Open on Elyport&rdquo; link in the widget.
      </Callout>
    </DocPage>
  );
}
