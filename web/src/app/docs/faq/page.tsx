import type { Metadata } from "next";
import { Faq, H2 } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "FAQ", description: "Quick answers about Elyport, Elysium, fees, locks and vesting." };

export default function FaqDoc() {
  return (
    <DocPage href="/docs/faq" minutes={3} lead="Short answers to what people ask most. Missing something? Ask us on X.">
      <H2 id="general">General</H2>
      <Faq
        items={[
          ["Do I need an account?", "No. Connect a wallet and use any tool. There is no sign-up and no email."],
          ["Is Elyport part of Kinetiq or Elysium?", "No. Elyport is an independent tool built for Elysium."],
          ["Which wallets work?", <>MetaMask, Rabby, OKX, Coinbase Wallet and anything with WalletConnect. See <a href="/docs/connect">Connect to Elysium</a>.</>],
          ["Is it open source?", <>Yes. The contracts and the app are on GitHub, and every contract is verified. See <a href="/docs/contracts">Contracts</a>.</>],
        ]}
      />

      <H2 id="gas">Gas &amp; Refuel</H2>
      <Faq
        items={[
          ["I have no HYPE on Elysium. What now?", <>Use Route on the Refuel page today, or Instant once it opens. See <a href="/docs/getting-hype">Get HYPE for gas</a>.</>],
          ["Can I refuel from Solana?", "Yes, through Route: bridge to HyperEVM first, then into Elysium."],
          ["What if my refuel can't be delivered?", "It's refunded on the chain you paid from."],
        ]}
      />

      <H2 id="locks">Locks</H2>
      <Faq
        items={[
          ["Can I unlock early?", "No. Not you, not Elyport, nobody. You can only extend a lock."],
          ["Can I lock for my team's multisig?", "Yes. Set the multisig as the wallet that withdraws when you create the lock."],
          ["Why doesn't tranche mode accept my token?", "Tokens that take a fee on transfer can't be split exactly. Lock them with a single date instead."],
          ["Where do holders see my lock?", "On the lock page, the token page, Explore and the lock badge."],
          ["Can I lock a Uniswap V3 or V4 position?", "Not yet. Only LP tokens (Uniswap V2 style pairs) and regular tokens can be locked today."],
          ["Why does my LP lock say Unverified pair?", <>Its pair isn&apos;t from a DEX factory Elyport recognises, so it isn&apos;t counted as locked liquidity. See <a href="/docs/security">Security model</a>.</>],
        ]}
      />

      <H2 id="vesting">Vesting</H2>
      <Faq
        items={[
          ["Do recipients pay a fee to claim?", "Only Elysium gas, which is a fraction of a cent."],
          ["Can I change a schedule after creating it?", "No. You can only cancel it, if you marked it cancellable."],
          ["A recipient lost their wallet. Can I move the schedule?", "Only the recipient can move a schedule to a new wallet. Plan for this with cancellable schedules if needed."],
        ]}
      />
    </DocPage>
  );
}
