import type { Metadata } from "next";
import { RefuelConsole } from "./RefuelConsole";

export const metadata: Metadata = { title: "Refuel", description: "Get HYPE for gas on Elysium from Ethereum, Base, Arbitrum, BNB Chain, Solana or HyperEVM." };

export default function RefuelPage() {
  return (
    <div style={{ background: "linear-gradient(180deg, #ECEEF8 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Tools / Refuel</div>
            <h1>Refuel</h1>
            <p>Pay from any chain. Land on Elysium with HYPE for gas.</p>
          </div>
        </div>
        <RefuelConsole />
      </div>
    </div>
  );
}
