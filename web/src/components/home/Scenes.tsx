/* Animated SVG scenes for the home page. Pure SVG + SMIL, no JS, respects reduced motion via CSS. */

const arches = [
  { r: 270, w: 34 },
  { r: 216, w: 28 },
  { r: 168, w: 22 },
  { r: 124, w: 17 },
  { r: 86, w: 13 },
];
const archPath = (cx: number, cy: number, r: number, bottom: number) =>
  `M${cx - r} ${bottom}V${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}V${bottom}`;

const particles = [
  { x: 700, r: 2.5, fill: "#FFFFFF", dur: 6, begin: 0, to: 420 },
  { x: 722, r: 2, fill: "#F7C8E0", dur: 7, begin: 1, to: 380 },
  { x: 742, r: 3, fill: "#FFFFFF", dur: 5.5, begin: 2, to: 440 },
  { x: 688, r: 1.8, fill: "#BFD7FF", dur: 8, begin: 0.5, to: 400 },
  { x: 756, r: 2.2, fill: "#C6F5E6", dur: 7.5, begin: 3, to: 360 },
  { x: 712, r: 1.6, fill: "#FFFFFF", dur: 5, begin: 2.6, to: 460 },
  { x: 732, r: 2.4, fill: "#BFD7FF", dur: 6.5, begin: 4, to: 390 },
];

export function HeroScene() {
  return (
    <svg className="hero-scene" viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="hSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.35" stopColor="#FFF3E4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE8D2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hHolo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7C8E0" />
          <stop offset="0.5" stopColor="#BFD7FF" />
          <stop offset="1" stopColor="#C6F5E6" />
        </linearGradient>
        <linearGradient id="hChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.25" stopColor="#E3E7EC" />
          <stop offset="0.42" stopColor="#AEB7C3" />
          <stop offset="0.5" stopColor="#8E98A6" />
          <stop offset="0.66" stopColor="#DDE2E8" />
          <stop offset="1" stopColor="#B7BFCA" />
        </linearGradient>
        <linearGradient id="hSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.44" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.56" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;1 0" keyTimes="0;0.6;1" dur="6s" repeatCount="indefinite" />
        </linearGradient>
        <radialGradient id="hDoor" cx="0.5" cy="0.75" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#F6E3F0" />
          <stop offset="0.75" stopColor="#D6E4FF" />
          <stop offset="1" stopColor="#D2F4E9" />
        </radialGradient>
        <linearGradient id="hFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5F6F8" stopOpacity="0" />
          <stop offset="1" stopColor="#F5F6F8" />
        </linearGradient>
        <filter id="hB8" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="hB18" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="hB30" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>

      <g transform="translate(0 90)">
        <g className="hero-gate">
        <circle cx="720" cy="640" r="460" fill="url(#hSun)" />
        <g opacity="0.35">
          <animateTransform attributeName="transform" type="rotate" from="0 720 640" to="360 720 640" dur="180s" repeatCount="indefinite" />
          {[-90, -67.5, -45, -22.5, 0, 22.5, 45, 67.5, 90].map((a) => (
            <polygon key={a} points="720,640 712,0 728,0" fill="#FFFFFF" transform={`rotate(${a} 720 640)`} />
          ))}
        </g>
        <g opacity="0.55">
          <animateTransform attributeName="transform" type="rotate" from="0 720 640" to="-360 720 640" dur="90s" repeatCount="indefinite" />
          <circle cx="720" cy="640" r="340" fill="none" stroke="url(#hHolo)" strokeWidth="2" />
          <circle cx="720" cy="640" r="372" fill="none" stroke="url(#hHolo)" strokeWidth="1" strokeDasharray="2 10" />
        </g>
        <path d="M666 900V640A54 54 0 0 1 774 640V900Z" fill="#FFFFFF" filter="url(#hB30)" />
        <path d="M666 900V640A54 54 0 0 1 774 640V900Z" fill="url(#hDoor)">
          <animate attributeName="opacity" values="0.85;1;0.85" dur="4s" repeatCount="indefinite" />
        </path>
        <g fill="none">
          {arches.map((a) => (
            <path key={`c${a.r}`} d={archPath(720, 640, a.r, 900)} stroke="url(#hChrome)" strokeWidth={a.w} />
          ))}
          {arches.map((a) => (
            <path key={`s${a.r}`} d={archPath(720, 640, a.r, 900)} stroke="url(#hSheen)" strokeWidth={a.w} />
          ))}
        </g>
        {particles.map((p, i) => (
          <circle key={i} cx={p.x} cy="780" r={p.r} fill={p.fill}>
            <animate attributeName="cy" values={`780;${p.to}`} dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;0" dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
          </circle>
        ))}
        </g>
      </g>

      <Clouds />
      <rect x="0" y="820" width="1440" height="140" fill="url(#hFade)" />
    </svg>
  );
}

