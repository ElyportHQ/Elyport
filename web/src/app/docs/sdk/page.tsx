import type { Metadata } from "next";
import { Callout, H2, SpecTable } from "@/components/docs/blocks";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { DocPage } from "@/components/docs/DocPage";
import { githubUrl } from "@/lib/config";

export const metadata: Metadata = { title: "SDK", description: "@elyport/sdk: lock, vest and drop on Elysium from any TypeScript app. Built on viem." };

export default function SdkDoc() {
  return (
    <DocPage href="/docs/sdk" minutes={4} lead="Add locks, tranche locks, vesting and gas drops to your own app, launchpad or bot. TypeScript, built on viem, MIT licensed.">
      <H2 id="install">Install</H2>
      <CodeBlock label="npm" code="npm install @elyport/sdk viem" />
      <p>
        The source lives in the <a href={`${githubUrl}/tree/main/sdk`} target="_blank" rel="noreferrer">sdk folder on GitHub</a>.
        Package page: <a href="https://www.npmjs.com/package/@elyport/sdk" target="_blank" rel="noreferrer">npmjs.com/package/@elyport/sdk</a>.
        It ships the Elysium chain, the contract addresses and the ABIs, so there is nothing to configure.
      </p>

      <H2 id="setup">Set up</H2>
      <CodeBlock
        label="TypeScript"
        code={`import { createWalletClient, custom } from "viem";
import { createElyport, elysium } from "@elyport/sdk";

const walletClient = createWalletClient({ chain: elysium, transport: custom(window.ethereum), account });
const ely = createElyport({ walletClient });`}
      />
      <p>Only reading? Call <code>createElyport()</code> with no options and it uses the public Elysium RPC.</p>

      <H2 id="lock">Lock and tranches</H2>
      <CodeBlock
        label="Locks"
        code={`// One date. Approves first if needed and pays the fee for you.
const hash = await ely.locks.create({
  token: lpToken,
  amount: parseUnits("1000", 18),
  unlockAt: new Date("2027-01-01"),
  isLP: true,
});
const [lockId] = ely.locks.idsFromReceipt(await ely.wait(hash));

// 25% every quarter, one transaction
await ely.locks.createTranches({
  token,
  tranches: [3, 6, 9, 12].map((m) => ({ amount: parseUnits("250000", 18), unlockAt: new Date(Date.UTC(2027, m - 1, 1)) })),
});`}
      />

      <H2 id="vesting">Vesting</H2>
      <CodeBlock
        label="Vesting"
        code={`await ely.vesting.create({
  token,
  recipients: [
    { address: alice, amount: parseUnits("500000", 18) },
    { address: bob, amount: parseUnits("250000", 18) },
  ],
  start: new Date(),
  cliff: 90 * 86_400,      // seconds
  duration: 360 * 86_400,  // seconds
  release: "monthly",      // or "linear"
  cancellable: true,
});

const amount = await ely.vesting.claimable(7n);
await ely.vesting.claim(7n);`}
      />

      <H2 id="drop">Gas Drop</H2>
      <CodeBlock
        label="Drops"
        code={`await ely.drop.native([{ address: bob, amount: parseUnits("0.05", 18) }]);
await ely.drop.token(token, recipients); // up to 500 per call`}
      />

      <H2 id="reference">Reference</H2>
      <SpecTable
        head={["Area", "Methods"]}
        rows={[
          ["locks", "create, createTranches, extend, topUp, transfer, withdraw, get, count, idsByToken, idsByOwner, idsFromReceipt"],
          ["vesting", "create, claim, cancel, transfer, get, claimable, vestedAt, count, idsByToken, idsByRecipient, idsByCreator, idsFromReceipt"],
          ["drop", "native, token"],
          ["fees", "lock, vesting, drop (holder discount applied)"],
          ["other", "wait, addresses, chain, publicClient"],
        ]}
      />
      <p>
        The package also exports <code>createElyportApi()</code> for the <a href="/docs/api">public API</a>, <code>widgetUrls()</code>{" "}
        for <a href="/docs/widgets">widgets</a>, the raw ABIs, <code>ELYPORT_ADDRESSES</code> and <code>LIMITS</code>.
      </p>

      <Callout kind="note">
        Transactions are sent from the wallet you pass in, and fees go to the Elyport contracts exactly as in the app. The SDK
        never holds keys.
      </Callout>
    </DocPage>
  );
}
