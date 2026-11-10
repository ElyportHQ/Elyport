import Link from "next/link";
import type { ReactNode } from "react";
import type { DocIcon as Key } from "@/lib/docs";
import { DocIcon } from "./DocIcon";

/** A section heading that shows up in "On this page". */
export function H2({ id, children, toc }: { id: string; children: ReactNode; toc?: string }) {
  return (
    <h2 id={id} data-toc={toc}>
      <a href={`#${id}`} className="anchor" aria-hidden tabIndex={-1}>#</a>
      {children}
    </h2>
  );
}

const calloutLabel = { note: "Note", tip: "Tip", warn: "Heads up" } as const;

export function Callout({ kind = "note", title, children }: { kind?: keyof typeof calloutLabel; title?: string; children: ReactNode }) {
  return (
    <aside className={`callout callout-${kind}`}>
      <div className="callout-k">{title ?? calloutLabel[kind]}</div>
      <div className="callout-b">{children}</div>
    </aside>
  );
}

/** Key facts in a compact spec grid. */
export function Glance({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="glance">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="doc-steps">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <div className="st">{title}</div>
      <div className="sb">{children}</div>
    </li>
  );
}

export function Cards({ items }: { items: { href: string; title: string; blurb: string; icon: Key; external?: boolean }[] }) {
  return (
    <div className="doc-cards">
      {items.map((c) =>
        c.external ? (
          <a key={c.href} href={c.href} target="_blank" rel="noreferrer" className="doc-card">
            <span className="ic"><DocIcon name={c.icon} /></span>
            <span className="t">{c.title} ↗</span>
            <span className="b">{c.blurb}</span>
          </a>
        ) : (
          <Link key={c.href} href={c.href} className="doc-card">
            <span className="ic"><DocIcon name={c.icon} /></span>
            <span className="t">{c.title}</span>
            <span className="b">{c.blurb}</span>
          </Link>
        ),
      )}
    </div>
  );
}

export function SpecTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="doc-table">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Faq({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="doc-faq">
      {items.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <div>{a}</div>
        </details>
      ))}
    </div>
  );
}

export const Addr = ({ a, href }: { a: string; href: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="addr">
    {a.slice(0, 6)}…{a.slice(-4)}
  </a>
);
