/** Client-side mirror of ElyportVesting.vestedAmount, for previews and "next release" hints. */
export type Sched = {
  total: bigint;
  released: bigint;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  period: bigint;
  revoked: boolean;
};

export function vestedAt(s: Sched, ts: number): bigint {
  if (s.revoked) return s.total;
  const t = BigInt(Math.floor(ts));
  if (t < s.start + s.cliff) return 0n;
  let elapsed = t - s.start;
  if (elapsed >= s.duration) return s.total;
  elapsed = (elapsed / s.period) * s.period;
  return (s.total * elapsed) / s.duration;
}

export type NextRelease =
  | { kind: "date"; ts: number; amount: bigint; reason: "cliff" | "step" }
  | { kind: "streaming"; perDay: bigint }
  | { kind: "done" };

/** When the next tokens become claimable, and how many. */
export function nextRelease(s: Sched, now = Date.now() / 1000): NextRelease {
  if (s.revoked || s.released >= s.total) return { kind: "done" };
  const end = Number(s.start + s.duration);
  if (now >= end) return { kind: "done" };
  const cliffEnd = Number(s.start + s.cliff);
  if (now < cliffEnd) return { kind: "date", ts: cliffEnd, amount: vestedAt(s, cliffEnd), reason: "cliff" };
  if (s.period <= 1n) return { kind: "streaming", perDay: (s.total * 86_400n) / s.duration };
  const period = Number(s.period);
  const k = Math.floor((now - Number(s.start)) / period) + 1;
  const ts = Math.min(Number(s.start) + k * period, end);
  return { kind: "date", ts, amount: vestedAt(s, ts) - vestedAt(s, now), reason: "step" };
}
