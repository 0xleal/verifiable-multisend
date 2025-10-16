import { http, createConfig } from "wagmi"
import { mainnet, sepolia, base, baseSepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"

export const config = createConfig({
  chains: [mainnet, sepolia, base, baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})
