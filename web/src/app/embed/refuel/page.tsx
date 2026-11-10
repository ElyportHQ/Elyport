import type { Metadata } from "next";
import { RefuelConsole } from "@/app/refuel/RefuelConsole";

export const metadata: Metadata = { title: "Refuel widget" };

/** Refuel widget for other sites: /embed/refuel?to=0x… (optional recipient on Elysium). */
export default async function EmbedRefuelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 8 }}>
      <RefuelConsole embedded defaultRecipient={to} />
    </div>
  );
}
