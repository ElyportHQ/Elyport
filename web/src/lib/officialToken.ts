import "server-only";
import { unstable_cache } from "next/cache";
import type { Address } from "viem";
import { elysiumPublic } from "./chainClients";
import { findOfficialToken, OFFICIAL, type OfficialToken } from "./officialTokenCore";

export { OFFICIAL, montraUrl, type OfficialToken } from "./officialTokenCore";

// Re-checked at most once a minute; a manual override wins if set.
const cached = unstable_cache(
  async () =>
    findOfficialToken(elysiumPublic(), {
      ...OFFICIAL,
      scanBlocks: BigInt(process.env.OFFICIAL_TOKEN_SCAN_BLOCKS || 200_000),
    }).catch(() => null),
  ["official-token-v2"],
  { revalidate: 60 },
);

export async function getOfficialToken(): Promise<OfficialToken | null> {
  const manual = process.env.OFFICIAL_TOKEN_ADDRESS;
  if (manual && /^0x[0-9a-fA-F]{40}$/.test(manual)) return { address: manual as Address, name: "Elyport", symbol: OFFICIAL.symbol, block: "" };
  return cached();
}
