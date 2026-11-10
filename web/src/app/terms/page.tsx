import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage href="/terms" lead="Elyport is an interface to public smart contracts. You stay in control of your wallet and sign every transaction yourself." updated="November 2026">
      <p>
        Elyport is a set of open interfaces to smart contracts on Elysium and other EVM chains. By using it you agree that you
        act on your own behalf and are responsible for the transactions you sign.
      </p>
      <h2 id="no-custody">No custody</h2>
      <p>
        Elyport never holds your private keys. Locked and vesting tokens are held by smart contracts under the rules written
        in their code. Instant refuels are paid from a HYPE stock held by the refuel vault.
      </p>
      <h2 id="no-warranty">No warranty</h2>
      <p>
        The interface and contracts are provided as is, without warranty of any kind. Elyport is not liable for losses from
        smart contract bugs, network failures, bridges, price changes or user error.
      </p>
      <h2 id="not-affiliated">Not affiliated</h2>
      <p>Elyport is an independent tool. It is not affiliated with, endorsed by or operated by Kinetiq or Elysium.</p>
      <h2 id="restrictions">Restrictions</h2>
      <p>You must not use Elyport where doing so breaks the law that applies to you, including sanctions laws.</p>
      <h2 id="contact">Contact</h2>
      <p>
        Questions: <a href="https://x.com/ElyportHQ" target="_blank" rel="noreferrer">@ElyportHQ on X</a> or a{" "}
        <a href="https://github.com/ElyportHQ/Elyport/issues" target="_blank" rel="noreferrer">GitHub issue</a>. Security
        problems: report privately through{" "}
        <a href="https://github.com/ElyportHQ/Elyport/security/advisories/new" target="_blank" rel="noreferrer">
          GitHub vulnerability reporting
        </a>
        , not in public.
      </p>
    </LegalPage>
  );
}
