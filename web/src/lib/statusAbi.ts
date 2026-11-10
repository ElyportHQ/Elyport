/** Small read-only ABI covering every public getter the status page and monitor read. */
const v = (name: string, out = "uint256") => ({ type: "function", name, stateMutability: "view", inputs: [], outputs: [{ type: out }] }) as const;
const v1 = (name: string, inType: string, out = "uint256") =>
  ({ type: "function", name, stateMutability: "view", inputs: [{ type: inType }], outputs: [{ type: out }] }) as const;

export const statusAbi = [
  v("owner", "address"),
  v("feeRecipient", "address"),
  v("discountBps", "uint16"),
  v("lockFee"),
  v("MAX_LOCK_FEE"),
  v("lockCount"),
  v("vestingFee"),
  v("MAX_VESTING_FEE"),
  v("scheduleCount"),
  v("dropFee"),
  v("MAX_DROP_FEE"),
  v("NATIVE_SEND_GAS"),
  v("maxPerTx"),
  v("maxPerWalletPerDay"),
  v("maxPerDay"),
  v("CEILING_PER_TX"),
  v("CEILING_PER_WALLET_PER_DAY"),
  v("CEILING_PER_DAY"),
  v("paused", "bool"),
  v("depositCount"),
  v("REFUND_DELAY"),
  v("locker", "address"),
  { type: "function", name: "factories", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  v1("isRelayer", "address", "bool"),
  v1("reserved", "address"),
  v1("processed", "bytes32", "bool"),
] as const;
