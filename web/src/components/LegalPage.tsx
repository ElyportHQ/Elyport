import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Legal · Updated {updated}</div>
          <h1>{title}</h1>
        </div>
      </div>
      <article className="prose">{children}</article>
    </div>
  );
}
