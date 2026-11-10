export type DocIcon = "spark" | "plug" | "fuel" | "drop" | "send" | "lock" | "bars" | "search" | "ticket" | "user" | "badge" | "coin" | "code" | "shield" | "help" | "doc" | "embed" | "api" | "package";

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
  { chain: "Ethereum", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://etherscan.io/address/" },
  { chain: "Base", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://basescan.org/address/" },
  { chain: "Arbitrum", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://arbiscan.io/address/" },
  { chain: "Robinhood Chain", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://robinhoodchain.blockscout.com/address/" },
  { chain: "BNB Chain", address: "0x9E5dc700De34a441e1d0b74Fc88D1b1F666ff9B4", explorer: "https://bscscan.com/address/" },
  { chain: "HyperEVM", address: "0xD5C3e28D683B948Ff8e96AD12f04986EaA13127A", explorer: "https://hyperevmscan.io/address/" },
];

export const roles = {
  owner: "0x90D772A278F559853524C4803A27ba51324638dc",
  treasury: "0xb3A4886c9F42Dd34F65a1B0DA7A3a7e3b0F72014",
};
