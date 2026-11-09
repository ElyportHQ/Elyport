"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export type MomentKind = "refuel" | "lock" | "drop" | "vest";

export type Moment = {
  kind: MomentKind;
  title: string;
  detail?: string;
  /** Internal page, e.g. /lock/12 */
  href?: string;
  hrefLabel?: string;
  /** External link, e.g. an explorer tx */
  externalHref?: string;
  externalLabel?: string;
};

/** Full-screen success moment with an animated scene for each tool. */
export function SuccessMoment({ moment, onClose }: { moment: Moment | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!moment) return;
    boxRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moment]);

  if (!mounted || !moment) return null;

  return createPortal(
    <div className="moment-backdrop" role="dialog" aria-modal="true" aria-label={moment.title} onClick={onClose}>
      <div ref={boxRef} tabIndex={-1} className="moment" onClick={(e) => e.stopPropagation()}>
        <div className="moment-stage" aria-hidden>
          <Burst />
          {moment.kind === "refuel" && <RefuelScene />}
          {moment.kind === "lock" && <LockScene />}
          {moment.kind === "drop" && <DropScene />}
          {moment.kind === "vest" && <VestScene />}
          <Sparks />
        </div>
        <h2 className="moment-title">{moment.title}</h2>
        {moment.detail && <p className="moment-detail">{moment.detail}</p>}
        <div className="moment-actions">
          {moment.href && (
            <Link className="btn btn-dark btn-block" href={moment.href} onClick={onClose}>
              {moment.hrefLabel ?? "Open"}
            </Link>
          )}
          {moment.externalHref && (
            <a className="btn btn-ghost btn-block" href={moment.externalHref} target="_blank" rel="noreferrer">
              {moment.externalLabel ?? "View transaction"} ↗
            </a>
          )}
          <button type="button" className={moment.href ? "btn btn-ghost btn-block" : "btn btn-dark btn-block"} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Opens a demo moment when the page URL has ?celebrate=1, so the animation can be previewed. */
export function useCelebratePreview(set: (m: Moment) => void, demo: Moment) {
  const demoRef = useRef(demo);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("celebrate") === "1") set(demoRef.current);
  }, [set]);
}

const v = (o: Record<string, string | number>) => o as CSSProperties;

function Burst() {
  return (
    <svg className="m-burst" viewBox="0 0 240 200">
      <defs>
        <radialGradient id="mGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".55" stopColor="#e6eeff" stopOpacity=".9" />
          <stop offset="1" stopColor="#e6eeff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mHolo" x1="0" x2="1">
          <stop offset="0" stopColor="#F7C8E0" />
          <stop offset=".5" stopColor="#BFD7FF" />
          <stop offset="1" stopColor="#C6F5E6" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="100" r="96" fill="url(#mGlow)" />
      <g className="m-rays">
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x="118.5" y="4" width="3" height="34" rx="1.5" fill="url(#mHolo)" opacity=".7" transform={`rotate(${i * 22.5} 120 100)`} />
        ))}
      </g>
      <circle className="m-ring" cx="120" cy="100" r="78" fill="none" stroke="url(#mHolo)" strokeWidth="3" />
    </svg>
  );
}

function Sparks() {
  const sparks = [
    [-96, -58, "#F7C8E0"], [92, -64, "#BFD7FF"], [-110, 18, "#C6F5E6"], [108, 26, "#F7C8E0"],
    [-58, -88, "#BFD7FF"], [54, -90, "#C6F5E6"], [-70, 70, "#BFD7FF"], [76, 66, "#C6F5E6"],
    [0, -100, "#F7C8E0"], [-120, -20, "#BFD7FF"], [124, -18, "#C6F5E6"], [10, 92, "#F7C8E0"],
  ] as const;
  return (
    <svg className="m-sparks" viewBox="0 0 240 200">
      {sparks.map(([dx, dy, c], i) => (
        <rect key={i} className="m-spark" x="117" y="97" width="6" height="6" rx="1.5" fill={c} stroke="#fff" strokeWidth="1"
          style={v({ "--dx": `${dx}px`, "--dy": `${dy}px`, "--r": `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`, animationDelay: `${0.55 + (i % 4) * 0.05}s` })} />
      ))}
    </svg>
  );
}

function Check({ delay = 1.1 }: { delay?: number }) {
  return (
    <g className="m-check" style={v({ animationDelay: `${delay}s` })}>
      <circle cx="168" cy="146" r="17" fill="#14171C" />
      <path className="m-check-path" d="M160 146.5l5.5 5.5 10.5-11" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
        style={v({ animationDelay: `${delay + 0.15}s` })} />
    </g>
  );
}

function Chrome({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset=".45" stopColor="#e9edf2" />
      <stop offset="1" stopColor="#b9c1cc" />
    </linearGradient>
  );
}

/** HYPE drops fall through the gate and fill the gauge. */
function RefuelScene() {
  return (
    <svg className="m-scene" viewBox="0 0 240 200">
      <defs>
        <Chrome id="rfChrome" />
        <linearGradient id="rfFill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7fe0c1" />
          <stop offset="1" stopColor="#BFD7FF" />
        </linearGradient>
        <clipPath id="rfGauge">
          <rect x="96" y="96" width="48" height="66" rx="16" />
        </clipPath>
      </defs>
      <path d="M78 74 V64 a42 42 0 0 1 84 0 V74" fill="none" stroke="url(#rfChrome)" strokeWidth="10" strokeLinecap="round" />
      <path d="M90 74 V66 a30 30 0 0 1 60 0 V74" fill="none" stroke="#d6dce4" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} className="m-fall" cx={114 + (i % 3) * 6} cy="40" r="4.5" fill="url(#rfFill)" style={v({ animationDelay: `${0.15 + i * 0.13}s` })} />
      ))}
      <rect x="96" y="96" width="48" height="66" rx="16" fill="#fff" stroke="#d6dce4" strokeWidth="2" />
      <g clipPath="url(#rfGauge)">
        <g className="m-fill">
          <rect x="96" y="108" width="48" height="60" fill="url(#rfFill)" />
          <path className="m-wave" d="M76 110 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" />
        </g>
      </g>
      <text x="120" y="140" textAnchor="middle" className="mono" fontSize="11" fill="#14171C">HYPE</text>
      <Check />
    </svg>
  );
}

