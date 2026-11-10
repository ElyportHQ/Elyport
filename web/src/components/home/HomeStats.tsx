import { getSiteStats } from "@/lib/siteStats";

type Tile = { label: string; value: string; note: string };

const fmt = (n: number) => n.toLocaleString("en-US");
const hype = (v: string) => {
  const n = Number(v);
  return n >= 100 ? fmt(Math.round(n)) : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const STATIC: Tile[] = [
  { label: "Chains", value: "7", note: "pay from to refuel" },
  { label: "Verified contracts", value: "10", note: "open source, on every chain" },
  { label: "Wallets per drop", value: "500", note: "in one transaction" },
];

/** Lifetime numbers read from the chain; falls back to fixed facts until there is usage to show. */
export async function HomeStats() {
  const s = await getSiteStats();
  const live: Tile[] = [];
  if (s && s.locks > 0) live.push({ label: "Locks created", value: fmt(s.locks), note: `for ${fmt(s.projects)} ${s.projects === 1 ? "token" : "tokens"}, all public` });
  if (s && s.dropWallets > 0) live.push({ label: "Wallets reached", value: fmt(s.dropWallets), note: `by ${fmt(s.drops)} Gas ${s.drops === 1 ? "Drop" : "Drops"}` });
  if (s && s.refuels > 0) live.push({ label: "HYPE delivered", value: hype(s.refuelHype), note: `in ${fmt(s.refuels)} instant ${s.refuels === 1 ? "refuel" : "refuels"}` });
  const tiles = [...live, ...STATIC].slice(0, Math.max(3, live.length));

  return (
    <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "32px 24px" }}>
      {tiles.map((i) => (
        <div key={i.label}>
          <div className="eyebrow">{i.label}</div>
          <div style={{ marginTop: 6, fontSize: 44, fontWeight: 300, letterSpacing: "-0.04em" }}>{i.value}</div>
          <div style={{ marginTop: 2, fontSize: 14, color: "#5D6573" }}>{i.note}</div>
        </div>
      ))}
    </div>
  );
}
