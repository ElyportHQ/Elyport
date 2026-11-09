"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import {
  arbitrum,
  base,
  bsc,
  mainnet,
  defineChain as defineAppKitChain,
  type AppKitNetwork,
} from "@reown/appkit/networks";
import { elysium, hyperEvm, reownProjectId, siteUrl } from "@/lib/config";

// A placeholder keeps builds working before the Reown project ID is set; wallet
// connections need the real ID from dashboard.reown.com.
const projectId = reownProjectId || "00000000000000000000000000000000";

const toAppKit = (chain: typeof elysium | typeof hyperEvm) =>
  defineAppKitChain({
    ...chain,
    caipNetworkId: `eip155:${chain.id}` as `eip155:${number}`,
    chainNamespace: "eip155",
  });

export const elysiumNetwork = toAppKit(elysium);
const hyperEvmNetwork = toAppKit(hyperEvm);

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [elysiumNetwork, base, arbitrum, mainnet, bsc, hyperEvmNetwork];

export const wagmiAdapter = new WagmiAdapter({ networks, projectId, ssr: true });

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  defaultNetwork: elysiumNetwork,
  projectId,
  metadata: {
    name: "Elyport",
    description: "The port into Elysium",
    url: siteUrl,
    icons: [`${siteUrl}/logo.png`],
  },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#1B1F26",
    "--w3m-border-radius-master": "3px",
  },
  features: { analytics: false, email: false, socials: false },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
