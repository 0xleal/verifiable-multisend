"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
  Users,
  Coins,
  Settings,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { RecipientData } from "@/components/csv-upload";
import type { DistributionConfig } from "./step3-configure";
import { useAccount, useWriteContract, useSwitchChain } from "wagmi";
import { parseEther } from "viem";
import { SelfVerifiedDropAbi } from "@/lib/contracts/self-verified-drop-abi";
import { celoSepolia } from "wagmi/chains";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config as wagmiConfig } from "@/lib/wagmi-config";
import { DistributionJourneySummary } from "@/components/distribution-journey-summary";

interface Step4ReviewProps {
  onBack: () => void;
  recipients: RecipientData[];
  distributionConfig: DistributionConfig;
}

export function Step4Review({ onBack, recipients, distributionConfig }: Step4ReviewProps) {
  const { address, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const [isDistributing, setIsDistributing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const contractAddress =
    "0xC2FE5379a4c096e097d47f760855B85edDF625e2".toLowerCase() as `0x${string}`;
  const chainId = celoSepolia.id;

  const totalAmount = useMemo(() => {
    return recipients.reduce((sum, r) => sum + Number(r.amount), 0);
  }, [recipients]);

  const totalEth = useMemo(() => {
    try {
      const values = recipients.map((r) => parseEther(r.amount as `${string}`));
      return values.reduce((a, b) => a + b);
    } catch {
      return BigInt(0);
    }
  }, [recipients]);

  const handleDistribute = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!chain || chain.id !== celoSepolia.id) {
      switchChain?.({ chainId: celoSepolia.id });
      return;
    }

    setIsDistributing(true);
    setError(null);

    try {
      const addrs = recipients.map((r) => r.address as `0x${string}`);
      const amts = recipients.map((r) => parseEther(r.amount as `${string}`));
      const value = amts.reduce((a, b) => a + b);

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: SelfVerifiedDropAbi,
        functionName: "airdropETH",
        args: [addrs, amts],
        chainId,
        value,
      } as any);

      setTxHash(hash);

      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        hash,
      });

      if (receipt.status === "success") {
        setSuccess(true);
      } else {
        setError("Transaction failed");
      }
    } catch (e: any) {
      console.error("Distribution error:", e);
      setError(e?.message || "Failed to distribute tokens");
    } finally {
      setIsDistributing(false);
    }
  };

  if (success && txHash) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl">
              Distribution Successful!
            </CardTitle>
            <CardDescription>
              Your tokens have been distributed to all recipients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-semibold">{recipients.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Distributed</span>
                <span className="font-semibold">
                  {totalAmount.toLocaleString()} CELO
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Transaction Hash</span>
                <a
                  href={`${chain?.blockExplorers?.default.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
                All recipients have received their tokens successfully!
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Start New Distribution
            </Button>
            <Button
              onClick={() =>
                window.open(
                  `${chain?.blockExplorers?.default.url}/tx/${txHash}`,
                  "_blank"
                )
              }
              className="w-full"
            >
              View on Explorer
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Review & Execute</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Review your distribution details before executing
        </p>
      </div>

      {/* Desktop: Two-column layout, Mobile: Single column */}
      <div className="grid lg:grid-cols-[350px,1fr] gap-6">
        {/* Journey Summary Sidebar - Hidden on mobile initially */}
        <div className="hidden lg:block">
          <DistributionJourneySummary
            recipients={recipients}
            config={distributionConfig}
          />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Mobile Journey Summary - Collapsible */}
          <div className="lg:hidden">
            <DistributionJourneySummary
              recipients={recipients}
              config={distributionConfig}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Recipients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recipients.length === 1 ? "wallet" : "wallets"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">CELO tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Distribution Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{distributionConfig.mode}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {distributionConfig.mode === "send" ? "Batch transfer" : "Individual claims"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recipients List
          </CardTitle>
          <CardDescription>
            Verify all addresses and amounts before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead className="text-right">Amount (CELO)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs md:text-sm">
                      <span className="hidden md:inline">{recipient.address}</span>
                      <span className="md:hidden">
                        {recipient.address.slice(0, 10)}...
                        {recipient.address.slice(-8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {recipient.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {recipients.length > 10 && (
            <div className="mt-4 text-center">
              <Badge variant="secondary">
                Showing all {recipients.length} recipients
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          You're about to distribute <strong>{totalAmount.toLocaleString()} CELO</strong> to{" "}
          <strong>{recipients.length}</strong>{" "}
          {recipients.length === 1 ? "recipient" : "recipients"}. Please ensure
          you have enough balance to cover the total amount plus gas fees.
        </AlertDescription>
      </Alert>

          {/* Navigation */}
          <div className="flex flex-col md:flex-row gap-3 md:justify-between">
            <Button
              onClick={onBack}
              variant="outline"
              size="lg"
              disabled={isDistributing}
              className="w-full md:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleDistribute}
              disabled={isDistributing || isSwitchingChain}
              size="lg"
              className="w-full md:w-auto min-w-[200px]"
            >
              {isDistributing || isSwitchingChain ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isSwitchingChain ? "Switching Network..." : "Distributing..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Execute Distribution
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
