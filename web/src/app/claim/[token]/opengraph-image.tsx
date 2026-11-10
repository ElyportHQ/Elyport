import { isAddress, type Address } from "viem";
import { ogCard, OG_SIZE, tokenMeta } from "@/lib/og";

export const alt = "Claim on Elyport";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ token: string }> | { token: string } };

export default async function Image({ params }: P) {
  const { token } = await Promise.resolve(params);
  if (!isAddress(token)) return ogCard({ eyebrow: "Claim", title: "Vested tokens", big: "Claim on Elyport" });
  const meta = await tokenMeta(token as Address).catch(() => ({ symbol: "TOKEN", decimals: 18, name: undefined }));
  return ogCard({
    eyebrow: "Claim",
    title: meta.name ?? meta.symbol,
    big: `Claim your ${meta.symbol}`,
    lines: ["Connect the wallet that receives it. Vested tokens are ready on schedule."],
    pills: ["Vesting", "On-chain"],
  });
}
