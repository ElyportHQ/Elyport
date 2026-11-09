import type { Metadata } from "next";
import { LockConsole } from "./LockConsole";

export const metadata: Metadata = { title: "Locker", description: "Lock LP and tokens on Elysium until a date you set. Every lock has a public page." };

export default function LockPage() {
  return (
    <div style={{ background: "linear-gradient(180deg, #EAF1F6 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Tools / Locker</div>
            <h1>Locker</h1>
            <p>Lock LP or tokens until a date you set. Anyone can verify it.</p>
          </div>
        </div>
        <LockConsole />
      </div>
    </div>
  );
}
