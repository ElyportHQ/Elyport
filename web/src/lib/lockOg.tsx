import { ImageResponse } from "next/og";
import { erc20Abi } from "viem";
import { contracts } from "./config";
import { lockerAbi } from "./abis";
import { amountText, dateText, elysiumClient, ogCard, OG_SIZE } from "./og";
import { LOGO_DATA_URL } from "./logoData";

const DAY = 86_400;

function leftText(unlockAt: number, now: number) {
  const d = Math.floor((unlockAt - now) / DAY);
  if (d >= 730) return `${Math.floor(d / 365)} years left`;
  if (d >= 90) return `${Math.round(d / 30)} months left`;
  if (d >= 2) return `${d} days left`;
  if (d === 1) return "1 day left";
  return "less than a day left";
}

/** Ring with a padlock inside. The arc is the share of lock time still ahead (0..1). */
export function Ring({ ahead, open }: { ahead: number; open: boolean }) {
  const r = 128;
  const c = 2 * Math.PI * r;
  const shown = open ? 0 : Math.max(0.03, Math.min(1, ahead));
  return (
    <div
      style={{
        position: "relative",
        width: 320,
        height: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="320"
        height="320"
        viewBox="0 0 320 320"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7FE0C1" />
            <stop offset="55%" stopColor="#8FA6E8" />
            <stop offset="100%" stopColor="#E79CC2" />
          </linearGradient>
        </defs>
        <circle
          cx="160"
          cy="160"
          r={r}
          fill="#FFFFFF"
          stroke="#E3E7EC"
          strokeWidth="20"
        />
        {shown > 0 && (
          <circle
            cx="160"
            cy="160"
            r={r}
            fill="none"
            stroke="url(#g)"
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${c * shown} ${c}`}
            transform="rotate(-90 160 160)"
          />
        )}
      </svg>
      {/* padlock */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 6,
        }}
      >
        <div
          style={{
            width: 70,
            height: 58,
            border: "16px solid #14171C",
            borderBottom: "0px solid #14171C",
            borderRadius: "40px 40px 0 0",
            marginBottom: -4,
            marginLeft: open ? 46 : 0,
          }}
        />
        <div
          style={{
            width: 112,
            height: 86,
            borderRadius: 20,
            background: "#14171C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#FFFFFF",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "14px 22px",
        borderRadius: 18,
        background: "#FFFFFF",
        border: "2px solid #E1E5EB",
      }}
    >
      <div style={{ fontSize: 36, color: "#14171C", letterSpacing: -1 }}>
        {value}
      </div>
      <div style={{ fontSize: 20, color: "#5D6573" }}>{label}</div>
    </div>
  );
}

/** Share card for a lock page: the X preview a project gets when it shares its lock. */
export async function lockImage(id: string) {
  const fallback = () =>
    ogCard({
      eyebrow: "Locker",
      title: `Lock #${id}`,
      big: "Locked on Elysium",
      lines: ["Public and verifiable by anyone."],
    });
  if (!contracts.locker || !/^\d{1,18}$/.test(id)) return fallback();
  try {
    const c = elysiumClient();
    const l = await c.readContract({
      address: contracts.locker,
      abi: lockerAbi,
      functionName: "getLock",
      args: [BigInt(id)],
    });
    const r = await c.multicall({
      contracts: [
        { address: l.token, abi: erc20Abi, functionName: "symbol" },
        { address: l.token, abi: erc20Abi, functionName: "name" },
        { address: l.token, abi: erc20Abi, functionName: "decimals" },
        { address: l.token, abi: erc20Abi, functionName: "totalSupply" },
      ],
      allowFailure: true,
    });
    const symbol = String(
      (r[0]?.result as string | undefined) ?? "TOKEN",
    ).slice(0, 14);
    const name = (r[1]?.result as string | undefined)?.slice(0, 40);
    const decimals = Number((r[2]?.result as number | undefined) ?? 18);
    const supply = r[3]?.result as bigint | undefined;

    const now = Math.floor(Date.now() / 1000);
    const unlockAt = Number(l.unlockAt);
    const total = unlockAt - Number(l.createdAt);
    const ahead = total > 0 ? (unlockAt - now) / total : 0;
    const status = l.withdrawn
      ? "Withdrawn"
      : unlockAt <= now
        ? "Unlocked"
        : "Locked";
    const locked = status === "Locked";
    const pct =
      supply && supply > 0n
        ? Number((l.amount * 10_000n) / supply) / 100
        : undefined;
    const ticker = `$${symbol}${l.isLP ? " LP" : ""}`;

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "52px 68px 48px",
          background:
            "linear-gradient(160deg, #EEF0FA 0%, #F7F3F8 45%, #FFF6EC 78%, #EEF7F3 100%)",
          color: "#14171C",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 10,
            background: "linear-gradient(90deg, #F7C8E0, #BFD7FF, #C6F5E6)",
          }}
        />

        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_DATA_URL}
              width={56}
              height={56}
              style={{ borderRadius: 9999 }}
              alt=""
            />
            <div style={{ fontSize: 32, letterSpacing: -1 }}>Elyport</div>
            <div
              style={{
                marginLeft: 10,
                fontSize: 20,
                color: "#5D6573",
                letterSpacing: 2,
              }}
            >{`LOCK #${id}`}</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              borderRadius: 999,
              background: "#FFFFFF",
              border: `2px solid ${locked ? "#CDEEDF" : "#E1E5EB"}`,
              color: locked ? "#1D7A5B" : "#5D6573",
              fontSize: 22,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: locked ? "#2BB582" : "#9AA3B2",
              }}
            />
            {locked ? "Verified on-chain" : status}
          </div>
        </div>

        {/* body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}
          >
            {name && (
              <div style={{ fontSize: 28, color: "#5D6573" }}>{name}</div>
            )}
            <div
              style={{
                fontSize: ticker.length > 10 ? 88 : 108,
                letterSpacing: -4,
                lineHeight: 1.02,
              }}
            >
              {ticker}
            </div>
            <div
              style={{
                fontSize: 44,
                color: "#3C46A8",
                letterSpacing: -1,
                marginTop: 4,
              }}
            >
              {locked
                ? `locked until ${dateText(l.unlockAt)}`
                : `${status.toLowerCase()} ${dateText(l.unlockAt)}`}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
              <Stat
                value={amountText(l.amount, decimals)}
                label="tokens locked"
              />
              {pct !== undefined && (
                <Stat
                  value={`${pct < 0.01 ? "<0.01" : pct.toFixed(2)}%`}
                  label="of supply"
                />
              )}
              {locked && (
                <Stat
                  value={leftText(unlockAt, now).split(" left")[0]}
                  label="left"
                />
              )}
            </div>
          </div>
          <Ring ahead={ahead} open={!locked} />
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#5D6573",
          }}
        >
          <div style={{ display: "flex" }}>{`elyport.com/lock/${id}`}</div>
          <div style={{ display: "flex" }}>
            Can be extended, never shortened
          </div>
        </div>
      </div>,
      OG_SIZE,
    );
  } catch {
    return fallback();
  }
}
