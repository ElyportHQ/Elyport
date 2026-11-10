import type { Metadata } from "next";
import { AdminConsole } from "./AdminConsole";

export const metadata: Metadata = { title: "Owner console", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="container" style={{ maxWidth: 760, padding: "40px 20px 80px" }}>
      <h1 style={{ margin: "0 0 8px" }}>Owner console</h1>
      <p style={{ margin: "0 0 28px", color: "var(--muted)" }}>
        Every change to fees, the fee recipient, the holder discount or the DEX list goes through a public 48-hour timelock.
        Anyone can see scheduled changes on <a href="/docs/status#timelock">Live status</a>. Only the owner wallet can schedule.
      </p>
      <AdminConsole />
    </main>
  );
}
