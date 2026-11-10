import type { Metadata } from "next";
import { Callout, H2 } from "@/components/docs/blocks";
import { DocPage } from "@/components/docs/DocPage";
import { StatusCards } from "@/components/docs/StatusCards";
import { OfficialToken } from "@/components/OfficialToken";
import { runMonitor, type MonitorReport } from "@/lib/refuelMonitor";
import { getStatus, type StatusReport } from "@/lib/status";

export const metadata: Metadata = {
  title: "Live status",
  description: "Every Elyport contract read live from the chain: owner, fees against their hard caps, limits, relayer checks and retired contracts.",
};

export const revalidate = 60;

export default async function StatusDoc() {
  const [status, monitor] = await Promise.all([
    getStatus().catch(() => undefined as StatusReport | undefined),
    runMonitor().catch(() => undefined as MonitorReport | undefined),
  ]);
  const when = status ? new Date(status.checkedAt).toUTCString().replace(" GMT", " UTC") : "unavailable";

  return (
    <DocPage
      href="/docs/status"
      minutes={3}
      updated={when}
      lead="Everything on this page is read straight from the chain, refreshed about once a minute. Nothing here is typed in by hand."
    >
      <H2 id="token">Official token</H2>
      <OfficialToken compact />

      <H2 id="relayer">Refuel delivery check</H2>
      <p>
        Every 15 minutes a stand-alone script confirms that every refuel marked as delivered was really paid out by the vault,
        and that every vault payout matches a real deposit. It reads only public chain data, needs no secrets and does not use
        this website, so anyone can run it: <code>cd monitor &amp;&amp; npm install &amp;&amp; node check-refuel.mjs</code> in the{" "}
        <a href="https://github.com/ElyportHQ/Elyport/tree/main/monitor" target="_blank" rel="noreferrer">repository</a>. The result
        below is the same check run by this site.
      </p>
      {monitor ? (
        <div className={`st-banner ${monitor.ok ? "is-ok" : "is-bad"}`}>
          <strong>{monitor.ok ? "All deliveries match" : "Mismatch found"}</strong>
          <span>
            {monitor.chains.reduce((n, c) => n + c.checked, 0)} recent deposits checked on {monitor.chains.length} chains ·{" "}
            {monitor.payouts.count} vault payouts checked
          </span>
          {[...monitor.problems, ...monitor.warnings].map((p) => (
            <span key={p} className="st-note">
              {p}
            </span>
          ))}
        </div>
      ) : (
        <div className="st-banner is-warn">
          <strong>Check unavailable right now</strong>
          <span>The RPCs did not answer. Try again in a minute.</span>
        </div>
      )}

      {status ? (
        <>
          <H2 id="elysium">Contracts in use on Elysium</H2>
          <p>Fees can never go above their hard caps, and Refuel limits can never go above their ceilings. Both are fixed in the code.</p>
          <StatusCards cards={status.current} />

          <H2 id="timelock">Scheduled owner changes</H2>
          <p>
            Fees, the fee recipient, the holder discount and the DEX list can only change through the 48-hour timelock. Every
            change is listed here at least 48 hours before it can take effect. Refuel stays with the owner wallet so it can be
            paused at once in an emergency; its limits are capped in the code.
          </p>
          {status.operations === undefined ? (
            <p className="st-note">Could not read the timelock right now.</p>
          ) : status.operations.length === 0 ? (
            <div className="st-banner is-ok">
              <strong>Nothing scheduled</strong>
              <span>No owner change is waiting in the timelock.</span>
            </div>
          ) : (
            <div className="st-grid">
              {status.operations.map((op) => (
                <section key={op.id} className="st-card">
                  <header>
                    <div className="st-title">
                      <strong>{op.state === "pending" ? "Scheduled" : op.state === "ready" ? "Ready" : op.state === "done" ? "Done" : "Cancelled"}</strong>
                      <span className={`st-dot is-${op.state === "pending" || op.state === "ready" ? "warn" : "ok"}`} />
                    </div>
                    <div className="st-sub">
                      <span>{op.state === "pending" ? `From ${new Date(op.readyAt * 1000).toUTCString().replace(" GMT", " UTC")}` : ""}</span>
                    </div>
                  </header>
                  <dl>
                    {op.lines.map((l, i) => (
                      <div key={i}>
                        <dd style={{ textAlign: "left", fontFamily: "var(--font-sans)", fontSize: 13.5 }}>{l}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}

          <H2 id="deposits">Refuel deposit contracts</H2>
          <p>Each one should hold at least what it owes to pending refuels.</p>
          <StatusCards cards={status.deposits} />

          <H2 id="retired">Retired contracts</H2>
          <p>
            Elyport v3 replaced two earlier sets of contracts before launch, to add fee hard caps, sender refunds and tighter limits.
            The earlier ones were never used: every count and balance below reads zero, straight from the chain. They are not linked
            from the app and should not be used.
          </p>
          <StatusCards cards={status.retired} compact />
        </>
      ) : (
        <Callout kind="warn">Contract status is unavailable right now. The RPCs did not answer; try again in a minute.</Callout>
      )}

      <Callout kind="note">
        Want to check it yourself? Every address links to its explorer, and the same check is available as JSON at{" "}
        <a href="/api/refuel/monitor">/api/refuel/monitor</a>.
      </Callout>
    </DocPage>
  );
}
