import type { Metadata } from "next";
import { Addr, Callout, H2, SpecTable } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";
import { contracts, explorerAddress, githubUrl } from "@/lib/config";
import { depositContracts, roles } from "@/lib/docs";

export const metadata: Metadata = { title: "Contracts", description: "Every Elyport contract address on Elysium and source chains, verified and open source." };

export default function ContractsDoc() {
  const elysiumRows = [
    ["Locker", contracts.locker, "Locks and tranches"],
    ["Vesting", contracts.vesting, "Vesting schedules"],
    ["Gas Drop", contracts.drop, "Multisend"],
    ["Refuel vault", contracts.refuelVault, "HYPE stock for Instant Refuel"],
  ] as const;

  return (
    <DocPage href="/docs/contracts" minutes={2} lead="Ten contracts, all open source and verified on their explorers. Always check you are interacting with these addresses.">
      <H2 id="elysium">On Elysium</H2>
      <SpecTable
        head={["Contract", "Address", "Role"]}
        rows={elysiumRows.map(([n, a, r]) => [n, a ? <Addr key={n} a={a} href={explorerAddress(a)} /> : "Not set", r])}
      />

      <H2 id="deposits">Refuel deposit contracts</H2>
      <p>Instant Refuel payments go to these contracts. Pending payments stay refundable until they are delivered.</p>
      <SpecTable
        head={["Chain", "Address"]}
        rows={depositContracts.map((d) => [d.chain, <Addr key={d.chain} a={d.address} href={d.explorer + d.address} />])}
      />

      <H2 id="roles">Owner and treasury</H2>
      <SpecTable
        head={["Role", "Address", "Can"]}
        rows={[
          ["Owner", <Addr key="o" a={roles.owner} href={explorerAddress(roles.owner)} />, "Set fees and limits, pause Refuel, set the relayer"],
          ["Treasury", <Addr key="t" a={roles.treasury} href={explorerAddress(roles.treasury)} />, "Receives fees"],
        ]}
      />
      <p>
        The owner cannot move locked tokens, shorten a lock, or touch vesting. Ownership changes use a two-step transfer, so it
        cannot be handed to a wrong address by mistake.
      </p>

      <H2 id="source">Source code</H2>
      <ul>
        <li>Solidity 0.8.28 on OpenZeppelin 5.1, built and tested with Foundry.</li>
        <li>Tests run on every change in GitHub Actions.</li>
        <li>Contracts are MIT licensed; the web app is under BUSL 1.1.</li>
      </ul>
      <p>
        Read it all on <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>.
      </p>

      <Callout kind="warn">The contracts have not been audited yet. See <a href="/docs/security">Security model</a>.</Callout>
    </DocPage>
  );
}
