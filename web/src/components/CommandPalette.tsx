"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isAddress } from "viem";
import { IconBars, IconDrop, IconLock, IconSearch, IconSend } from "./Icons";

type Item = { label: string; hint: string; href: string; icon: ReactNode; keywords: string };

const base: Item[] = [
  { label: "Refuel", hint: "Get HYPE gas", href: "/refuel", icon: <IconDrop />, keywords: "refuel gas hype bridge" },
  { label: "Gas Drop", hint: "Multisend", href: "/drop", icon: <IconSend />, keywords: "drop airdrop multisend send" },
  { label: "Locker", hint: "Lock LP or tokens", href: "/lock", icon: <IconLock />, keywords: "lock locker lp liquidity" },
  { label: "Vesting", hint: "Schedules", href: "/vest", icon: <IconBars />, keywords: "vest vesting cliff claim" },
  { label: "Explore locks", hint: "All locks", href: "/locks", icon: <IconSearch />, keywords: "explore locks search" },
  { label: "Docs", hint: "How it works", href: "/docs", icon: <IconSearch />, keywords: "docs help fees contracts" },
  { label: "My Elyport", hint: "Your locks, vesting, drops", href: "/me", icon: <IconBars />, keywords: "me my dashboard claim withdraw portfolio" },
];

/** ⌘K / Ctrl+K palette: jump to a tool, or paste a token address or a lock/vesting number. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const t = q.trim();
    if (isAddress(t))
      return [
        { label: "Open token page", hint: `${t.slice(0, 6)}…${t.slice(-4)}`, href: `/token/${t}`, icon: <IconSearch />, keywords: "" },
        { label: "Open claim page", hint: "Vesting claims", href: `/claim/${t}`, icon: <IconBars />, keywords: "" },
      ];
    if (/^\d+$/.test(t))
      return [
        { label: `Open lock #${t}`, hint: "Locker", href: `/lock/${t}`, icon: <IconLock />, keywords: "" },
        { label: `Open vesting #${t}`, hint: "Vesting", href: `/vest/${t}`, icon: <IconBars />, keywords: "" },
      ];
    const lc = t.toLowerCase();
    return lc ? base.filter((i) => `${i.label} ${i.keywords}`.toLowerCase().includes(lc)) : base;
  }, [q]);

  if (!open) return null;

  const go = (i: Item | undefined) => {
    if (!i) return;
    onClose();
    router.push(i.href);
  };

  return (
    <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search Elyport">
        <input
          ref={input}
          value={q}
          placeholder="Search tools, paste a token address or a lock number…"
          aria-label="Search"
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(items.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") go(items[sel]);
          }}
        />
        <ul role="listbox" aria-label="Results">
          {items.length === 0 && <li style={{ padding: "16px 12px", color: "#5D6573" }}>No match. Try a tool name or a 0x address.</li>}
          {items.map((i, idx) => (
            <li key={i.href}>
              <button type="button" role="option" aria-selected={idx === sel} onMouseEnter={() => setSel(idx)} onClick={() => go(i)}>
                <span className="tile">{i.icon}</span>
                <span style={{ fontSize: 16 }}>{i.label}</span>
                <span className="hint">{i.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="foot">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

/** Opens the palette on ⌘K / Ctrl+K. */
export function useCommandPaletteHotkey(setOpen: (fn: (v: boolean) => boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
