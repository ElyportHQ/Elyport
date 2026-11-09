import Link from "next/link";
import { Emblem } from "@/components/Emblem";

export default function NotFound() {
  return (
    <div className="container page lost">
      <div className="lost-emblem" aria-hidden="true">
        <Emblem uid="lost" size={120} simple={false} />
      </div>
      <div className="eyebrow">404 · Off the map</div>
      <h1>This gate leads nowhere</h1>
      <p>The page you are looking for does not exist, or it moved. Try one of these instead.</p>
      <div className="lost-links">
        <Link className="btn btn-dark" href="/">
          Back home
        </Link>
        <Link className="btn btn-ghost" href="/refuel">
          Refuel
        </Link>
        <Link className="btn btn-ghost" href="/locks">
          Explore locks
        </Link>
      </div>
    </div>
  );
}
