import type { Metadata } from "next";
import { MeView } from "./MeView";

export const metadata: Metadata = {
  title: "My Elyport",
  description: "Your locks, vesting and drops on Elyport, in one place.",
  robots: { index: false },
};

export default function MePage() {
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>My Elyport</h1>
          <p>Your locks, vesting and drops in one place. Claim and withdraw right here.</p>
        </div>
      </div>
      <MeView />
    </div>
  );
}
