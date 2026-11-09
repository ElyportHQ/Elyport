import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VestView } from "./VestView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Vesting #${id}`, description: `Public vesting schedule #${id} on Elyport.` };
}

export default async function VestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return (
    <div style={{ background: "linear-gradient(180deg, #EEF3EF 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Vesting / Schedule #{id}</div>
            <h1>Schedule #{id}</h1>
            <p>Every release is on-chain. Anyone can check it.</p>
          </div>
        </div>
        <VestView idStr={id} />
      </div>
    </div>
  );
}
