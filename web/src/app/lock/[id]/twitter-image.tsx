import { contracts } from "@/lib/config";
import { lockerAbi } from "@/lib/abis";
import { amountText, dateText, elysiumClient, ogCard, OG_SIZE, tokenMeta } from "@/lib/og";

export const alt = "Elyport lock";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ id: string }> | { id: string } };

export default async function Image({ params }: P) {
  const { id } = await Promise.resolve(params);
  const fallback = () => ogCard({ eyebrow: "Locker", title: `Lock #${id}`, big: "Locked on Elysium", lines: ["Public and verifiable by anyone."] });
  if (!contracts.locker || !/^\d+$/.test(id)) return fallback();
  try {
    const l = await elysiumClient().readContract({ address: contracts.locker, abi: lockerAbi, functionName: "getLock", args: [BigInt(id)] });
    const meta = await tokenMeta(l.token);
    const now = Date.now() / 1000;
    const total = Number(l.unlockAt) - Number(l.createdAt);
    const done = total > 0 ? Math.min(1, Math.max(0, (now - Number(l.createdAt)) / total)) : 1;
    const status = l.withdrawn ? "Withdrawn" : Number(l.unlockAt) <= now ? "Unlocked" : "Locked";
    return ogCard({
      eyebrow: "Locker",
      title: `Lock #${id} · ${meta.name ?? meta.symbol}`,
      big: `${amountText(l.amount, meta.decimals)} ${meta.symbol}`,
      lines: [`${status === "Locked" ? "Unlocks" : "Unlocked"} ${dateText(l.unlockAt)}`],
      pills: [status, l.isLP ? "LP token" : "Token"],
      progress: done,
    });
  } catch {
    return fallback();
  }
}
