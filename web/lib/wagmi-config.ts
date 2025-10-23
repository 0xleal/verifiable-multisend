import { http, createConfig } from "wagmi";
import { celoSepolia, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [celoSepolia, baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    }),
  ],
  transports: {
    [celoSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});