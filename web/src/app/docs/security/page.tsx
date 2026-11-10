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
          ["You can refund a stuck refuel yourself after 24 hours", "Deposit contract: claimRefund, works even while paused"],
          ["Fees can never exceed a fixed ceiling", "Locker, Vesting, Drop: MAX_*_FEE constants"],
          ["Refuel limits can never exceed a fixed ceiling", "Refuel vault: CEILING_* constants"],
        ]}
      />

      <H2 id="owner">What the owner can change</H2>
      <p>
        The owner can set fees and refuel limits (both only up to their hard ceilings, see <a href="/docs/fees">Fees &amp;
        limits</a>), the holder discount and the relayer, and can pause Refuel. The owner cannot touch locked or vesting tokens,
        and cannot stop you from refunding a stuck refuel. See <a href="/docs/contracts">Contracts</a> for the addresses.
      </p>
      <Callout kind="note" title="Owner today">
        The owner is currently a single wallet, kept separate from the deployer and the relayer. Moving it to a multisig is
        planned; this page will say so when it happens.
      </Callout>

      <H2 id="lp">How LP locks are checked</H2>
      <p>
        The Locker accepts any contract that looks like a liquidity pair. To stop a fake pair from showing &ldquo;liquidity
        locked&rdquo;, Elyport only counts an LP lock as liquidity when its pair comes from a known DEX factory and that factory
        confirms the pair (today: Uniswap V2 on Elysium). Other LP locks are shown with an <strong>Unverified pair</strong>{" "}
        label and are left out of the badge, the widget and the API&apos;s liquidity figures.
      </p>

      <H2 id="limits">Known limits</H2>
      <ul>
        <li>
          <strong>Rebasing tokens</strong> (balances that shrink or grow by themselves) are not supported. If a balance shrinks,
          the last withdrawal can fail.
        </li>
        <li>
          <strong>Uniswap V3 and V4 positions</strong> are NFTs or pool-manager balances, not LP tokens, so they can&apos;t be
          locked yet.
        </li>
        <li>
          <strong>Gas Drop</strong>: if a wallet refuses HYPE, its share comes back to you, but the batch fee is still charged.
        </li>
      </ul>

      <H2 id="refuel">How Refuel is protected</H2>
      <ul>
        <li>The vault holds only a small working stock of HYPE.</li>
        <li>Caps per transaction, per wallet per day and per day limit what can leave, and the caps themselves have fixed ceilings.</li>
        <li>HYPE is sent only after the payment has block confirmations, keyed to the payment&apos;s full contents.</li>
        <li>Prices come from three sources; quotes stop if they disagree.</li>
        <li>Each payment can be delivered only once.</li>
        <li>Both the vault and the deposit contracts can be paused.</li>
        <li>
          An independent check every 5 minutes confirms each delivered refuel was really paid by the vault and each vault payout
          matches a real deposit. Its live result is on <a href="/docs/status">Live status</a>.
        </li>
      </ul>

      <H2 id="build">How it&apos;s built</H2>
      <ul>
        <li>OpenZeppelin 5.1: Ownable2Step, ReentrancyGuard, SafeERC20, Pausable.</li>
        <li>Foundry tests run on every change.</li>
        <li>Verified source on the Elysium explorer.</li>
        <li>
          Owner, fees, caps and balances of every contract can be checked live on <a href="/docs/status">Live status</a>.
        </li>
      </ul>

      <H2 id="review">Reviews</H2>
      <p>
        The v3 contracts went through an{" "}
        <a href="https://github.com/ElyportHQ/Elyport/blob/main/audits/2026-11-internal-review.md" target="_blank" rel="noreferrer">
          internal security review
        </a>{" "}
        with fuzzed property tests: 0 critical, 0 high, 2 medium (one fixed, one mitigated) and 5 low findings (three fixed).
      </p>
      <Callout kind="warn" title="Not independently audited yet">
        The internal review is not a third-party audit. Smart contracts and bridges always carry risk. Only use amounts you are
        comfortable with, and read <a href="/risk">Risks</a>.
      </Callout>

      <H2 id="bounty">Bug bounty</H2>
      <p>Found a vulnerability? Report it privately and get paid if it is valid and new.</p>
      <SpecTable
        head={["Severity", "Reward"]}
        rows={[
          ["Critical: anyone can take locked, vested or refuel funds", "up to $5,000"],
          ["High: funds frozen for good, or a lock shortened", "up to $1,500"],
          ["Medium: double refuel, or less than the user's minimum", "up to $500"],
          ["Low: misleading data in the badge, API or widgets", "up to $100"],
        ]}
      />
      <p>Full rules are in SECURITY.md on GitHub. Test only on a fork or testnet, never on other people&apos;s funds.</p>

      <H2 id="report">Report a problem</H2>
      <p>
        Found a bug or a vulnerability? Follow <a href="https://github.com/ElyportHQ/Elyport/blob/main/SECURITY.md" target="_blank" rel="noreferrer">SECURITY.md</a>{" "}
        on GitHub. Please don&apos;t post vulnerabilities publicly.
      </p>
    </DocPage>
  );
}
