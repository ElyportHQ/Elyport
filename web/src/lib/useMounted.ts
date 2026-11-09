"use client";

import { useEffect, useState } from "react";

/** True after the first client render. Use it for text that depends on the current time or timezone. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
