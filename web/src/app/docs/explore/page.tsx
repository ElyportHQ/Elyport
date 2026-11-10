import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Explore & token pages", description: "Browse every lock on Elyport and check how much of a token's supply and liquidity is locked." };

export default function ExploreDoc() {
  return (
    <DocPage href="/docs/explore" minutes={3} lead="Before you buy a token on Elysium, check what is locked behind it. Explore lists every lock; token pages put it all together for one token.">
      <H2 id="explore">Explore all locks</H2>
      <p>
        <a href="/locks">Explore</a> loads the newest 200 locks straight from the chain. Search by token name, symbol or address,
        then narrow the list:
      </p>
      <SpecTable
        head={["Filter", "Shows"]}
        rows={[
          ["All / LP / Tokens", "Liquidity locks, regular token locks, or both"],
          ["Unlocking in 7 days", "Locks that open within a week"],
          ["Active only", "Hides locks that were already withdrawn"],
          ["Newest / Unlocking soon", "Sort order"],
        ]}
      />
      <p>
        LP locks show the pair they belong to, for example HYPE / TOKEN, so you know which market is protected. Pairs that don&apos;t
        come from a known DEX get an <strong>Unverified pair</strong> label and don&apos;t count as locked liquidity.
      </p>

      <H2 id="token-page">Token pages</H2>
      <p>
        Open <code>/token/[address]</code>, or paste an address into search (⌘K). The page reads everything live:
      </p>
      <ul>
        <li>
          <strong>Supply locked</strong>: the share of the token&apos;s total supply held in Elyport locks, as a bar.
        </li>
        <li>
          <strong>Liquidity locked</strong>: for each LP pair that contains the token, the share of that pair&apos;s LP supply
          that is locked.
        </li>
        <li>
          <strong>Every lock</strong>, with owner, amount and unlock date, and every vesting schedule for the token.
        </li>
        <li>
          <strong>Badge and claim page</strong> buttons, when the token has locks or vesting.
        </li>
      </ul>

      <H2 id="reading">Reading the numbers</H2>
      <p>
        A high liquidity lock with a far unlock date makes a rug pull through the locked LP impossible until that date. It does not
        cover liquidity outside the lock, tokens in other wallets, or the token&apos;s own code.
      </p>
      <Callout kind="warn">
        A lock shows that tokens are held, not that a token is safe. Check who owns the token contract, how the supply is spread,
        and whether the team can mint more.
      </Callout>
    </DocPage>
  );
}
