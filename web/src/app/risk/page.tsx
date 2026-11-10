import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Risk" };

export default function Risk() {
  return (
    <LegalPage href="/risk" lead="Read this before you use Elyport. Smart contracts, bridges and new networks all carry risk." updated="November 2026">
      <h2 id="smart-contracts">Smart contracts</h2>
      <p>
        Elyport&apos;s contracts are built on OpenZeppelin libraries and tested, but they have not been audited yet. A bug could
        lead to loss of funds. Locks and vesting cannot be undone early, even by Elyport.
      </p>
      <h2 id="refuel-and-bridges">Refuel and bridges</h2>
      <p>
        Instant refuels depend on a relayer and a HYPE stock. Payments that cannot be delivered are refunded on the chain you
        paid from, but delays are possible. Route refuels use third-party bridges with their own risks.
      </p>
      <h2 id="a-new-network">A new network</h2>
      <p>
        Elysium launched recently. Its parameters, bridges and sequencer may change. Withdrawals from Elysium to HyperEVM
        follow the network&apos;s challenge period.
      </p>
      <h2 id="tokens">Tokens</h2>
      <p>A lock or vesting schedule shows that tokens are held, not that a token is safe or valuable. Do your own research.</p>
    </LegalPage>
  );
}
