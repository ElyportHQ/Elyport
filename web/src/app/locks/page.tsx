import type { Metadata } from "next";
import { ExploreLocks } from "./ExploreLocks";

export const metadata: Metadata = { title: "Explore locks", description: "Every lock on Elyport, public and verifiable." };

export default function LocksPage() {
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Explore</div>
          <h1>All locks</h1>
          <p>Search a token before you buy. Every lock here is on-chain.</p>
        </div>
      </div>
      <ExploreLocks />
    </div>
  );
}
