type P = { size?: number; color?: string };

const base = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconSearch = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);
export const IconMenu = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <path d="M5 9h14" />
    <path d="M5 15h14" />
  </svg>
);
export const IconClose = ({ size = 18, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);
export const IconDrop = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <path d="M12 3C12 3 6 10 6 14a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
  </svg>
);
export const IconSend = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22 11 13 2 9 22 2z" />
  </svg>
);
export const IconLock = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const IconBars = ({ size = 20, color = "#14171C" }: P) => (
  <svg {...base(size, color)}>
    <path d="M4 20h16" />
    <path d="M6 16v-3" />
    <path d="M11 16V9" />
    <path d="M16 16V5" />
  </svg>
);
