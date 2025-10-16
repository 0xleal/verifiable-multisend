"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const buttonContent = useMemo(() => {
    if (isConnected && address) {
      return (
        <>
          <Wallet className="h-4 w-4" />
          {address.slice(0, 6)}...{address.slice(-4)}
          <LogOut className="h-4 w-4 ml-2" />
        </>
      );
    }
    return (
      <>
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </>
    );
  }, [isConnected, address]);

  return (
    <Button
      onClick={() => {
        if (isConnected && address) {
          disconnect();
        } else {
          connect({ connector: connectors[0] });
        }
      }}
      className="gap-2"
    >
      {buttonContent}
    </Button>
  );
}
