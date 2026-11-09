import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockView } from "./LockView";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Lock #${id}`, description: `Public, verifiable lock #${id} on Elyport.` };
}

export default async function LockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return (
    <div style={{ background: "linear-gradient(180deg, #EAF1F6 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Locker / Lock #{id}</div>
            <h1>Lock #{id}</h1>
            <p>Verified on-chain. Anyone can check it.</p>
          </div>
        </div>
        <LockView idStr={id} />
      </div>
    </div>
  );
}
