import type { Metadata } from "next";
import { DropConsole } from "./DropConsole";

export const metadata: Metadata = { title: "Gas Drop", description: "Send HYPE or any token to thousands of Elysium wallets from one list." };

export default function DropPage() {
  return (
    <div style={{ background: "linear-gradient(180deg, #F3EEF6 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Tools / Gas Drop</div>
            <h1>Gas Drop</h1>
            <p>Send HYPE or any token to thousands of wallets from one list.</p>
          </div>
        </div>
        <DropConsole />
      </div>
    </div>
  );
}
