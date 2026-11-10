"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { contracts, elysium } from "./config";
import { dropAbi, lockerAbi, vestingAbi } from "./abis";

const cid = elysium.id;
const ZERO = "0x0000000000000000000000000000000000000000";

export type ToolFee = {
  /** The fee this wallet pays (after any holder discount); base fee when not connected */
  fee?: bigint;
  base?: bigint;
  discounted: boolean;
};

function result(base?: bigint, mine?: bigint): ToolFee {
  const fee = mine ?? base;
  return { fee, base, discounted: base !== undefined && mine !== undefined && mine < base };
}

export function useLockFee(): ToolFee {
  const { address } = useAccount();
  const base = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockFee", query: { enabled: !!contracts.locker } });
  const mine = useReadContract({ chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "lockFeeFor", args: address ? [address] : undefined, query: { enabled: !!contracts.locker && !!address, retry: false } });
  return result(base.data, mine.data);
}

export function useVestFee(): ToolFee {
  const { address } = useAccount();
  const base = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "vestingFee", query: { enabled: !!contracts.vesting } });
  const mine = useReadContract({ chainId: cid, address: contracts.vesting, abi: vestingAbi, functionName: "vestingFeeFor", args: address ? [address] : undefined, query: { enabled: !!contracts.vesting && !!address, retry: false } });
  return result(base.data, mine.data);
}

export function useDropFee(): ToolFee {
  const { address } = useAccount();
  const base = useReadContract({ chainId: cid, address: contracts.drop, abi: dropAbi, functionName: "dropFee", query: { enabled: !!contracts.drop } });
  const mine = useReadContract({ chainId: cid, address: contracts.drop, abi: dropAbi, functionName: "dropFeeFor", args: address ? [address] : undefined, query: { enabled: !!contracts.drop && !!address, retry: false } });
  return result(base.data, mine.data);
}

/** The holder discount, if the owner has switched one on (read from the Locker). */
export function useHolderDiscount() {
  const d = useReadContracts({
    contracts: contracts.locker
      ? [
          { chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "discountToken" },
          { chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "discountMinBalance" },
          { chainId: cid, address: contracts.locker, abi: lockerAbi, functionName: "discountBps" },
        ]
      : [],
    query: { enabled: !!contracts.locker, retry: false },
  });
  const token = d.data?.[0]?.result as Address | undefined;
  const minBalance = d.data?.[1]?.result as bigint | undefined;
  const bps = d.data?.[2]?.result as number | undefined;
  const active = !!token && token !== ZERO && !!bps;
  const meta = useReadContracts({
    contracts: active ? [
      { chainId: cid, address: token!, abi: erc20Abi, functionName: "symbol" },
      { chainId: cid, address: token!, abi: erc20Abi, functionName: "decimals" },
    ] : [],
    query: { enabled: active },
  });
  return {
    active,
    token,
    minBalance,
    bps,
    symbol: meta.data?.[0]?.result as string | undefined,
    decimals: (meta.data?.[1]?.result as number | undefined) ?? 18,
  };
}
