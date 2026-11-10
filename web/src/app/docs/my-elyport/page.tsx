import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "My Elyport", description: "Your dashboard on Elyport: vesting to claim, locks to withdraw, schedules you created and drops you sent." };

export default function MyElyportDoc() {
  return (
    <DocPage href="/docs/my-elyport" minutes={2} lead="Everything your wallet has on Elyport, in one page. Connect and see what you can claim, what you can withdraw and what you created.">
      <H2 id="sections">What&apos;s on the page</H2>
      <SpecTable
        head={["Section", "Shows", "Actions"]}
        rows={[
          ["Vesting paying you", "Schedules where you are the recipient", "Claim, Claim all"],
          ["My locks", "Locks you own, with countdowns", "Withdraw after unlock"],
          ["Vesting you created", "Schedules you funded", "Open each schedule"],
          ["Drops you sent", "Every Gas Drop batch from your wallet", "Open on the explorer"],
        ]}
      />

      <H2 id="data">Where the data comes from</H2>
      <p>
        Nothing is stored by Elyport. The page reads the Locker, Vesting and Gas Drop contracts directly for the connected wallet,
        so it shows the same thing on any device and it can never be out of date.
      </p>

      <Callout kind="note">
        Open it any time at <a href="/me">elyport.com/me</a>, or from <strong>My Elyport</strong> in the menu.
      </Callout>
    </DocPage>
  );
}