function Clouds() {
  return (
    <>
      <g filter="url(#hB18)" fill="#FFFFFF" opacity="0.9">
        <animateTransform attributeName="transform" type="translate" values="0 0;-40 0;0 0" dur="34s" repeatCount="indefinite" />
        <ellipse cx="200" cy="720" rx="300" ry="50" />
        <ellipse cx="1240" cy="710" rx="320" ry="56" />
        <ellipse cx="720" cy="760" rx="420" ry="40" />
      </g>
      <g className="hero-clouds-mid">
      <g filter="url(#hB8)">
        <animateTransform attributeName="transform" type="translate" values="0 0;56 0;0 0" dur="26s" repeatCount="indefinite" />
        {[120, 520, 980, 1360].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={i % 3 === 0 ? 800 : 818} rx={i % 3 === 0 ? 260 : 300} ry="70" fill="#E9EEF5" />
            <ellipse cx={x} cy={i % 3 === 0 ? 785 : 802} rx={i % 3 === 0 ? 230 : 270} ry="58" fill="#FFFFFF" />
          </g>
        ))}
      </g>
      </g>
      <g className="hero-clouds-front">
      <g filter="url(#hB8)">
        <animateTransform attributeName="transform" type="translate" values="0 0;-80 0;0 0" dur="20s" repeatCount="indefinite" />
        <ellipse cx="300" cy="900" rx="420" ry="90" fill="#E6EBF3" />
        <ellipse cx="300" cy="880" rx="390" ry="76" fill="#FFFFFF" />
        <ellipse cx="1120" cy="905" rx="440" ry="92" fill="#E6EBF3" />
        <ellipse cx="1120" cy="884" rx="410" ry="78" fill="#FFFFFF" />
        <ellipse cx="720" cy="940" rx="520" ry="80" fill="#FFFFFF" />
      </g>
      </g>
    </>
  );
}

const chains = ["Ethereum", "Base", "Arbitrum", "BNB Chain", "Solana", "HyperEVM"];
const dotColors = ["#8FA6E8", "#E79CC2", "#6FCFAE"];

export function RouteViz() {
  const ys = chains.map((_, i) => 60 + i * 68);
  const pipe = (y: number) => `M210 ${y}C400 ${y} 420 230 540 230`;
  return (
    <svg width="100%" viewBox="0 0 1200 460" role="img" aria-label="Six chains flow through Elyport into your Elysium wallet" style={{ display: "block" }}>
      <defs>
        <linearGradient id="rStreak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#BFD7FF" />
          <stop offset="0.5" stopColor="#F7C8E0" />
          <stop offset="1" stopColor="#C6F5E6" />
        </linearGradient>
        <linearGradient id="rChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.48" stopColor="#B9C1CC" />
          <stop offset="0.53" stopColor="#9DA7B4" />
          <stop offset="1" stopColor="#D3D9E0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#E1E6ED" strokeWidth="8" strokeLinecap="round">
        {ys.map((y) => (
          <path key={y} d={pipe(y)} />
        ))}
        <path d="M660 230H990" strokeWidth="16" />
      </g>
      <g fill="none" stroke="url(#rStreak)" strokeWidth="8" strokeLinecap="round" strokeDasharray="46 420">
        {ys.map((y, i) => (
          <path key={y} d={pipe(y)}>
            <animate attributeName="stroke-dashoffset" values="466;0" dur="2.6s" begin={`${i * 0.42}s`} repeatCount="indefinite" />
          </path>
        ))}
        <path d="M660 230H990" strokeWidth="16" strokeDasharray="80 330">
          <animate attributeName="stroke-dashoffset" values="410;0" dur="1.8s" repeatCount="indefinite" />
        </path>
      </g>
      {[0, 2, 4].map((i, k) => (
        <circle key={i} r="5" fill={dotColors[k]}>
          <animateMotion dur="2.6s" begin={`${k * 0.85}s`} repeatCount="indefinite" path={pipe(ys[i])} />
        </circle>
      ))}
      {[0, 0.9].map((b) => (
        <circle key={b} r="6" fill="#14171C">
          <animateMotion dur="1.8s" begin={`${b}s`} repeatCount="indefinite" path="M660 230H990" />
        </circle>
      ))}
      <g className="mono" fontSize="15" fill="#14171C" textAnchor="middle">
        {chains.map((c, i) => (
          <g key={c}>
            <rect x="40" y={ys[i] - 22} width="170" height="44" rx="22" fill="#FFFFFF" stroke="#DDE2E9" />
            <text x="125" y={ys[i] + 5}>
              {c}
            </text>
          </g>
        ))}
      </g>
      <circle cx="600" cy="230" r="62" fill="#FFFFFF" stroke="#DDE2E9" strokeWidth="2" />
      <circle cx="600" cy="230" r="62" fill="none" stroke="#BFD7FF" strokeWidth="2">
        <animate attributeName="r" values="62;90" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="600" cy="230" r="40" fill="url(#rChrome)" stroke="#B9C1CC" />
      <text x="825" y="206" textAnchor="middle" className="mono" fontSize="14" fill="#5D6573">
        HYPE · gas ready
      </text>
      <rect x="1000" y="186" width="176" height="88" rx="24" fill="#FFFFFF" stroke="#DDE2E9" />
      <text x="1088" y="226" textAnchor="middle" fontSize="18" fill="#14171C">
        Your wallet
      </text>
      <text x="1088" y="250" textAnchor="middle" className="mono" fontSize="13" fill="#5D6573">
        on Elysium
      </text>
    </svg>
  );
}

