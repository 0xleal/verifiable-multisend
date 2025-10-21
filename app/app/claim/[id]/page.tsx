"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from "wagmi";
import { formatEther, keccak256, toHex } from "viem";
import { celoSepolia } from "wagmi/chains";
import { waitForTransactionReceipt } from "wagmi/actions";
import { config as wagmiConfig } from "@/lib/wagmi-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Gift,
  Coins,
  ArrowLeft,
  Info,
} from "lucide-react";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { SelfVerifiedAirdropAbi } from "@/lib/contracts/self-verified-airdrop-abi";

interface AirdropData {
  id: string;
  airdropIdHash: string;
  recipients: Array<{
    address: string;
    amount: string;
    index: number;
    proof: string[];
  }>;
  merkleRoot: string;
  tokenAddress: string;
  totalAmount: string;
  creator: string;
  createdAt: number;
  txHash?: string;
}

const AIRDROP_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`;

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { address, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { switchChain } = useSwitchChain();

  const [airdropData, setAirdropData] = useState<AirdropData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch airdrop data from API
  useEffect(() => {
    async function fetchAirdropData() {
      try {
        const response = await fetch(`/api/airdrops/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Airdrop not found");
          } else {
            setError("Failed to fetch airdrop data");
          }
          setLoading(false);
          return;
        }
        const data: AirdropData = await response.json();
        setAirdropData(data);
      } catch (e) {
        console.error("Error fetching airdrop:", e);
        setError("Failed to load airdrop data");
      } finally {
        setLoading(false);
      }
    }

    fetchAirdropData();
  }, [resolvedParams.id]);

  // Check if airdrop exists onchain
  const { data: onchainAirdrop, isLoading: isLoadingOnchain } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS,
    abi: SelfVerifiedAirdropAbi,
    functionName: "airdrops",
    args: airdropData ? [keccak256(toHex(airdropData.id))] : undefined,
    query: {
      enabled: !!airdropData,
    },
  });

  // Check if user is verified
  const { data: isVerified, refetch: refetchVerification } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS,
    abi: SelfVerifiedAirdropAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Check if user has claimed
  const { data: hasClaimed } = useReadContract({
    address: AIRDROP_CONTRACT_ADDRESS,
    abi: SelfVerifiedAirdropAbi,
    functionName: "hasClaimed",
    args: airdropData && address ? [keccak256(toHex(airdropData.id)), address] : undefined,
    query: {
      enabled: !!airdropData && !!address,
    },
  });

  // Find user's allocation
  const userAllocation = airdropData?.recipients.find(
    (r) => r.address.toLowerCase() === address?.toLowerCase()
  );

  const handleClaim = async () => {
    if (!address || !airdropData || !userAllocation) {
      return;
    }

    if (chain?.id !== celoSepolia.id) {
      switchChain?.({ chainId: celoSepolia.id });
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const hash = await writeContractAsync({
        address: AIRDROP_CONTRACT_ADDRESS,
        abi: SelfVerifiedAirdropAbi,
        functionName: "claim",
        args: [
          keccak256(toHex(airdropData.id)),
          BigInt(userAllocation.index),
          BigInt(userAllocation.amount),
          userAllocation.proof as `0x${string}`[],
        ],
        chainId: celoSepolia.id,
      } as any);

      setTxHash(hash);

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });

      if (receipt.status === "success") {
        setSuccess(true);
      } else {
        setError("Transaction failed");
      }
    } catch (e: any) {
      console.error("Claim error:", e);
      setError(e?.shortMessage || e?.message || "Failed to claim tokens");
    } finally {
      setClaiming(false);
    }
  };

  const handleVerify = () => {
    // TODO: Implement Self verification flow
    // For now, show message to user
    alert("Self verification integration coming soon. For testing, use the trigger function directly.");
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading airdrop...</p>
        </div>
      </div>
    );
  }

  // Error state - airdrop not found
  if (error === "Airdrop not found" || !airdropData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">HumanPay Claim</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-destructive">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertCircle className="h-16 w-16 text-destructive" />
                </div>
              </div>
              <CardTitle>Airdrop Not Found</CardTitle>
              <CardDescription>
                This airdrop doesn't exist or the link is invalid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => (window.location.href = "/")} className="w-full">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Check if airdrop exists onchain
  const airdropExistsOnchain = onchainAirdrop && onchainAirdrop[0] !== "0x" + "0".repeat(64);

  // Success state
  if (success && txHash) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">Claim Successful!</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto border-green-200 dark:border-green-800">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl">Tokens Claimed!</CardTitle>
              <CardDescription>
                You've successfully claimed your tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {userAllocation ? formatEther(BigInt(userAllocation.amount)) : "0"} CELO
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction</span>
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
              <Button
                onClick={() =>
                  window.open(`${chain?.blockExplorers?.default.url}/tx/${txHash}`, "_blank")
                }
                className="w-full"
              >
                View on Explorer
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Main claim interface
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Claim Airdrop</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {airdropData.id}
              </p>
            </div>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Airdrop Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Airdrop Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">
                    {formatEther(BigInt(airdropData.totalAmount))} CELO
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="font-semibold">{airdropData.recipients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Airdrop doesn't exist onchain */}
          {!isLoadingOnchain && !airdropExistsOnchain && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This airdrop has not been deployed onchain yet or has been cancelled.
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet not connected */}
          {!address && airdropExistsOnchain && (
            <Card>
              <CardHeader>
                <CardTitle>Connect Wallet</CardTitle>
                <CardDescription>
                  Connect your wallet to check if you're eligible to claim
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Click the "Connect Wallet" button in the top right to get started
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* User not verified */}
          {address && !isVerified && airdropExistsOnchain && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Required</CardTitle>
                <CardDescription>
                  You need to verify your identity with Self before claiming
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    This airdrop requires Self verification to prevent bots and ensure fair distribution
                  </AlertDescription>
                </Alert>
                <Button onClick={handleVerify} className="w-full">
                  Verify with Self
                </Button>
              </CardContent>
            </Card>
          )}

          {/* User not eligible */}
          {address && isVerified && !userAllocation && airdropExistsOnchain && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Not Eligible
                </CardTitle>
                <CardDescription>
                  Your wallet is not included in this airdrop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Connected wallet: <code className="font-mono text-xs">{address}</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* User already claimed */}
          {address && isVerified && userAllocation && hasClaimed && airdropExistsOnchain && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Already Claimed
                </CardTitle>
                <CardDescription>
                  You've already claimed your tokens from this airdrop
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Ready to claim */}
          {address && isVerified && userAllocation && !hasClaimed && airdropExistsOnchain && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-600" />
                  You're Eligible!
                </CardTitle>
                <CardDescription>
                  Claim your tokens now
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">You can claim</p>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {formatEther(BigInt(userAllocation.amount))}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">CELO tokens</p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  size="lg"
                  className="w-full"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Claim Tokens
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
