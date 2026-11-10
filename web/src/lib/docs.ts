export type DocIcon = "spark" | "plug" | "fuel" | "drop" | "send" | "lock" | "bars" | "search" | "ticket" | "user" | "badge" | "coin" | "code" | "shield" | "help" | "doc" | "embed" | "api" | "package" | "pulse";

export type DocLink = { href: string; title: string; blurb: string; icon: DocIcon };
export type DocGroup = { id: string; n: string; title: string; pages: DocLink[] };

/** Bump when the docs content changes. */
export const DOCS_UPDATED = "10 November 2026";
export const DOCS_EDIT_BASE = "https://github.com/ElyportHQ/Elyport/blob/main/web/src/app";

export const docGroups: DocGroup[] = [
  {
    id: "start",
    n: "01",
    title: "Get started",
    pages: [
      { href: "/docs", title: "What is Elyport", blurb: "The toolkit in one page", icon: "spark" },
      { href: "/docs/connect", title: "Connect to Elysium", blurb: "Wallets and network details", icon: "plug" },
      { href: "/docs/getting-hype", title: "Get HYPE for gas", blurb: "Your first transaction", icon: "fuel" },
    ],
  },
  {
    id: "tools",
    n: "02",
    title: "Tools",
    pages: [
      { href: "/docs/refuel", title: "Gas Refuel", blurb: "Pay on one chain, get HYPE", icon: "drop" },
      { href: "/docs/gas-drop", title: "Gas Drop", blurb: "Send to 500 wallets at once", icon: "send" },
      { href: "/docs/locker", title: "Locker", blurb: "Lock LP or tokens", icon: "lock" },
      { href: "/docs/vesting", title: "Vesting", blurb: "Cliffs and release schedules", icon: "bars" },
    ],
  },
  {
    id: "pages",
    n: "03",
    title: "Pages & sharing",
    pages: [
      { href: "/docs/explore", title: "Explore & token pages", blurb: "Check any token's locks", icon: "search" },
      { href: "/docs/claim-pages", title: "Claim pages", blurb: "One link for every holder", icon: "ticket" },
      { href: "/docs/my-elyport", title: "My Elyport", blurb: "Your dashboard", icon: "user" },
      { href: "/docs/badge", title: "Lock badge", blurb: "Show locks on your site", icon: "badge" },
    ],
  },
  {
    id: "build",
    n: "04",
    title: "Build with Elyport",
    pages: [
      { href: "/docs/widgets", title: "Widgets", blurb: "Claim and lock widgets for any site", icon: "embed" },
      { href: "/docs/api", title: "Public API", blurb: "Read locks and vesting as JSON", icon: "api" },
      { href: "/docs/sdk", title: "SDK", blurb: "Lock, vest and drop from your app", icon: "package" },
    ],
  },
  {
    id: "reference",
    n: "05",
    title: "Reference",
    pages: [
      { href: "/docs/fees", title: "Fees & limits", blurb: "Every number in one table", icon: "coin" },
      { href: "/docs/contracts", title: "Contracts", blurb: "Addresses and source", icon: "code" },
      { href: "/docs/security", title: "Security model", blurb: "What the contracts guarantee", icon: "shield" },
      { href: "/docs/status", title: "Live status", blurb: "Every contract, read from the chain now", icon: "pulse" },
      { href: "/docs/faq", title: "FAQ", blurb: "Quick answers", icon: "help" },
    ],
  },
  {
    id: "legal",
    n: "06",
    title: "Legal",
    pages: [
      { href: "/terms", title: "Terms", blurb: "Using Elyport", icon: "doc" },
      { href: "/privacy", title: "Privacy", blurb: "What we keep", icon: "doc" },
      { href: "/risk", title: "Risks", blurb: "Read before you use it", icon: "doc" },
    ],
  },
];

export const flatDocs = docGroups.flatMap((g) => g.pages.map((p) => ({ ...p, group: g })));

export function docMeta(href: string) {
  const i = flatDocs.findIndex((d) => d.href === href);
  const cur = flatDocs[i];
  return { page: cur, group: cur?.group, prev: i > 0 ? flatDocs[i - 1] : undefined, next: i >= 0 ? flatDocs[i + 1] : undefined };
}

/** Public deposit contracts for Instant Refuel on each source chain. */
export const depositContracts = [
  { chainId: 1, chain: "Ethereum", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://etherscan.io/address/" },
  { chainId: 8453, chain: "Base", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://basescan.org/address/" },
  { chainId: 42161, chain: "Arbitrum", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://arbiscan.io/address/" },
  { chainId: 4663, chain: "Robinhood Chain", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://robinhoodchain.blockscout.com/address/" },
  { chainId: 56, chain: "BNB Chain", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://bscscan.com/address/" },
  { chainId: 999, chain: "HyperEVM", address: "0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A", explorer: "https://hyperevmscan.io/address/" },
];

/** Earlier contract versions. They were never used; /status proves it live from the chain. */
export const retiredContracts = {
  elysium: [
    { name: "Locker", version: "v1", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39", kind: "locker" },
    { name: "Vesting", version: "v1", address: "0xb5cedd59dd57d9145ff6d5fca3fb171304f055f7", kind: "vesting" },
    { name: "Gas Drop", version: "v1", address: "0x9e5dc700de34a441e1d0b74fc88d1b1f666ff9b4", kind: "drop" },
    { name: "Locker", version: "v2", address: "0x7868e66c72df8dd0827f93e3674e53f72f8939cc", kind: "locker" },
    { name: "Vesting", version: "v2", address: "0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e", kind: "vesting" },
    { name: "Gas Drop", version: "v2", address: "0x7ba7b360771b23277991f29488afe8827d2bce33", kind: "drop" },
    { name: "Refuel vault", version: "v1–v2", address: "0xa43e860ec638b039cb926e98590852c2fdcbcf65", kind: "vault" },
  ],
  deposits: [
    { chainId: 1, chain: "Ethereum", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39" },
    { chainId: 8453, chain: "Base", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39" },
    { chainId: 42161, chain: "Arbitrum", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39" },
    { chainId: 4663, chain: "Robinhood Chain", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39" },
    { chainId: 56, chain: "BNB Chain", address: "0xc051f16eab3b7c2a74fabc4dd0acfa5b5d5f4c39" },
    { chainId: 999, chain: "HyperEVM", address: "0x739a2b5d9ea7647ecc2de63c67ed04fe4a432c3e" },
  ],
} as const;

export const roles = {
  owner: "0x90D772A278F559853524C4803A27ba51324638dc",
  treasury: "0xb3A4886c9F42Dd34F65a1B0DA7A3a7e3b0F72014",
  relayer: "0x48Ee3081A156D0713c86C0a3360bABb07b823dB2",
};
