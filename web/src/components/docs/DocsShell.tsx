"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DOCS_EDIT_BASE, docGroups, docMeta } from "@/lib/docs";
import { githubUrl, xUrl } from "@/lib/config";
import { DocIcon } from "./DocIcon";

type Heading = { id: string; label: string };

const openSearch = () => window.dispatchEvent(new Event("elyport:search"));

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Sidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  return (
    <>
      <button type="button" className="docs-search" onClick={() => { onNavigate?.(); openSearch(); }}>
        <DocIcon name="search" size={16} />
        <span>Search docs and tools</span>
        <kbd>⌘K</kbd>
      </button>
      {docGroups.map((g) => {
        const open = !closed[g.id];
        return (
          <div key={g.id} className="docs-group">
            <button type="button" className="docs-group-head" aria-expanded={open} onClick={() => setClosed((c) => ({ ...c, [g.id]: open }))}>
              <span className="n">{g.n}</span>
              <span className="t">{g.title}</span>
              <Chevron open={open} />
            </button>
            {open && (
              <ul>
                {g.pages.map((p) => (
                  <li key={p.href}>
                    <Link href={p.href} aria-current={pathname === p.href ? "page" : undefined} onClick={onNavigate}>
                      <span className="ic">
                        <DocIcon name={p.icon} size={16} />
                      </span>
                      <span>{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <div className="docs-side-foot">
        <a href={githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href={xUrl} target="_blank" rel="noreferrer">X ↗</a>
        <Link href="/drop" onClick={onNavigate}>Open app →</Link>
      </div>
    </>
  );
}

function TocList({ toc, active, onPick }: { toc: Heading[]; active: string; onPick?: () => void }) {
  return (
    <ol className="docs-toc">
      {toc.map((h, i) => (
        <li key={h.id}>
          <a href={`#${h.id}`} aria-current={active === h.id ? "location" : undefined} onClick={onPick}>
            <span className="i">{String(i + 1).padStart(2, "0")}</span>
            {h.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { page, group } = docMeta(pathname);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toc, setToc] = useState<Heading[]>([]);
  const [active, setActive] = useState("");
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const hs = Array.from(document.querySelectorAll<HTMLElement>(".doc-article h2[id]"));
    setToc(hs.map((h) => ({ id: h.id, label: h.dataset.toc || h.textContent || "" })));
    const onScroll = () => {
      let cur = hs[0]?.id ?? "";
      for (const h of hs) if (h.getBoundingClientRect().top < 170) cur = h.id;
      setActive(cur);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    if (!menu && !sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setSheet(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, sheet]);

  const editHref = `${DOCS_EDIT_BASE}${pathname}/page.tsx`;

  return (
    <div className="docs">
      <div className="docs-bar">
        <button type="button" className="docs-bar-crumb" onClick={() => setMenu(true)} aria-label="Open docs menu">
          <span className="ic">
            <DocIcon name={page?.icon ?? "doc"} size={17} />
          </span>
          <span className="txt">
            <small>
              {group?.n} · {group?.title ?? "Docs"}
            </small>
            <b>{page?.title ?? "Docs"}</b>
          </span>
          <Chevron open={false} />
        </button>
        {toc.length > 0 && (
          <button type="button" className="docs-bar-toc" onClick={() => setSheet(true)}>
            Contents
            <span className="count">{toc.length}</span>
          </button>
        )}
        <span className="docs-progress" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="container docs-layout">
        <aside className="docs-side" aria-label="Docs">
          <Sidebar pathname={pathname} />
        </aside>

        <div className="docs-main">{children}</div>

        <nav className="docs-rail" aria-label="On this page">
          {toc.length > 0 && (
            <>
              <div className="docs-rail-title">On this page</div>
              <TocList toc={toc} active={active} />
            </>
          )}
          <div className="docs-rail-links">
            <a href={editHref} target="_blank" rel="noreferrer">Edit this page ↗</a>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button>
          </div>
        </nav>
      </div>

      {mounted &&
        menu &&
        createPortal(
          <div className="docs-overlay" onClick={() => setMenu(false)}>
            <aside className="docs-drawer" aria-label="Docs menu" onClick={(e) => e.stopPropagation()}>
              <div className="docs-drawer-head">
                <span className="eyebrow">Elyport docs</span>
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setMenu(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <Sidebar pathname={pathname} onNavigate={() => setMenu(false)} />
            </aside>
          </div>,
          document.body,
        )}

      {mounted &&
        sheet &&
        createPortal(
          <div className="docs-overlay bottom" onClick={() => setSheet(false)}>
            <div className="docs-sheet" role="dialog" aria-label="On this page" onClick={(e) => e.stopPropagation()}>
              <div className="grab" />
              <div className="docs-sheet-head">
                <b>On this page</b>
                <span className="mono muted">{Math.round(progress * 100)}% read</span>
              </div>
              <TocList toc={toc} active={active} onPick={() => setSheet(false)} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
