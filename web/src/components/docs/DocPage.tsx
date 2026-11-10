import Link from "next/link";
import type { ReactNode } from "react";
import { DOCS_UPDATED, docMeta } from "@/lib/docs";
import { DocIcon } from "./DocIcon";

/** Standard docs page: breadcrumb, title, lead, meta, article body and previous / next cards. */
export function DocPage({ href, lead, minutes, updated = DOCS_UPDATED, children }: { href: string; lead: ReactNode; minutes: number; updated?: string; children: ReactNode }) {
  const { page, group, prev, next } = docMeta(href);
  return (
    <article className="doc">
      <header className="doc-head">
        <div className="doc-crumb">
          <Link href="/docs">Docs</Link>
          <span>/</span>
          <span>{group?.title}</span>
        </div>
        <h1>{page?.title}</h1>
        <p className="doc-lead">{lead}</p>
        <div className="doc-meta">
          <span>Updated {updated}</span>
          <span className="sep" />
          <span>{minutes} min read</span>
        </div>
      </header>

      <div className="doc-article prose">{children}</div>

      <nav className="doc-pager" aria-label="More docs">
        {prev ? (
          <Link href={prev.href} className="doc-pager-card">
            <span className="k">← Previous</span>
            <span className="t">
              <DocIcon name={prev.icon} size={16} /> {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.href} className="doc-pager-card next">
            <span className="k">Next →</span>
            <span className="t">
              <DocIcon name={next.icon} size={16} /> {next.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
