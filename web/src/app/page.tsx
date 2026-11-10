import Link from "next/link";
import { CtaScene, FanOut, HeroScene, LockRing, RouteViz, TokenGauge, VestBars } from "@/components/home/Scenes";
import { ActivityTicker, LiveStats } from "@/components/home/LiveStats";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeFooter } from "@/components/Footer";
import { OfficialToken } from "@/components/OfficialToken";

export const revalidate = 60;

const steps = [
  { n: "01", t: "Connect", d: "MetaMask, Rabby, OKX, Coinbase or any WalletConnect wallet.", href: "/refuel", cta: "Connect wallet" },
  { n: "02", t: "Refuel", d: "Get HYPE for gas from the chain you already use.", href: "/refuel", cta: "Open Refuel" },
  { n: "03", t: "Build", d: "Drop, lock or vest your token from one console.", href: "/lock", cta: "Open toolkit" },
  { n: "04", t: "Verify", d: "Share your token page so traders can check it.", href: "/locks", cta: "Explore tokens" },
];

const faqs = [
  { q: "Is Elyport part of Elysium or Kinetiq?", a: "No. Elyport is an independent tool built for the Elysium network. It is not affiliated with Kinetiq or Elysium." },
  { q: "Why do I need HYPE on Elysium?", a: "Elysium uses HYPE for gas. Without it, your wallet cannot send a transaction there." },
  { q: "What does it cost?", a: "Refuel 0.5%. Locks and vesting schedules about $10 each, Gas Drop about $3 a batch, paid in HYPE." },
  { q: "Can a lock be shortened?", a: "No. A lock can be extended or topped up, never shortened." },
];

