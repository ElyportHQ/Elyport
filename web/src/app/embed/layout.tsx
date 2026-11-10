import type { Metadata } from "next";
import type { ReactNode } from "react";
import { EmbedResize } from "@/components/embed/EmbedResize";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ew-page">
      <EmbedResize />
      {children}
    </div>
  );
}
