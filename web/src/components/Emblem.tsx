/** The Elyport gate emblem. `uid` keeps SVG gradient/mask ids unique per instance. */
export function Emblem({ size = 36, uid, simple = true, label }: { size?: number; uid: string; simple?: boolean; label?: string }) {
  const g = `em-g-${uid}`;
  const m = `em-m-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ filter: "drop-shadow(0 2px 4px rgba(60,72,92,0.25))", flex: "none" }}
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.3" stopColor="#E6EAEF" />
          <stop offset="0.48" stopColor="#B9C1CC" />
          <stop offset="0.53" stopColor="#9DA7B4" />
          <stop offset="0.72" stopColor="#D3D9E0" />
          <stop offset="1" stopColor="#A7B0BC" />
        </linearGradient>
        <mask id={m} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          {simple ? (
            <>
              <path d="M41 82V50A9 9 0 0 1 59 50V82Z" fill="#000" />
              <path d="M30 82V50A20 20 0 0 1 70 50V82 M17 82V50A33 33 0 0 1 83 50V82" fill="none" stroke="#000" strokeWidth="6" />
              <path d="M0 87H100" stroke="#000" strokeWidth="5" />
            </>
          ) : (
            <>
              <path d="M44 82V50A6 6 0 0 1 56 50V82Z" fill="#000" />
              <path
                d="M38 82V50A12 12 0 0 1 62 50V82 M31.5 82V50A18.5 18.5 0 0 1 68.5 50V82 M25 82V50A25 25 0 0 1 75 50V82 M18.5 82V50A31.5 31.5 0 0 1 81.5 50V82 M12 82V50A38 38 0 0 1 88 50V82"
                fill="none"
                stroke="#000"
                strokeWidth="3"
              />
              <path d="M0 85.5H100" stroke="#000" strokeWidth="3" />
            </>
          )}
        </mask>
      </defs>
      <circle cx="50" cy="50" r="48" mask={`url(#${m})`} fill={`url(#${g})`} />
    </svg>
  );
}
