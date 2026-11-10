import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Fees & limits", description: "Every Elyport fee and limit: Refuel, Gas Drop, Locker and Vesting." };

export default function FeesDoc() {
  return (
    <DocPage href="/docs/fees" minutes={2} lead="Flat, small fees paid in HYPE, plus 0.5% on refuels. The exact fee is read from the contract and shown before you confirm.">
      <H2 id="fees">Fees</H2>
      <SpecTable
        head={["Tool", "Fee", "Charged"]}
        rows={[
          ["Refuel", "0.5% of the amount", "Taken from what you pay"],
          ["Gas Drop", "0.04 HYPE", "Per batch (up to 500 wallets)"],
          ["Locker", "0.133 HYPE", "Per lock; per tranche in tranche mode"],
          ["Vesting", "0.133 HYPE", "Per create transaction (up to 100 wallets)"],
        ]}
      />
      <p>Network gas on Elysium comes on top, and is usually a fraction of a cent.</p>

      <H2 id="limits">Limits</H2>
      <SpecTable
        head={["Limit", "Value"]}
        rows={[
          ["Gas Drop recipients", "500 per transaction (the app sends 400 per batch)"],
          ["Tranches", "20 per transaction"],
          ["Vesting recipients", "100 per transaction"],
          ["Vesting start", "Up to 10 years ahead"],
          ["Lock note", "280 characters"],
          ["Instant Refuel", "$1 to $10 per payment, $20 per wallet per day, plus a daily total"],
        ]}
      />

      <H2 id="discount">Holder discount</H2>
      <p>
        The Locker, Vesting and Gas Drop contracts support a discount for wallets that hold a set amount of a chosen token. When it
        is on, the app shows the normal fee crossed out next to your discounted fee. It is currently <strong>off</strong>; it will
        be announced on X when it starts.
      </p>

      <H2 id="caps">Hard caps</H2>
      <p>The owner can change fees, but the contracts refuse anything above a fixed ceiling written into their code:</p>
      <SpecTable
        head={["Contract", "Fee today", "Can never exceed"]}
        rows={[
          ["Locker", "0.133 HYPE", "1 HYPE"],
          ["Vesting", "0.133 HYPE", "1 HYPE"],
          ["Gas Drop", "0.04 HYPE", "0.5 HYPE"],
          ["Refuel vault, per payment", "0.16 HYPE", "1 HYPE"],
          ["Refuel vault, per wallet per day", "0.3 HYPE", "3 HYPE"],
          ["Refuel vault, per day", "1.4 HYPE", "50 HYPE"],
        ]}
      />

      <Callout kind="note">
        A fee change never touches existing locks or vesting. The app always reads the live fee before you sign.
      </Callout>
    </DocPage>
  );
}
