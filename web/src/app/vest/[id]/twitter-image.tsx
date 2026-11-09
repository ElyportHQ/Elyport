import { contracts } from "@/lib/config";
import { vestingAbi } from "@/lib/abis";
import { amountText, dateText, elysiumClient, ogCard, OG_SIZE, shortAddr, tokenMeta } from "@/lib/og";

export const alt = "Elyport vesting schedule";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

type P = { params: Promise<{ id: string }> | { id: string } };

export default async function Image({ params }: P) {
  const { id } = await Promise.resolve(params);
  const fallback = () => ogCard({ eyebrow: "Vesting", title: `Schedule #${id}`, big: "Vesting on Elysium", lines: ["Released on time, claim by claim."] });
  if (!contracts.vesting || !/^\d+$/.test(id)) return fallback();
  try {
    const c = elysiumClient();
    const s = await c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "getSchedule", args: [BigInt(id)] });
    const meta = await tokenMeta(s.token);
    const now = Math.floor(Date.now() / 1000);
    const vested = await c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "vestedAmount", args: [BigInt(id), BigInt(now)] }).catch(() => 0n);
    const share = s.total > 0n ? Number((vested * 10_000n) / s.total) / 10_000 : 0;
    const end = Number(s.start) + Number(s.duration);
    return ogCard({
      eyebrow: "Vesting",
      title: `Schedule #${id} · for ${shortAddr(s.beneficiary)}`,
      big: `${amountText(s.total, meta.decimals)} ${meta.symbol}`,
      lines: [`${Math.round(share * 100)}% vested · ends ${dateText(end)}`],
      pills: [s.revoked ? "Revoked" : share >= 1 ? "Fully vested" : "Vesting", Number(s.period) > 1 ? "Monthly" : "Linear"],
      progress: share,
    });
  } catch {
    return fallback();
  }
}
