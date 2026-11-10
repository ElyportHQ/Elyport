import { ImageResponse } from "next/og";
import { erc20Abi, isAddress, type Address } from "viem";
import { contracts } from "./config";
import { lockerAbi, vestingAbi } from "./abis";
import { amountText, dateText, elysiumClient, ogCard, OG_SIZE, shortAddr } from "./og";
import { LOGO_DATA_URL } from "./logoData";
import { Ring, Stat } from "./lockOg";
import { verifyPairs } from "./verifyPairs";
import { getMontraLaunch } from "./montra";

type LockT = { token: Address; owner: Address; amount: bigint; unlockAt: bigint; createdAt: bigint; isLP: boolean; withdrawn: boolean };
type SchedT = { token: Address; total: bigint; released: bigint; revoked: boolean };

const pctOf = (v: bigint, supply?: bigint) => (supply && supply > 0n ? Math.min(100, Number((v * 10_000n) / supply) / 100) : undefined);
const pctText = (p: number) => (p > 0 && p < 0.01 ? "<0.01%" : `${p.toFixed(2)}%`);

/** Share card for a token page: what is locked, what unlocks next, and where the liquidity sits. */
export async function tokenImage(address: string) {
  if (!isAddress(address)) return ogCard({ eyebrow: "Explore", title: "Token safety", big: "Check before you buy" });
  const token = address as Address;
  try {
    const c = elysiumClient();
    const [meta, lockIds, schedIds, montra] = await Promise.all([
      c.multicall({
        contracts: [
          { address: token, abi: erc20Abi, functionName: "symbol" },
          { address: token, abi: erc20Abi, functionName: "name" },
          { address: token, abi: erc20Abi, functionName: "decimals" },
          { address: token, abi: erc20Abi, functionName: "totalSupply" },
        ],
        allowFailure: true,
      }),
      contracts.locker
        ? c.readContract({ address: contracts.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] }).catch(() => [] as readonly bigint[])
        : Promise.resolve([] as readonly bigint[]),
      contracts.vesting
        ? c.readContract({ address: contracts.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token] }).catch(() => [] as readonly bigint[])
        : Promise.resolve([] as readonly bigint[]),
      getMontraLaunch(token).catch(() => null),
    ]);
    const symbol = String((meta[0]?.result as string | undefined) ?? "TOKEN").slice(0, 14);
    const name = (meta[1]?.result as string | undefined)?.slice(0, 40);
    const decimals = Number((meta[2]?.result as number | undefined) ?? 18);
    const supply = meta[3]?.result as bigint | undefined;

    const [lockRes, schedRes] = await Promise.all([
      lockIds.length && contracts.locker
        ? c.multicall({
            contracts: lockIds.slice(0, 200).map((id) => ({ address: contracts.locker!, abi: lockerAbi, functionName: "getLock" as const, args: [id] as const })),
            allowFailure: true,
          })
        : Promise.resolve([]),
      schedIds.length && contracts.vesting
        ? c.multicall({
            contracts: schedIds.slice(0, 200).map((id) => ({ address: contracts.vesting!, abi: vestingAbi, functionName: "getSchedule" as const, args: [id] as const })),
            allowFailure: true,
          })
        : Promise.resolve([]),
    ]);

    const now = Math.floor(Date.now() / 1000);
    const active = lockRes.map((r) => r?.result as LockT | undefined).filter((l): l is LockT => !!l && !l.withdrawn && Number(l.unlockAt) > now);
    const own = active.filter((l) => l.token.toLowerCase() === token.toLowerCase());
    const lp = active.filter((l) => l.token.toLowerCase() !== token.toLowerCase() && l.isLP);
    const locked = own.reduce((a, l) => a + l.amount, 0n);
    const lockedPct = pctOf(locked, supply);
    const next = [...own].sort((a, b) => Number(a.unlockAt - b.unlockAt))[0];

    const vesting = schedRes
      .map((r) => r?.result as SchedT | undefined)
      .filter((s): s is SchedT => !!s && !s.revoked)
      .reduce((a, s) => a + (s.total - s.released), 0n);
    const vestingPct = pctOf(vesting, supply);

    // Liquidity: a verified LP lock wins; a Montra launch is sealed by design.
    let liquidity: { value: string; label: string } = { value: "None", label: "LP locked here" };
    if (lp.length) {
      const pairs = Array.from(new Set(lp.map((l) => l.token.toLowerCase()))) as Address[];
      const [checks, sups] = await Promise.all([
        verifyPairs(c, pairs).catch(() => new Map()),
        c.multicall({ contracts: pairs.map((p) => ({ address: p, abi: erc20Abi, functionName: "totalSupply" as const })), allowFailure: true }),
      ]);
      let best: number | undefined;
      pairs.forEach((p, i) => {
        if (!checks.get(p)?.verified) return;
        const amt = lp.filter((l) => l.token.toLowerCase() === p).reduce((a, l) => a + l.amount, 0n);
        const s = pctOf(amt, sups[i]?.result as bigint | undefined);
        if (s !== undefined && (best === undefined || s > best)) best = s;
      });
      if (best !== undefined) liquidity = { value: pctText(best), label: "of LP locked" };
    }
    if (liquidity.value === "None" && montra) liquidity = { value: "Sealed", label: "liquidity (Montra)" };

    const stats: { value: string; label: string }[] = [];
    if (locked > 0n) stats.push({ value: amountText(locked, decimals), label: `locked · ${own.length} ${own.length === 1 ? "lock" : "locks"}` });
    if (next) stats.push({ value: dateText(next.unlockAt).replace(/, \d{4}$/, ""), label: `next unlock · ${new Date(Number(next.unlockAt) * 1000).getUTCFullYear()}` });
    stats.push(liquidity);
    if (vesting > 0n && vestingPct !== undefined) stats.push({ value: pctText(vestingPct), label: "still vesting" });

    const anything = locked > 0n || liquidity.value !== "None" || vesting > 0n;
    const ahead = next ? (Number(next.unlockAt) - now) / Math.max(1, Number(next.unlockAt - next.createdAt)) : 0;
    const headline =
      lockedPct !== undefined && locked > 0n
        ? `${pctText(lockedPct)} of supply locked`
        : vesting > 0n
          ? "Team tokens on a vesting schedule"
          : liquidity.value !== "None"
            ? "Liquidity can't be pulled"
            : "No locks on Elyport yet";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "52px 68px 48px",
            background: "linear-gradient(160deg, #EEF0FA 0%, #F7F3F8 45%, #FFF6EC 78%, #EEF7F3 100%)",
            color: "#14171C",
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: "linear-gradient(90deg, #F7C8E0, #BFD7FF, #C6F5E6)" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_DATA_URL} width={56} height={56} style={{ borderRadius: 9999 }} alt="" />
              <div style={{ fontSize: 32, letterSpacing: -1 }}>Elyport</div>
              <div style={{ marginLeft: 10, fontSize: 20, color: "#5D6573", letterSpacing: 2 }}>TOKEN CHECK</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 999,
                background: "#FFFFFF",
                border: `2px solid ${anything ? "#CDEEDF" : "#E1E5EB"}`,
                color: anything ? "#1D7A5B" : "#5D6573",
                fontSize: 22,
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 999, background: anything ? "#2BB582" : "#9AA3B2" }} />
              Verified on-chain
            </div>
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 740 }}>
              {name && <div style={{ fontSize: 28, color: "#5D6573" }}>{name}</div>}
              <div style={{ fontSize: symbol.length > 9 ? 88 : 108, letterSpacing: -4, lineHeight: 1.02 }}>{`$${symbol}`}</div>
              <div style={{ fontSize: 44, color: "#3C46A8", letterSpacing: -1, marginTop: 4 }}>{headline}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
                {stats.slice(0, 3).map((s) => (
                  <Stat key={s.label} value={s.value} label={s.label} />
                ))}
              </div>
            </div>
            <Ring ahead={ahead} open={!next} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 22, color: "#5D6573" }}>
            <div style={{ display: "flex" }}>{`elyport.com/token/${shortAddr(token)}`}</div>
            <div style={{ display: "flex" }}>Check before you buy</div>
          </div>
        </div>
      ),
      OG_SIZE,
    );
  } catch {
    return ogCard({ eyebrow: "Token check", title: shortAddr(token), big: "Check before you buy" });
  }
}
