import type { Metadata } from "next";
import { Callout, H2, Step, Steps } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Claim pages", description: "One link where every holder of a vesting schedule can find and claim their tokens." };

export default function ClaimPagesDoc() {
  return (
    <DocPage href="/docs/claim-pages" minutes={2} lead="Created vesting for 80 wallets? Post one link. Each holder connects and sees only their own schedules, ready to claim.">
      <H2 id="link">The link</H2>
      <p>Every token with vesting on Elyport has a claim page:</p>
      <CodeBlock label="Claim page" code="https://elyport.com/claim/<token address>" />
      <p>
        When you finish creating schedules, the success screen links straight to it. It also has its own preview image, so it
        looks good when you post it on X or Telegram.
      </p>

      <H2 id="holders">What holders see</H2>
      <Steps>
        <Step title="Connect">The page finds every schedule for this token where their wallet is the recipient.</Step>
        <Step title="Claim">One button claims everything that is available. With several schedules it becomes Claim all.</Step>
        <Step title="Remind me">
          A calendar file for the next release date, so holders come back on time. Works with Google Calendar, Apple Calendar and
          Outlook.
        </Step>
      </Steps>

      <Callout kind="tip">
        Pin the claim link in your Telegram or Discord. Holders stop asking &ldquo;when can I claim?&rdquo;: the page tells them
        the next date and amount.
      </Callout>
    </DocPage>
  );
}
