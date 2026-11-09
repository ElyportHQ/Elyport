import { isAddress, type Address } from "viem";
import { contracts } from "@/lib/config";
import { lockerAbi, vestingAbi } from "@/lib/abis";
import { elysiumClient, ogCard, OG_SIZE, shortAddr, tokenMeta } from "@/lib/og";

export const alt = "Elyport token safety";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ address: string }> | { address: string } };

export default async function Image({ params }: P) {
  const { address } = await Promise.resolve(params);
  if (!isAddress(address)) return ogCard({ eyebrow: "Explore", title: "Token safety", big: "Check before you buy" });
  const token = address as Address;
  try {
    const c = elysiumClient();
    const [meta, locks, schedules] = await Promise.all([
      tokenMeta(token),
      contracts.locker ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] }).catch(() => []) : Promise.resolve([]),
      contracts.vesting ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token] }).catch(() => []) : Promise.resolve([]),
    ]);
    const nl = (locks as readonly bigint[]).length;
    const ns = (schedules as readonly bigint[]).length;
    return ogCard({
      eyebrow: "Token safety",
      title: `${meta.name ?? meta.symbol} · ${shortAddr(token)}`,
      big: meta.symbol,
      lines: [`${nl} ${nl === 1 ? "lock" : "locks"} · ${ns} vesting ${ns === 1 ? "schedule" : "schedules"}`],
      pills: [nl > 0 ? "Liquidity locked" : "No locks yet", ns > 0 ? "Team vesting" : "No vesting yet"],
    });
  } catch {
    return ogCard({ eyebrow: "Token safety", title: shortAddr(token), big: "Check before you buy" });
  }
}
