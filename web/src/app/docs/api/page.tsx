import type { Metadata } from "next";
import { Callout, Glance, H2, SpecTable } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";

export const metadata: Metadata = { title: "Public API", description: "Read Elyport locks, LP locks and vesting on Elysium as JSON. Free, no key, CORS enabled." };

export default function ApiDoc() {
  return (
    <DocPage href="/docs/api" minutes={4} lead="A free, read-only JSON API for everything locked and vesting on Elyport. Built for DEXes, screeners, explorers, bots and dashboards.">
      <H2 id="glance">At a glance</H2>
      <Glance
        items={[
          ["Base URL", "https://elyport.com/api/v1"],
          ["Auth", "None, no API key"],
          ["CORS", "Open to every origin"],
          ["Freshness", "Cached about 30 seconds"],
          ["Rate limit", "About 60 requests a minute per IP"],
        ]}
      />

      <H2 id="endpoints">Endpoints</H2>
      <SpecTable
        head={["GET", "Returns"]}
        rows={[
          [<code key="1">/token/{"{address}"}</code>, "Token info, supply and liquidity locked, every lock and vesting schedule"],
          [<code key="2">/lock/{"{id}"}</code>, "One lock"],
          [<code key="3">/vesting/{"{id}"}</code>, "One vesting schedule, with what is claimable now"],
          [<code key="4">/wallet/{"{address}"}</code>, "Locks a wallet owns, vesting it receives and vesting it created"],
          [<code key="5">/stats</code>, "Total locks and schedules, contract addresses"],
          [<code key="6">/</code>, "Index of endpoints"],
        ]}
      />

      <H2 id="token">Token example</H2>
      <p>The endpoint most integrations need. Show a &ldquo;liquidity locked&rdquo; label next to a pair in one request.</p>
      <CodeBlock label="Request" code="curl https://elyport.com/api/v1/token/0xYourToken" />
      <CodeBlock
        label="Response (shortened)"
        code={`{
  "token": { "address": "0x…", "symbol": "TOKEN", "decimals": 18, "totalSupply": "1000000000000000000000000000" },
  "summary": {
    "activeLocks": 3,
    "supplyLockedPercent": 15.2,
    "bestLiquidityLockedPercent": 92.4,
    "nextUnlock": 1798761600,
    "vestingSchedules": 12
  },
  "liquidity": [
    { "pair": "0x…", "dex": "Uniswap V2", "verified": true, "lockedPercent": 92.4, "lockedUntil": 1830297600, "locks": 1 }
  ],
  "locks": [ { "id": "4", "isLP": true, "amount": "…", "unlockAt": 1830297600, "status": "locked", "url": "https://elyport.com/lock/4" } ],
  "vesting": [ … ],
  "links": { "page": "…", "claim": "…", "badge": "…", "lockWidget": "…", "claimWidget": "…" }
}`}
      />

      <H2 id="format">Data format</H2>
      <ul>
        <li>Amounts are strings in the token&apos;s smallest unit (like wei), so large numbers stay exact.</li>
        <li>Times are Unix timestamps in seconds.</li>
        <li>Percentages are numbers from 0 to 100.</li>
        <li>Lock status is <code>locked</code>, <code>unlocked</code> or <code>withdrawn</code>.</li>
        <li>
          <code>bestLiquidityLockedPercent</code> only counts pairs with <code>verified: true</code>, meaning the pair comes from a
          known DEX factory.
        </li>
        <li>
          <code>launchLiquidity</code> is set for tokens launched on Montra, whose liquidity is a Uniswap v4 pool position rather
          than an LP token. It is only filled after the launch transaction is checked on-chain.
        </li>
      </ul>

      <H2 id="errors">Errors</H2>
      <SpecTable
        head={["Status", "When"]}
        rows={[
          ["400", "The address or id is not valid"],
          ["404", "That lock or schedule does not exist"],
          ["429", "Too many requests, slow down or cache on your side"],
          ["502", "Elysium could not be reached, try again shortly"],
        ]}
      />
      <p>
        Errors return <code>{`{ "error": "message" }`}</code>.
      </p>

      <H2 id="js">From JavaScript</H2>
      <CodeBlock
        label="fetch"
        code={`const r = await fetch("https://elyport.com/api/v1/token/" + token);
const { summary } = await r.json();
if (summary.bestLiquidityLockedPercent >= 90) showBadge("Liquidity locked");`}
      />
      <Callout kind="note">
        The API reads straight from the contracts, so it shows the same data as the explorer. For live trading decisions, read the
        contracts directly with the <a href="/docs/sdk">SDK</a>.
      </Callout>
    </DocPage>
  );
}