export function FanOut({ width = 360 }: { width?: number }) {
  const ys = [20, 46, 71, 97, 123, 149, 174, 200];
  const p = (y: number) => `M70 110C180 110 200 ${y} 300 ${y}`;
  return (
    <svg width="100%" viewBox="0 0 360 220" role="img" aria-label="One wallet sending to many wallets" style={{ maxWidth: width }}>
      <defs>
        <linearGradient id="fChr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.48" stopColor="#B9C1CC" />
          <stop offset="0.53" stopColor="#9DA7B4" />
          <stop offset="1" stopColor="#D3D9E0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#E1E6ED" strokeWidth="2">
        {ys.map((y) => (
          <path key={y} d={p(y)} />
        ))}
      </g>
      {ys.map((y, i) => (
        <circle key={y} r="4" fill={dotColors[i % 3]}>
          <animateMotion dur="2.2s" begin={`${i * 0.25}s`} repeatCount="indefinite" path={p(y)} />
        </circle>
      ))}
      <g fill="#FFFFFF" stroke="#C9D0D9" strokeWidth="2">
        {ys.map((y) => (
          <circle key={y} cx="310" cy={y} r="7" />
        ))}
      </g>
      <circle cx="50" cy="110" r="24" fill="url(#fChr)" stroke="#B9C1CC" />
    </svg>
  );
}

export function LockRing({ label }: { label?: string }) {
  return (
    <svg width="100%" viewBox="0 0 360 240" role="img" aria-label="A lock closing as its timer completes" style={{ maxWidth: 360 }}>
      <defs>
        <linearGradient id="lHolo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E79CC2" />
          <stop offset="0.5" stopColor="#8FA6E8" />
          <stop offset="1" stopColor="#6FCFAE" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="110" r="78" fill="none" stroke="#E6EAF0" strokeWidth="10" />
      <circle cx="180" cy="110" r="78" fill="none" stroke="url(#lHolo)" strokeWidth="10" strokeLinecap="round" strokeDasharray="490" strokeDashoffset="490" transform="rotate(-90 180 110)">
        <animate attributeName="stroke-dashoffset" values="490;0;0" keyTimes="0;0.8;1" dur="6s" repeatCount="indefinite" />
      </circle>
      <path d="M166 108V96a14 14 0 0 1 28 0v12" fill="none" stroke="#14171C" strokeWidth="6" strokeLinecap="round">
        <animateTransform attributeName="transform" type="translate" values="0 -10;0 -10;0 0;0 0" keyTimes="0;0.8;0.86;1" dur="6s" repeatCount="indefinite" />
      </path>
      <rect x="156" y="106" width="48" height="38" rx="9" fill="#14171C" />
      <circle cx="180" cy="123" r="4" fill="#FFFFFF" />
      {label && (
        <text x="180" y="228" textAnchor="middle" className="mono" fontSize="14" fill="#14171C">
          {label}
        </text>
      )}
    </svg>
  );
}

