import type { Metadata } from "next";
import { LockConsole } from "./LockConsole";

export const metadata: Metadata = { title: "Locker", description: "Lock LP and tokens on Elysium until a date you set. Every lock has a public page." };

type SP = Promise<{ token?: string | string[]; type?: string | string[] }>;

export default async function LockPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const one = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const t = one(sp.token);
  const initialToken = t && /^0x[0-9a-fA-F]{40}$/.test(t) ? t : undefined;
  const ty = one(sp.type);
  const initialType = ty === "token" || ty === "lp" ? ty : undefined;
  return (
    <div style={{ background: "linear-gradient(180deg, #EAF1F6 0%, #F5F6F8 420px)" }}>
      <div className="container page">
        <div className="page-head">
          <div>
            <div className="eyebrow">Tools / Locker</div>
            <h1>Locker</h1>
            <p>Lock LP or tokens until a date you set. Anyone can verify it.</p>
          </div>
        </div>
        <LockConsole initialToken={initialToken} initialType={initialType} />
      </div>
    </div>
  );
}