/** The shackle drops shut and the timer ring completes. */
function LockScene() {
  return (
    <svg className="m-scene" viewBox="0 0 240 200">
      <defs>
        <Chrome id="lkChrome" />
        <linearGradient id="lkRing" x1="0" x2="1">
          <stop offset="0" stopColor="#F7C8E0" />
          <stop offset=".5" stopColor="#BFD7FF" />
          <stop offset="1" stopColor="#7fe0c1" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="100" r="62" fill="none" stroke="#e6e9ee" strokeWidth="6" />
      <circle className="m-draw" cx="120" cy="100" r="62" fill="none" stroke="url(#lkRing)" strokeWidth="6" strokeLinecap="round" pathLength="100"
        strokeDasharray="100" transform="rotate(-90 120 100)" />
      <path className="m-shackle" d="M104 98 V82 a16 16 0 0 1 32 0 V98" fill="none" stroke="url(#lkChrome)" strokeWidth="9" strokeLinecap="round" />
      <path className="m-shackle" d="M104 98 V82 a16 16 0 0 1 32 0 V98" fill="none" stroke="#c3cad4" strokeWidth="1.5" strokeLinecap="round" opacity=".8" />
      <rect className="m-body" x="92" y="94" width="56" height="44" rx="12" fill="url(#lkChrome)" stroke="#c3cad4" strokeWidth="1.5" />
      <circle cx="120" cy="112" r="5" fill="#14171C" />
      <rect x="118.5" y="114" width="3" height="10" rx="1.5" fill="#14171C" />
      <Check delay={1.25} />
    </svg>
  );
}

/** One wallet fans out to many. */
function DropScene() {
  const n = 14;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 66 : 80;
    return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.82), i };
  });
  return (
    <svg className="m-scene" viewBox="0 0 240 200">
      <defs>
        <Chrome id="drChrome" />
        <linearGradient id="drDot" x1="0" x2="1">
          <stop offset="0" stopColor="#BFD7FF" />
          <stop offset="1" stopColor="#7fe0c1" />
        </linearGradient>
      </defs>
      {pts.map((p) => (
        <line key={`l${p.i}`} className="m-line" x1="120" y1="100" x2={120 + p.x} y2={100 + p.y} stroke="#d6dce4" strokeWidth="1.5" pathLength="1"
          strokeDasharray="1" style={v({ animationDelay: `${0.1 + p.i * 0.03}s` })} />
      ))}
      {pts.map((p) => (
        <circle key={`d${p.i}`} className="m-fly" cx="120" cy="100" r="3.5" fill="url(#drDot)"
          style={v({ "--dx": `${p.x}px`, "--dy": `${p.y}px`, animationDelay: `${0.25 + p.i * 0.035}s` })} />
      ))}
      {pts.map((p) => (
        <circle key={`w${p.i}`} className="m-pop" cx={120 + p.x} cy={100 + p.y} r="7" fill="#fff" stroke="#c3cad4" strokeWidth="1.5"
          style={v({ animationDelay: `${0.75 + p.i * 0.035}s` })} />
      ))}
      <circle cx="120" cy="100" r="20" fill="url(#drChrome)" stroke="#c3cad4" strokeWidth="1.5" />
      <circle cx="120" cy="100" r="7" fill="#14171C" />
      <Check delay={1.3} />
    </svg>
  );
}

/** Release bars rise step by step along the schedule. */
function VestScene() {
  const bars = [14, 24, 34, 44, 54, 64];
  return (
    <svg className="m-scene" viewBox="0 0 240 200">
      <defs>
        <linearGradient id="vsBar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#BFD7FF" />
          <stop offset="1" stopColor="#F7C8E0" />
        </linearGradient>
      </defs>
      <line x1="62" y1="140" x2="178" y2="140" stroke="#c3cad4" strokeWidth="2" strokeLinecap="round" />
      <line x1="62" y1="140" x2="62" y2="132" stroke="#c3cad4" strokeWidth="2" strokeLinecap="round" />
      <text x="62" y="156" textAnchor="middle" className="mono" fontSize="9" fill="#5d6573">cliff</text>
      {bars.map((h, i) => (
        <rect key={i} className="m-rise" x={74 + i * 17} y={138 - h} width="11" height={h} rx="3" fill="url(#vsBar)" stroke="#fff" strokeWidth="1"
          style={v({ animationDelay: `${0.2 + i * 0.12}s` })} />
      ))}
      <path className="m-draw" d="M70 132 H85 V122 H102 V112 H119 V102 H136 V92 H153 V82 H170 V72" fill="none" stroke="#14171C" strokeWidth="2" strokeLinejoin="round"
        pathLength="100" strokeDasharray="100" style={v({ animationDelay: ".3s", animationDuration: "1s" })} />
      <circle className="m-pop" cx="170" cy="72" r="5" fill="#14171C" style={v({ animationDelay: "1.2s" })} />
      <Check delay={1.35} />
    </svg>
  );
}
