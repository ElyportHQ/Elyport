"use client";

import { useCallback, useState } from "react";
import { useAccount, useConfig, useSwitchChain } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { useAppKit } from "@reown/appkit/react";
import type { Hash, TransactionReceipt } from "viem";

export type TxState = { status: "idle" | "pending" | "success" | "error"; message?: string; hash?: Hash };

/** Short, readable error text from wallet / contract errors. */
export function errorText(e: unknown): string {
  const err = e as { shortMessage?: string; details?: string; message?: string };
  const msg = err?.shortMessage || err?.details || err?.message || "Something went wrong.";
  if (/user (rejected|denied)/i.test(msg)) return "You rejected the request in your wallet.";
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

/**
 * Connects the wallet if needed, switches to `chainId`, runs `send` (which returns a tx hash)
 * and waits for the receipt.
 */
export function useChainTx(chainId: number) {
  const { isConnected, chainId: current } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { open } = useAppKit();
  const config = useConfig();
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(
    async (label: string, send: () => Promise<Hash>): Promise<TransactionReceipt | undefined> => {
      if (!isConnected) {
        await open();
        return undefined;
      }
      try {
        if (current !== chainId) await switchChainAsync({ chainId });
        setState({ status: "pending", message: `${label}: confirm in your wallet…` });
        const hash = await send();
        setState({ status: "pending", message: `${label}: waiting for confirmation…`, hash });
        const client = getPublicClient(config, { chainId });
        if (!client) throw new Error("No RPC client for this chain.");
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error(`${label} failed on-chain.`);
        setState({ status: "success", message: `${label}: done.`, hash });
        return receipt;
      } catch (e) {
        setState({ status: "error", message: errorText(e) });
        return undefined;
      }
    },
    [isConnected, current, chainId, switchChainAsync, open, config],
  );

  return { state, setState, run };
}
