import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { ClaimView } from "./ClaimView";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Claim · ${token.slice(0, 6)}…${token.slice(-4)}`,
    description: "Check and claim your vested tokens on Elyport.",
  };
}

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isAddress(token)) notFound();
  return (
    <div className="container page">
      <ClaimView token={token as Address} />
    </div>
  );
}
