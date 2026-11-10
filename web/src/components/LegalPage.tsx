import type { ReactNode } from "react";
import { DocPage } from "./docs/DocPage";
import { DocsShell } from "./docs/DocsShell";

export function LegalPage({ href, lead, updated, children }: { href: string; lead: ReactNode; updated: string; children: ReactNode }) {
  return (
    <DocsShell>
      <DocPage href={href} lead={lead} minutes={2} updated={updated}>
        {children}
      </DocPage>
    </DocsShell>
  );
}
