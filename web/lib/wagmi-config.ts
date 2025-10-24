import { http, createConfig, fallback } from "wagmi";
import { celoSepolia, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WALLET_CONNECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!WALLET_CONNECT_ID) {
  throw new Error("Missing wallet connect ID");
}

// Configure RPC transports with fallback for reliability
// Base Sepolia: Use multiple RPC endpoints for better reliability
const baseSepoliaTransport = fallback([
  http("https://sepolia.base.org"),
  http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "demo"}`),
  http("https://base-sepolia-rpc.publicnode.com"),
]);

// Celo Sepolia: Use the default with fallback
const celoSepoliaTransport = fallback([
  http("https://alfajores-forno.celo-testnet.org"),
  http(),
]);

export const config = createConfig({
  chains: [celoSepolia, baseSepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLET_CONNECT_ID,
    }),
  ],
  transports: {
    [celoSepolia.id]: celoSepoliaTransport,
    [baseSepolia.id]: baseSepoliaTransport,
  },
});
