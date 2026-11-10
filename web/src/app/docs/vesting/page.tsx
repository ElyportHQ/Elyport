import type { Metadata } from "next";
import { Callout, Glance, H2, Step, Steps } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Vesting", description: "Token vesting on Elysium with cliffs, linear or monthly release, for one wallet or up to 100 at once." };

export default function VestingDoc() {
  return (
    <DocPage href="/docs/vesting" minutes={4} lead="Create vesting for a team, investors or a community. Nothing is claimable before the cliff; after that, tokens release over time, every second or every 30 days.">
      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["Recipients", "1, or up to 100 per transaction"],
          ["Cliff", "None, 1, 3, 6 or 12 months"],
          ["Duration", "3 to 36 months"],
          ["Fee", "0.133 HYPE per create"],
        ]}
      />

      <H2 id="release">How release works</H2>
      <p>
        A schedule has a start date, a cliff and a duration. Before <strong>start + cliff</strong> nothing can be claimed. After
        that, the vested share grows with the time since the start date:
      </p>
      <ul>
        <li>
          <strong>Linear</strong>: unlocks a little every second.
        </li>
        <li>
          <strong>Monthly</strong>: unlocks in 30-day steps.
        </li>
      </ul>
      <p>
        Example: 1,200 tokens, 3-month cliff, 12 months, monthly. Nothing until month 3, then 300 tokens become claimable at once
        (3 months&apos; worth), then 100 more every 30 days until month 12.
      </p>

      <H2 id="create">Create schedules</H2>
      <Steps>
        <Step title="Paste the token">Elyport reads its symbol, decimals and your balance.</Step>
        <Step title="One wallet or many">For many, paste or upload a CSV with one wallet and amount per line, up to 100.</Step>
        <Step title="Set start, cliff and duration">The start can be today or a future date, up to 10 years ahead.</Step>
        <Step title="Linear or Monthly, cancellable or not">Decide this before you create. It cannot be changed later.</Step>
        <Step title="Approve and create">One approval and one transaction for the whole list. One fee per transaction.</Step>
      </Steps>
      <CodeBlock
        label="team.csv"
        code={`0x1111111111111111111111111111111111111111,500000
0x2222222222222222222222222222222222222222,250000
0x3333333333333333333333333333333333333333,250000`}
      />

      <H2 id="claim">Claiming</H2>
      <p>
        Recipients claim on the schedule page, on the token&apos;s <a href="/docs/claim-pages">claim page</a> or in{" "}
        <a href="/docs/my-elyport">My Elyport</a>. Anyone can trigger a claim, but tokens always go to the recipient. A recipient
        can also move their schedule to a new wallet from the Vesting contract.
      </p>

      <H2 id="cancel">Cancellable schedules</H2>
      <p>
        If you mark a schedule as cancellable, you can stop it later. What has already vested stays with the recipient and can
        still be claimed; the rest returns to you. Holders see on every page whether a schedule is cancellable.
      </p>
      <Callout kind="tip">
        For investors and public token sales, non-cancellable schedules build more trust. Use cancellable ones for team members
        who might leave.
      </Callout>
    </DocPage>
  );
}
