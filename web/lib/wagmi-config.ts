import { http, createConfig } from "wagmi";
import { celoSepolia, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WALLET_CONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!WALLET_CONNECT_ID) {
  throw new Error("Missing wallet connect ID");
}

export const config = createConfig({
  chains: [celoSepolia, baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLET_CONNECT_ID,
    }),
  ],
  transports: {
    [celoSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});
