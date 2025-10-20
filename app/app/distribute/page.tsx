"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { CSVUpload, type RecipientData } from "@/components/csv-upload";
import { DistributionPreview } from "@/components/distribution-preview";
import { DistributionExecutor } from "@/components/distribution-executor";
import { Coins, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [recipients, setRecipients] = useState<RecipientData[]>([]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Coins className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-balance">
                HumanPay
              </h1>
              <p className="text-xs text-muted-foreground">
                Compliant cross-border payments
              </p>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-balance">
              Distribute Tokens
            </h2>
            <p className="text-muted-foreground text-pretty max-w-2xl mx-auto">
              Upload a CSV file or paste data with wallet addresses and amounts
              to distribute tokens efficiently. We integrate with Self.xyz to
              verify both sender and recipients are humans.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <CSVUpload onDataParsed={setRecipients} />
              <DistributionExecutor recipients={recipients} />
            </div>
            <DistributionPreview recipients={recipients} />
          </div>
        </div>
      </main>
    </div>
  );
}
