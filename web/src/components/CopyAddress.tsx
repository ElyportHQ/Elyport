"use client";

import { useState } from "react";

export function CopyAddress({ address }: { address: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="official-ca mono"
      onClick={() => {
        navigator.clipboard?.writeText(address).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      aria-label="Copy contract address"
    >
      <span>{address}</span>
      <strong>{done ? "Copied" : "Copy"}</strong>
    </button>
  );
}
