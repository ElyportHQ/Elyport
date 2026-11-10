import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Security model", description: "What Elyport's contracts guarantee, what they don't, and how Refuel is protected." };

export default function SecurityDoc() {
  return (
    <DocPage href="/docs/security" minutes={3} lead="What the contracts guarantee, who can change what, and the risks that remain. Read this before locking or vesting large amounts.">
      <H2 id="guarantees">What the contracts guarantee</H2>
      <SpecTable
        head={["Guarantee", "Enforced by"]}
        rows={[
          ["A lock can never be shortened", "Locker: a new date must be later"],
          ["Only the lock owner withdraws, after the date", "Locker"],
          ["Vested tokens always go to the recipient", "Vesting: anyone can trigger, nobody can redirect"],
          ["Cancelling keeps what already vested", "Vesting"],
          ["Pending refuel payments stay refundable", "Deposit contract: reserved funds can't be swept"],
        ]}
      />

      <H2 id="owner">What the owner can change</H2>
      <p>
        The owner can set fees, the holder discount, refuel limits and the relayer, and can pause Refuel. The owner cannot touch
        locked or vesting tokens. See <a href="/docs/contracts">Contracts</a> for the addresses.
      </p>

      <H2 id="refuel">How Refuel is protected</H2>
      <ul>
        <li>The vault holds only a small working stock of HYPE.</li>
        <li>Caps per transaction, per wallet per day and per day limit what can leave.</li>
        <li>Each payment can be delivered only once.</li>
        <li>Both the vault and the deposit contracts can be paused.</li>
      </ul>

      <H2 id="build">How it&apos;s built</H2>
      <ul>
        <li>OpenZeppelin 5.1: Ownable2Step, ReentrancyGuard, SafeERC20, Pausable.</li>
        <li>Foundry tests run on every change.</li>
        <li>Verified source on the Elysium explorer.</li>
      </ul>

      <Callout kind="warn" title="Not audited yet">
        The contracts have not had a third-party audit. Smart contracts and bridges always carry risk. Only use amounts you are
        comfortable with, and read <a href="/risk">Risks</a>.
      </Callout>

      <H2 id="report">Report a problem</H2>
      <p>
        Found a bug or a vulnerability? Follow <a href="https://github.com/ElyportHQ/Elyport/blob/main/SECURITY.md" target="_blank" rel="noreferrer">SECURITY.md</a>{" "}
        on GitHub. Please don&apos;t post vulnerabilities publicly.
      </p>
    </DocPage>
  );
}