export function VestBars({ cliffLabel = "cliff" }: { cliffLabel?: string }) {
  const bars = Array.from({ length: 8 }, (_, i) => ({ x: 64 + i * 34, h: 22 + i * 20, t: 0.05 + i * 0.09 }));
  return (
    <svg width="100%" viewBox="0 0 360 220" role="img" aria-label="Tokens releasing step by step after a cliff" style={{ maxWidth: 360 }}>
      <defs>
        <linearGradient id="vBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9D3F6" />
          <stop offset="1" stopColor="#E9EDF3" />
        </linearGradient>
      </defs>
      <path d="M30 196H340" stroke="#D3D9E1" strokeWidth="2" />
      <path d="M52 30V196" stroke="#8FA6E8" strokeWidth="2" strokeDasharray="4 5" />
      <text x="58" y="40" className="mono" fontSize="12" fill="#5D6573">
        {cliffLabel}
      </text>
      <g fill="url(#vBar)" stroke="#B9C4DF">
        {bars.map((b) => (
          <rect key={b.x} x={b.x} y="196" width="26" height="0" rx="5">
            <animate attributeName="height" values={`0;0;${b.h};${b.h}`} keyTimes={`0;${b.t.toFixed(2)};${(b.t + 0.07).toFixed(2)};1`} dur="8s" repeatCount="indefinite" />
            <animate attributeName="y" values={`196;196;${196 - b.h};${196 - b.h}`} keyTimes={`0;${b.t.toFixed(2)};${(b.t + 0.07).toFixed(2)};1`} dur="8s" repeatCount="indefinite" />
          </rect>
        ))}
      </g>
    </svg>
  );
}

export function TokenGauge() {
  const rings = [
    { r: 240, fill: "#EEF1F8" },
    { r: 180, fill: "#E4E9F7" },
    { r: 120, fill: "#DAE2F7" },
    { r: 60, fill: "#CFD9F6" },
  ];
  const arc = (r: number) => `M${260 - r} 290A${r} ${r} 0 0 1 ${260 + r} 290`;
  return (
    <svg width="100%" viewBox="0 0 520 330" role="img" aria-label="A token's safety, shown as nested gates around its contract">
      {rings.map((g) => (
        <path key={g.r} d={`${arc(g.r)}Z`} fill={g.fill} stroke="#FFFFFF" strokeWidth="2" />
      ))}
      <g stroke="#FFFFFF" strokeWidth="1.5" opacity="0.9">
        {[[20, 290], [52, 170], [140, 82], [260, 50], [380, 82], [468, 170], [500, 290]].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M260 290L${x} ${y}`} />
        ))}
      </g>
      <g fill="none" stroke="#8FA6E8" strokeWidth="2">
        {[60, 120, 180, 240].map((r, i) => (
          <path key={r} d={arc(r)}>
            <animate attributeName="opacity" values="0;0;1;0;0" keyTimes={`0;${(i * 0.18).toFixed(2)};${(i * 0.18 + 0.12).toFixed(2)};${(i * 0.18 + 0.3).toFixed(2)};1`} dur="3s" repeatCount="indefinite" />
          </path>
        ))}
      </g>
      <circle cx="260" cy="290" r="6" fill="#14171C" />
      <text x="260" y="318" textAnchor="middle" fontSize="17" fill="#14171C">
        Token page
      </text>
    </svg>
  );
}

export function CtaScene() {
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="cChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.42" stopColor="#C3CAD4" />
          <stop offset="0.5" stopColor="#A3ADBA" />
          <stop offset="1" stopColor="#DDE2E8" />
        </linearGradient>
        <filter id="cB10" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <g fill="none" opacity="0.55">
        <path d="M520 900V560A200 200 0 0 1 920 560V900" stroke="url(#cChrome)" strokeWidth="26" />
        <path d="M590 900V560A130 130 0 0 1 850 560V900" stroke="url(#cChrome)" strokeWidth="18" />
      </g>
      <g filter="url(#cB10)">
        <animateTransform attributeName="transform" type="translate" values="0 0;60 0;0 0" dur="24s" repeatCount="indefinite" />
        <ellipse cx="260" cy="600" rx="360" ry="70" fill="#FFFFFF" />
        <ellipse cx="1180" cy="590" rx="380" ry="74" fill="#FFFFFF" />
        <ellipse cx="720" cy="680" rx="640" ry="90" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
