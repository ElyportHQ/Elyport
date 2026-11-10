import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAddress, type Address } from "viem";
import { getMontraLaunch } from "@/lib/montra";
import { TokenView } from "./TokenView";

export async function generateMetadata({ params }: { params: Promise<{ address: string }> }): Promise<Metadata> {
  const { address } = await params;
  return { title: `Token ${address.slice(0, 6)}…${address.slice(-4)}`, description: "Locks and vesting for this token on Elyport." };
}

export default async function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!isAddress(address)) notFound();
  const montra = await getMontraLaunch(address as Address);
  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Explore / Token</div>
          <h1>Token safety</h1>
          <p>Every lock and vesting schedule behind this token, on one page.</p>
        </div>
      </div>
      <TokenView token={address as Address} montra={montra} />
    </div>
  );
}
