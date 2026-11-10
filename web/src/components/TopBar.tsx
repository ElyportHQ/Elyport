"use client";

import { githubUrl, xUrl } from "@/lib/config";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { Emblem } from "./Emblem";
import { IconBars, IconClose, IconDrop, IconLock, IconMenu, IconSearch, IconSend } from "./Icons";
import { short } from "@/lib/format";
import { CommandPalette, useCommandPaletteHotkey } from "./CommandPalette";

const links = [
  { href: "/refuel", label: "Refuel" },
  { href: "/drop", label: "Gas Drop" },
  { href: "/lock", label: "Locker" },
  { href: "/vest", label: "Vesting" },
  { href: "/locks", label: "Explore" },
  { href: "/docs", label: "Docs" },
  { href: "/me", label: "My Elyport" },
];

const tools = [
  { href: "/refuel", label: "Refuel", sub: "HYPE gas from any chain", icon: <IconDrop />, holo: true },
  { href: "/drop", label: "Gas Drop", sub: "Send to thousands at once", icon: <IconSend /> },
  { href: "/lock", label: "Locker", sub: "Lock LP and tokens", icon: <IconLock /> },
  { href: "/vest", label: "Vesting", sub: "Release tokens on a schedule", icon: <IconBars /> },
];

export function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);
  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener("elyport:search", open);
    return () => window.removeEventListener("elyport:search", open);
  }, []);
  const { address, isConnected } = useAccount();
  const { open: openWallet } = useAppKit();
  const isHome = pathname === "/";

  if (pathname.startsWith("/embed")) return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="Elyport home" onClick={() => setOpen(false)}>
          <Emblem uid="top" />
          <span className="brand-word">Elyport</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="topbar-actions">
          <button type="button" className="icon-btn" aria-label="Search (⌘K)" onClick={() => setPaletteOpen(true)}>
            <IconSearch />
          </button>
          {isHome ? (
            <Link href="/drop" className="btn btn-dark">
              Launch app
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost wallet-pill wallet-desktop" onClick={() => openWallet()}>
              {isConnected ? (
                <>
                  <span className="dot" />
                  {short(address)}
                </>
              ) : (
                "Connect wallet"
              )}
            </button>
          )}
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {open && (
        <nav className="mobile-menu" aria-label="Menu">
          <div className="eyebrow" style={{ padding: "10px 12px 6px" }}>
            Tools
          </div>
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className="item" onClick={() => setOpen(false)}>
              <span className={`tile${t.holo ? " holo" : ""}`}>{t.icon}</span>
              <span>
                <span className="title">{t.label}</span>
                <span className="sub">{t.sub}</span>
              </span>
            </Link>
          ))}
          <div style={{ height: 1, margin: "8px 12px", background: "#e6e9ee" }} />
          <Link href="/me" className="btn btn-ghost btn-block" style={{ margin: "0 4px 8px", width: "calc(100% - 8px)" }} onClick={() => setOpen(false)}>
            My Elyport · locks, vesting, claims
          </Link>
          <div className="grid2">
            <Link href="/locks" onClick={() => setOpen(false)}>
              Explore locks
            </Link>
            <Link href="/docs" onClick={() => setOpen(false)}>
              Docs
            </Link>
            <a href={githubUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              GitHub
            </a>
            <a href={xUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              X
            </a>
          </div>
          <button
            type="button"
            className="btn btn-silver btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              setOpen(false);
              openWallet();
            }}
          >
            {isConnected ? short(address) : "Connect wallet"}
          </button>
        </nav>
      )}
    </header>
  );
}
