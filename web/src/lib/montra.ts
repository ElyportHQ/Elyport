import "server-only";
import { unstable_cache } from "next/cache";
import type { Address } from "viem";
import { elysiumPublic } from "./chainClients";
import { OFFICIAL, verifyMontraLaunch, type MontraLaunch } from "./officialTokenCore";

export type { MontraLaunch } from "./officialTokenCore";

/** Montra launch info for a token, verified on-chain; cached per token for 10 minutes. */
export function getMontraLaunch(token: Address): Promise<MontraLaunch | null> {
  return unstable_cache(
    () => verifyMontraLaunch(elysiumPublic(), token, OFFICIAL).catch(() => null),
    ["montra-launch-v1", token.toLowerCase()],
    { revalidate: 600 },
  )();
}
