import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { EmbedClaim } from "@/components/embed/EmbedClaim";
import { embedTheme } from "@/components/embed/theme";

export const metadata: Metadata = { title: "Claim widget" };

export default async function EmbedClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  if (!isAddress(token)) notFound();
  const { theme, style } = embedTheme(await searchParams);
  return <EmbedClaim token={token as Address} theme={theme} style={style} />;
}
