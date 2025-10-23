"use client";

import type React from "react";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi-config";
import { useState } from "react";
import { AirdropSyncHandler } from "./airdrop-sync-handler";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AirdropSyncHandler />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
