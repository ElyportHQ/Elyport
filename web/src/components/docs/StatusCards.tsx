import type { ContractCard } from "@/lib/status";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function StatusCards({ cards, compact }: { cards: ContractCard[]; compact?: boolean }) {
  return (
    <div className={`st-grid${compact ? " compact" : ""}`}>
      {cards.map((c) => {
        const state = c.error ? "warn" : c.ok ? "ok" : "bad";
        return (
          <section key={`${c.chain}-${c.address}-${c.name}`} className="st-card">
            <header>
              <div className="st-title">
                <strong>{c.name}</strong>
                {c.tag && <span className="st-tag">{c.tag}</span>}
                <span className={`st-dot ${state}`} aria-label={state === "ok" ? "OK" : state === "bad" ? "Check failed" : "Unavailable"} />
              </div>
              <div className="st-sub">
                <span>{c.chain}</span>
                <a className="mono" href={c.href} target="_blank" rel="noreferrer">
                  {short(c.address)} ↗
                </a>
              </div>
            </header>
            {c.error ? (
              <p className="st-err">Could not read this contract right now.</p>
            ) : (
              <dl>
                {c.rows.map((r) => (
                  <div key={r.label} className={r.ok === false ? "bad" : undefined}>
                    <dt>{r.label}</dt>
                    <dd>
                      {r.ok === true && <span className="st-tick">✓</span>}
                      {r.ok === false && <span className="st-cross">✕</span>}
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </div>
  );
}
