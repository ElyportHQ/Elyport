import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalPage href="/privacy" lead="No sign-up, no email, no advertising trackers. Here is what is public and what stays on your device." updated="November 2026">
      <p>Elyport does not ask for your name, email or any account. There is no sign-up.</p>
      <h2 id="what-is-public">What is public</h2>
      <p>
        Everything you do through Elyport is a blockchain transaction. Addresses, amounts and timestamps are public on-chain
        and visible in block explorers. Lock and vesting pages show this public data.
      </p>
      <h2 id="what-stays-on-your-device">What stays on your device</h2>
      <p>Your recent refuels are kept in your browser&apos;s local storage so you can see them again. Clearing site data removes them.</p>
      <h2 id="third-parties">Third parties</h2>
      <p>
        Wallet connections use Reown (WalletConnect). Prices come from CoinGecko. Blockchain data comes from public RPC
        providers. Each has its own privacy policy. Page views are counted with Vercel Web Analytics, which uses no cookies and
        does not identify you.
      </p>
    </LegalPage>
  );
}
