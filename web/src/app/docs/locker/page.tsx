import type { Metadata } from "next";
import { Callout, Glance, H2, SpecTable, Step, Steps } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Locker", description: "Lock LP tokens or regular tokens on Elysium, on one date or in up to 20 tranches. Locks can never be shortened." };

export default function LockerDoc() {
  return (
    <DocPage href="/docs/locker" minutes={4} lead="Lock LP tokens or regular tokens until a date you choose, or split one lock into tranches that unlock over time. Nobody can shorten a lock, not even Elyport.">
      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["What you can lock", "LP tokens or any ERC-20"],
          ["Unlock plan", "One date or up to 20 tranches"],
          ["Fee", "0.133 HYPE per lock"],
          ["Note", "Up to 280 characters, public"],
        ]}
      />

      <H2 id="create">Create a lock</H2>
      <Steps>
        <Step title="Pick LP token or Token">
          For LP, Elyport checks the contract really is a liquidity pair and reads both of its tokens, so the lock also shows up
          on each token&apos;s page.
        </Step>
        <Step title="Paste the contract and the amount">Use 25%, 50%, 75% or Max, or type an exact amount.</Step>
        <Step title="Choose when it unlocks">
          <p>
            <strong>One date:</strong> 30 days, 90 days, 180 days, 1 year or any custom date.
          </p>
          <p>
            <strong>Tranches:</strong> unlock in parts. Use a preset (Quarterly × 4, Monthly × 12, Every 6 months × 2) or set
            each percentage and date yourself. The total must be 100%.
          </p>
        </Step>
        <Step title="Set who withdraws">Defaults to your wallet. You can lock on behalf of a team or multisig address.</Step>
        <Step title="Approve and lock">One approval, then one transaction, even for 20 tranches. Each tranche becomes its own lock with its own page.</Step>
      </Steps>

      <H2 id="tranches">How tranches work</H2>
      <p>
        A tranche plan creates several locks in a single transaction. Each one has its own amount and unlock date, so a team can
        release 25% every quarter instead of everything at once. The fee is charged per tranche.
      </p>
      <Callout kind="note">
        Tranche mode does not accept tokens that take a fee on transfer, because the amounts would not add up. Lock those tokens
        with a single date instead: Elyport then records exactly what arrived.
      </Callout>

      <H2 id="manage">After locking</H2>
      <SpecTable
        head={["Action", "Who", "Rule"]}
        rows={[
          ["Extend", "Lock owner", "The new date must be later than the current one"],
          ["Top up", "Lock owner", "Adds more tokens to the same lock"],
          ["Transfer", "Lock owner", "Hands the lock to another wallet"],
          ["Withdraw", "Lock owner", "Only after the unlock date, sends everything to the owner"],
          ["Shorten", "Nobody", "Not possible"],
        ]}
      />
      <p>
        Withdraw is in the app under <strong>My locks</strong> and in <a href="/docs/my-elyport">My Elyport</a>. Extend, top up
        and transfer can be called from the Locker contract&apos;s Write tab on the explorer.
      </p>

      <H2 id="public">Public lock pages</H2>
      <p>
        Every lock has a page at <code>/lock/[id]</code> with a countdown, the owner, the amount and the note. It also appears on
        the token&apos;s page at <code>/token/[address]</code>, with the share of supply that is locked. Share either link with
        your community, and add the <a href="/docs/badge">lock badge</a> to your site.
      </p>
    </DocPage>
  );
}
