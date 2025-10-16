"use client"

import { useState } from "react"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { CSVUpload, type RecipientData } from "@/components/csv-upload"
import { DistributionPreview } from "@/components/distribution-preview"
import { DistributionExecutor } from "@/components/distribution-executor"
import { Coins } from "lucide-react"

export default function Home() {
  const [recipients, setRecipients] = useState<RecipientData[]>([])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Coins className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-balance">Token Distributor</h1>
              <p className="text-xs text-muted-foreground">Batch token distribution made simple</p>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold text-balance">Distribute Tokens to Multiple Wallets</h2>
            <p className="text-muted-foreground text-pretty">
              Upload a CSV file or paste data with wallet addresses and amounts to distribute tokens efficiently
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
  )
}
