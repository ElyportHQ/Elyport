import {
  createPublicClient,
  erc20Abi,
  http,
  parseEventLogs,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { dropAbi, lockerAbi, lpCheckAbi, vestingAbi } from "./abis.js";
import { ELYPORT_ADDRESSES, MONTH, type ElyportAddresses } from "./addresses.js";
import { elysium } from "./chain.js";

export type Lock = {
  token: Address;
  owner: Address;
  amount: bigint;
  unlockAt: bigint;
  createdAt: bigint;
  isLP: boolean;
  withdrawn: boolean;
};

export type Schedule = {
  token: Address;
  creator: Address;
  beneficiary: Address;
  total: bigint;
  released: bigint;
  start: bigint;
  cliff: bigint;
  duration: bigint;
  period: bigint;
  revocable: boolean;
  revoked: boolean;
};

export type Recipient = { address: Address; amount: bigint };
/** Unix seconds or a Date. */
export type Time = number | bigint | Date;
export type PairCheck = { verified: boolean; dex: string; factory?: Address };

export type CreateLockParams = { token: Address; amount: bigint; unlockAt: Time; owner?: Address; isLP?: boolean; note?: string };
export type CreateTranchesParams = { token: Address; tranches: { amount: bigint; unlockAt: Time }[]; owner?: Address; isLP?: boolean; note?: string };
export type CreateVestingParams = {
  token: Address;
  recipients: Recipient[];
  start: Time;
  /** Seconds after start before anything unlocks. */
  cliff: number | bigint;
  /** Total length in seconds. */
  duration: number | bigint;
  /** "linear" releases every second, "monthly" in 30-day steps. Default "linear". */
  release?: "linear" | "monthly";
  cancellable?: boolean;
};

export interface Elyport {
  chain: Chain;
  addresses: ElyportAddresses;
  publicClient: PublicClient;
  fees: {
    lock(user?: Address): Promise<bigint>;
    vesting(user?: Address): Promise<bigint>;
    drop(user?: Address): Promise<bigint>;
  };
  locks: {
    count(): Promise<bigint>;
    get(id: bigint): Promise<Lock>;
    idsByToken(token: Address): Promise<readonly bigint[]>;
    idsByOwner(owner: Address): Promise<readonly bigint[]>;
    create(p: CreateLockParams): Promise<Hash>;
    createTranches(p: CreateTranchesParams): Promise<Hash>;
    extend(id: bigint, unlockAt: Time): Promise<Hash>;
    topUp(id: bigint, amount: bigint): Promise<Hash>;
    transfer(id: bigint, newOwner: Address): Promise<Hash>;
    withdraw(id: bigint): Promise<Hash>;
    idsFromReceipt(receipt: TransactionReceipt): bigint[];
  };
  vesting: {
    count(): Promise<bigint>;
    get(id: bigint): Promise<Schedule>;
    claimable(id: bigint): Promise<bigint>;
    vestedAt(id: bigint, at: Time): Promise<bigint>;
    idsByToken(token: Address): Promise<readonly bigint[]>;
    idsByRecipient(wallet: Address): Promise<readonly bigint[]>;
    idsByCreator(wallet: Address): Promise<readonly bigint[]>;
    create(p: CreateVestingParams): Promise<Hash>;
    claim(id: bigint): Promise<Hash>;
    cancel(id: bigint): Promise<Hash>;
    transfer(id: bigint, newRecipient: Address): Promise<Hash>;
    idsFromReceipt(receipt: TransactionReceipt): bigint[];
  };
  lp: {
    /** Is this pair from a known DEX factory that confirms it? */
    checkPair(pair: Address): Promise<PairCheck>;
    /** Same check for an existing lock. `isLP` is false for plain token locks. */
    checkLock(id: bigint): Promise<PairCheck & { isLP: boolean; pair: Address }>;
  };
  drop: {
    native(recipients: Recipient[]): Promise<Hash>;
    token(token: Address, recipients: Recipient[]): Promise<Hash>;
  };
  /** Wait for a transaction and throw if it reverted. */
  wait(hash: Hash): Promise<TransactionReceipt>;
}

export type ElyportOptions = {
  /** Reads go through this client. Defaults to a public Elysium RPC client. */
  publicClient?: PublicClient;
  /** Needed for transactions. Its account signs and pays. */
  walletClient?: WalletClient;
  /** Override contract addresses (for example on a fork). */
  addresses?: Partial<ElyportAddresses>;
  /** Approve tokens automatically before locking, vesting or dropping. Default true. */
  autoApprove?: boolean;
};

const secs = (t: Time): bigint => (t instanceof Date ? BigInt(Math.floor(t.getTime() / 1000)) : BigInt(t));
const sum = (xs: readonly bigint[]) => xs.reduce((a, b) => a + b, 0n);

/**
 * Create an Elyport client.
 *
 * ```ts
 * const ely = createElyport({ walletClient });
 * const hash = await ely.locks.create({ token, amount: 1000n * 10n ** 18n, unlockAt: new Date("2027-01-01") });
 * const receipt = await ely.wait(hash);
 * ```
 */
export function createElyport(opts: ElyportOptions = {}): Elyport {
  const addresses: ElyportAddresses = { ...ELYPORT_ADDRESSES, ...opts.addresses };
  const pc: PublicClient = opts.publicClient ?? (createPublicClient({ chain: elysium, transport: http() }) as PublicClient);
  const autoApprove = opts.autoApprove ?? true;

  const signer = (): { wc: WalletClient; account: Account } => {
    const wc = opts.walletClient;
    if (!wc) throw new Error("Elyport: pass a walletClient to send transactions.");
    const account = wc.account;
    if (!account) throw new Error("Elyport: the walletClient has no account.");
    return { wc, account };
  };

  async function ensureAllowance(token: Address, spender: Address, amount: bigint) {
    if (!autoApprove) return;
    const { wc, account } = signer();
    const current = await pc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [account.address, spender] });
    if (current >= amount) return;
    const hash = await wc.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, amount], account, chain: elysium });
    const r = await pc.waitForTransactionReceipt({ hash });
    if (r.status !== "success") throw new Error("Elyport: approve failed.");
  }

  const feeUser = (user?: Address) => user ?? opts.walletClient?.account?.address ?? "0x0000000000000000000000000000000000000000";

  const fees = {
    /** Lock fee in wei for a wallet (holder discount applied). */
    lock: (user?: Address) => pc.readContract({ address: addresses.locker, abi: lockerAbi, functionName: "lockFeeFor", args: [feeUser(user)] }),
    /** Vesting fee per create transaction in wei. */
    vesting: (user?: Address) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "vestingFeeFor", args: [feeUser(user)] }),
    /** Gas Drop fee per transaction in wei. */
    drop: (user?: Address) => pc.readContract({ address: addresses.drop, abi: dropAbi, functionName: "dropFeeFor", args: [feeUser(user)] }),
  };

  const getLock = async (id: bigint) => (await pc.readContract({ address: addresses.locker, abi: lockerAbi, functionName: "getLock", args: [id] })) as Lock;

  const locks = {
    count: () => pc.readContract({ address: addresses.locker, abi: lockerAbi, functionName: "lockCount" }),
    get: getLock,
    idsByToken: (token: Address) => pc.readContract({ address: addresses.locker, abi: lockerAbi, functionName: "lockIdsByToken", args: [token] }),
    idsByOwner: (owner: Address) => pc.readContract({ address: addresses.locker, abi: lockerAbi, functionName: "lockIdsByOwner", args: [owner] }),

    /** Lock tokens until one date. Approves first when needed. */
    async create(p: CreateLockParams): Promise<Hash> {
      const { wc, account } = signer();
      await ensureAllowance(p.token, addresses.locker, p.amount);
      const value = await fees.lock(account.address);
      return wc.writeContract({
        address: addresses.locker,
        abi: lockerAbi,
        functionName: "createLock",
        args: [p.token, p.amount, secs(p.unlockAt), p.owner ?? account.address, p.isLP ?? false, p.note ?? ""],
        value,
        account,
        chain: elysium,
      });
    },

    /** Lock one token in up to 20 tranches with their own unlock dates, in one transaction. */
    async createTranches(p: CreateTranchesParams): Promise<Hash> {
      const { wc, account } = signer();
      const amounts = p.tranches.map((t) => t.amount);
      await ensureAllowance(p.token, addresses.locker, sum(amounts));
      const value = (await fees.lock(account.address)) * BigInt(p.tranches.length);
      return wc.writeContract({
        address: addresses.locker,
        abi: lockerAbi,
        functionName: "createLocks",
        args: [p.token, amounts, p.tranches.map((t) => secs(t.unlockAt)), p.owner ?? account.address, p.isLP ?? false, p.note ?? ""],
        value,
        account,
        chain: elysium,
      });
    },

    /** Move the unlock date later. It can never move earlier. */
    extend(id: bigint, unlockAt: Time): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.locker, abi: lockerAbi, functionName: "extendLock", args: [id, secs(unlockAt)], account, chain: elysium });
    },

    /** Add tokens to an existing lock. */
    async topUp(id: bigint, amount: bigint): Promise<Hash> {
      const { wc, account } = signer();
      const l = await getLock(id);
      await ensureAllowance(l.token, addresses.locker, amount);
      return wc.writeContract({ address: addresses.locker, abi: lockerAbi, functionName: "topUp", args: [id, amount], account, chain: elysium });
    },

    /** Hand the lock to another wallet. */
    transfer(id: bigint, newOwner: Address): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.locker, abi: lockerAbi, functionName: "transferLockOwnership", args: [id, newOwner], account, chain: elysium });
    },

    /** Withdraw everything after the unlock date. */
    withdraw(id: bigint): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.locker, abi: lockerAbi, functionName: "withdraw", args: [id], account, chain: elysium });
    },

    /** Lock ids created in a transaction. */
    idsFromReceipt: (receipt: TransactionReceipt) => parseEventLogs({ abi: lockerAbi, eventName: "LockCreated", logs: receipt.logs }).map((l) => l.args.id),
  };

  const vesting = {
    count: () => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "scheduleCount" }),
    get: async (id: bigint) => (await pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "getSchedule", args: [id] })) as Schedule,
    claimable: (id: bigint) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "claimable", args: [id] }),
    vestedAt: (id: bigint, at: Time) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "vestedAmount", args: [id, secs(at)] }),
    idsByToken: (token: Address) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "scheduleIdsByToken", args: [token] }),
    idsByRecipient: (wallet: Address) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "scheduleIdsByBeneficiary", args: [wallet] }),
    idsByCreator: (wallet: Address) => pc.readContract({ address: addresses.vesting, abi: vestingAbi, functionName: "scheduleIdsByCreator", args: [wallet] }),

    /**
     * Create schedules for up to 100 recipients in one transaction.
     * `cliff` and `duration` are in seconds; `release` is "linear" (every second) or "monthly" (30-day steps).
     */
    async create(p: CreateVestingParams): Promise<Hash> {
      const { wc, account } = signer();
      const amounts = p.recipients.map((r) => r.amount);
      await ensureAllowance(p.token, addresses.vesting, sum(amounts));
      const value = await fees.vesting(account.address);
      return wc.writeContract({
        address: addresses.vesting,
        abi: vestingAbi,
        functionName: "createSchedules",
        args: [
          p.token,
          p.recipients.map((r) => r.address),
          amounts,
          secs(p.start),
          BigInt(p.cliff),
          BigInt(p.duration),
          p.release === "monthly" ? BigInt(MONTH) : 1n,
          p.cancellable ?? false,
        ],
        value,
        account,
        chain: elysium,
      });
    },

    /** Claim vested tokens. Anyone can call it; tokens always go to the recipient. */
    claim(id: bigint): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.vesting, abi: vestingAbi, functionName: "claim", args: [id], account, chain: elysium });
    },

    /** Creator only, cancellable schedules only. Vested tokens stay with the recipient. */
    cancel(id: bigint): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.vesting, abi: vestingAbi, functionName: "revoke", args: [id], account, chain: elysium });
    },

    /** Recipient only: move the schedule to a new wallet. */
    transfer(id: bigint, newRecipient: Address): Promise<Hash> {
      const { wc, account } = signer();
      return wc.writeContract({ address: addresses.vesting, abi: vestingAbi, functionName: "transferBeneficiary", args: [id, newRecipient], account, chain: elysium });
    },

    /** Schedule ids created in a transaction. */
    idsFromReceipt: (receipt: TransactionReceipt) => parseEventLogs({ abi: vestingAbi, eventName: "ScheduleCreated", logs: receipt.logs }).map((l) => l.args.id),
  };

  const drop = {
    /** Send HYPE to up to 500 wallets. */
    async native(recipients: Recipient[]): Promise<Hash> {
      const { wc, account } = signer();
      const amounts = recipients.map((r) => r.amount);
      const fee = await fees.drop(account.address);
      return wc.writeContract({
        address: addresses.drop,
        abi: dropAbi,
        functionName: "dropNative",
        args: [recipients.map((r) => r.address), amounts],
        value: sum(amounts) + fee,
        account,
        chain: elysium,
      });
    },

    /** Send an ERC-20 to up to 500 wallets. Approves first when needed. */
    async token(token: Address, recipients: Recipient[]): Promise<Hash> {
      const { wc, account } = signer();
      const amounts = recipients.map((r) => r.amount);
      await ensureAllowance(token, addresses.drop, sum(amounts));
      const fee = await fees.drop(account.address);
      return wc.writeContract({
        address: addresses.drop,
        abi: dropAbi,
        functionName: "dropToken",
        args: [token, recipients.map((r) => r.address), amounts],
        value: fee,
        account,
        chain: elysium,
      });
    },
  };

  const lp = {
    async checkPair(pair: Address): Promise<PairCheck> {
      const [verified, dex, factory] = await pc.readContract({ address: addresses.lpCheck, abi: lpCheckAbi, functionName: "checkPair", args: [pair] });
      return { verified, dex, factory };
    },
    async checkLock(id: bigint) {
      const [isLP, verified, dex, pair] = await pc.readContract({ address: addresses.lpCheck, abi: lpCheckAbi, functionName: "checkLock", args: [id] });
      return { isLP, verified, dex, pair };
    },
  };

  return {
    chain: elysium,
    addresses,
    publicClient: pc,
    fees,
    locks,
    vesting,
    lp,
    drop,
    /** Wait for a transaction and throw if it reverted. */
    async wait(hash: Hash) {
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error(`Elyport: transaction ${hash} reverted.`);
      return r;
    },
  };
}

