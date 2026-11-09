import type { Metadata } from "next";
import { VestConsole } from "./VestConsole";

export const metadata: Metadata = { title: "Vesting", description: "Release tokens on Elysium on a schedule with a cliff, linear or monthly." };

export default function VestPage() {
  return (
    <div style={{ background: "linear-gradient(180deg, #EEF3EF 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Tools / Vesting</div>
            <h1>Vesting</h1>
            <p>Release tokens on a schedule anyone can follow.</p>
          </div>
        </div>
        <VestConsole />
      </div>
    </div>
  );
}