export default function Home() {
  return (
    <>
      <HeroSection>
        <HeroScene />
        <div className="hero-copy">
          <span className="live-badge">
            <span className="live-dot" />
            Live on Elysium
          </span>
          <h1>
            The port
            <br />
            into Elysium
          </h1>
          <Link href="/drop" className="btn btn-dark btn-lg">
            Launch app
          </Link>
          <Link href="/refuel" className="text-link">
            or refuel gas in 1 click →
          </Link>
        </div>
      </HeroSection>

      <section className="container" style={{ paddingTop: 48, paddingBottom: 8 }}>
        <OfficialToken />
      </section>

      <section style={{ position: "relative", padding: "120px 24px 40px", textAlign: "center", overflow: "hidden" }}>
        <div className="glow-bg" aria-hidden="true" />
        <div style={{ position: "relative" }}>
          <span className="eyebrow">01 · Refuel</span>
          <h2 className="section-title">
            Gas, delivered
            <br />
            to Elysium
          </h2>
          <p className="lead" style={{ maxWidth: 620, margin: "0 auto" }}>
            Elysium runs on HYPE. Pay from the chain you already use and land with gas in your wallet, ready for the first
            transaction.
          </p>
          <Link href="/refuel" className="btn btn-silver btn-lg" style={{ marginTop: 32 }}>
            Explore tools
          </Link>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <RouteViz />
      </section>

      <section className="container" style={{ paddingBottom: 120 }}>
        <div className="stat-grid">
          <div>
            <div className="stat-value">$1</div>
            <div className="stat-label">Smallest refuel</div>
          </div>
          <div>
            <div className="stat-value">0.5%</div>
            <div className="stat-label">Refuel fee</div>
          </div>
          <div>
            <div className="stat-value">7 chains</div>
            <div className="stat-label">Pay from where you are</div>
          </div>
        </div>
      </section>

      <section className="white-band">
        <div className="container section">
          <span className="eyebrow">02 · Builder toolkit</span>
          <h2 className="section-title" style={{ marginBottom: 64 }}>
            Everything a launch
            <br />
            needs on day one
          </h2>
          <div className="tool-grid">
            <div className="tool">
              <FanOut />
              <h3>Gas Drop</h3>
              <span className="tag">One list · thousands of wallets</span>
              <p>Send HYPE or any token from a pasted list or a CSV. Fund your community&apos;s first gas in one go.</p>
              <Link href="/drop" className="link-accent">
                Open Gas Drop ↗
              </Link>
            </div>
            <div className="tool">
              <LockRing />
              <h3>Locker</h3>
              <span className="tag">Extend anytime · never shorten</span>
              <p>Lock LP and tokens until a date you set. Every lock gets a public page with a live countdown.</p>
              <Link href="/lock" className="link-accent">
                Open Locker ↗
              </Link>
            </div>
            <div className="tool">
              <VestBars />
              <h3>Vesting</h3>
              <span className="tag">Cliff · linear · monthly</span>
              <p>Release team and investor tokens on a schedule anyone can follow, claim by claim.</p>
              <Link href="/vest" className="link-accent">
                Open Vesting ↗
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container section split">
        <div>
          <span className="eyebrow">03 · Explore</span>
          <h2 className="section-title" style={{ fontSize: "clamp(40px, 5vw, 56px)" }}>
            Check a token
            <br />
            before you buy
          </h2>
          <p className="lead" style={{ marginBottom: 32 }}>
            Paste a contract address and see every lock and schedule behind it, on one page.
          </p>
          <ul className="dot-list">
            <li>
              <span className="dot" style={{ background: "#6FCFAE" }} />
              <div>
                <div className="t">LP locked</div>
                <div className="s">How much of the pool, until when</div>
              </div>
            </li>
            <li>
              <span className="dot" style={{ background: "#8FA6E8" }} />
              <div>
                <div className="t">Team tokens</div>
                <div className="s">Vesting schedule, cliff included</div>
              </div>
            </li>
            <li>
              <span className="dot" style={{ background: "#E79CC2" }} />
              <div>
                <div className="t">Unlocks ahead</div>
                <div className="s">Everything that opens next</div>
              </div>
            </li>
            <li>
              <span className="dot" style={{ background: "#14171C" }} />
              <div>
                <div className="t">Lock owner</div>
                <div className="s" style={{ color: "#5D6573" }}>
                  Who can withdraw, and when
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div>
          <TokenGauge />
          <div className="center">
            <Link href="/locks" className="link-accent">
              Search a token ↗
            </Link>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 0, paddingBottom: 110 }}>
        <h2 className="section-title" style={{ fontSize: 48, paddingBottom: 28, borderBottom: "1px solid #E1E5EB", margin: 0 }}>
          From wallet to launch
        </h2>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.n}>
              <div className="eyebrow">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
              <Link href={s.href} className="link-accent">
                {s.cta} ↗
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="white-band" style={{ overflow: "hidden" }}>
        <div className="container" style={{ paddingTop: 64, paddingBottom: 40 }}>
          <span className="eyebrow">Elyport at a glance</span>
          <LiveStats />
        </div>
        <ActivityTicker />
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "110px 24px" }}>
        <h2 className="section-title center" style={{ fontSize: 52, marginBottom: 40 }}>
          FAQ
        </h2>
        <h3 style={{ margin: "0 0 10px", fontSize: 26, fontWeight: 500 }}>New to Elyport?</h3>
        <p className="lead" style={{ fontSize: 17, marginBottom: 20 }}>
          The short answers first: what Elyport does, what it costs, and how locks and refuels work. The docs cover every
          contract and limit.
        </p>
        <Link href="/docs" className="btn btn-silver" style={{ marginBottom: 40 }}>
          Read the docs
        </Link>
        <div className="faq">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cta-scene">
        <CtaScene />
        <div className="cta-copy">
          <h2>Step through the gate</h2>
          <p className="lead">Refuel, drop, lock, vest. On Elysium.</p>
          <Link href="/drop" className="btn btn-dark btn-lg">
            Launch app
          </Link>
        </div>
        <HomeFooter />
      </section>
    </>
  );
}
