import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Globe,
  Shield,
  Zap,
  Lock,
  Users,
  DollarSign,
  CheckCircle2,
  Coins,
  TrendingDown,
  Clock,
  Building2,
  Send,
  Banknote,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Coins className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">HumanPay</h1>
              <p className="text-xs text-muted-foreground">
                Compliant cross-border payments
              </p>
            </div>
          </div>
          <Link href="/distribute">
            <Button size="lg" className="gap-2">
              Launch App <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Open Source Infrastructure
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Cross-border payments that don't cost 7% and take 7 days
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            Send crypto payments globally while maintaining regulatory
            compliance—without centralized intermediaries, traditional banking
            rails, or sacrificing privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/distribute">
              <Button size="lg" className="gap-2 text-lg h-12 px-8">
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a
              href="https://github.com/talentprotocol/verifiable-multisend"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-lg h-12 px-8"
              >
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">70%+</div>
              <div className="text-sm text-muted-foreground">
                Cheaper than wire transfers
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">Instant</div>
              <div className="text-sm text-muted-foreground">
                Settlement in seconds
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">$700B+</div>
              <div className="text-sm text-muted-foreground">
                Annual remittances market
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">
                The Cross-Border Payment Problem
              </h3>
              <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                Traditional finance and existing crypto solutions both fall
                short
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-destructive" />
                    Traditional Banking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>3-7 day settlement times</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>3-7% fees ($30-50 per wire)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Excludes 1.4B unbanked people</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Manual compliance that doesn't scale</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-destructive" />
                    Existing Crypto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Centralized exchanges custody your funds</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>No compliance layer = regulatory risk</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Vulnerable to bot exploitation</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>Can't enforce jurisdiction controls</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">
                The HumanPay Solution
              </h3>
              <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                Zero-knowledge identity verification + gas-optimized batch
                transfers = compliant, instant, affordable global payments
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Instant Settlement</CardTitle>
                  <CardDescription>
                    Payments arrive in seconds, not days. No waiting for bank
                    business hours or SWIFT networks.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingDown className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>70%+ Cheaper</CardTitle>
                  <CardDescription>
                    Single batch transaction replaces expensive wire transfers.
                    Pay $25 instead of $1,500 for 50 recipients.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Regulatory Compliant</CardTitle>
                  <CardDescription>
                    OFAC screening, jurisdiction controls, and age verification
                    via zero-knowledge proofs.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Lock className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Privacy-Preserving</CardTitle>
                  <CardDescription>
                    No personal data on-chain. Zero-knowledge proofs mean your
                    identity stays private.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Banknote className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Non-Custodial</CardTitle>
                  <CardDescription>
                    You control your funds at all times. No intermediaries, no
                    custody risk.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Globally Accessible</CardTitle>
                  <CardDescription>
                    Anyone with a passport/ID and internet connection can
                    participate. No bank account required.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">Use Cases</h3>
              <p className="text-lg text-muted-foreground text-pretty">
                Real problems, real solutions, real savings
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Global Payroll
                  </CardTitle>
                  <CardDescription>
                    Pay 50 contractors across 25 countries instantly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Traditional wire transfers
                      </span>
                      <span className="font-semibold">$1,500+ fees</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">With HumanPay</span>
                      <span className="font-semibold text-primary">$25 gas</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      Save $1,475+ per month
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Remittances
                  </CardTitle>
                  <CardDescription>
                    Send $500/month home without 7% Western Union fees
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Traditional remittance
                      </span>
                      <span className="font-semibold">$420/year fees</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">With HumanPay</span>
                      <span className="font-semibold text-primary">$6/year</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      99% fee reduction
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliant Token Launch
                  </CardTitle>
                  <CardDescription>
                    Distribute governance tokens while excluding sanctioned
                    countries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>OFAC + jurisdiction checks via ZK proofs</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Zero personal data stored</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>On-chain compliance proof for regulators</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    B2B Settlements
                  </CardTitle>
                  <CardDescription>
                    Pay 100 vendors across 3 continents monthly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        SWIFT payments
                      </span>
                      <span className="font-semibold">$4,000/month</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">With HumanPay</span>
                      <span className="font-semibold text-primary">
                        $50/month
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      Save $3,950 per month
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">How It Works</h3>
              <p className="text-lg text-muted-foreground text-pretty">
                Simple, secure, compliant
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  1
                </div>
                <h4 className="text-xl font-semibold">Verify Your Identity</h4>
                <p className="text-muted-foreground">
                  Scan your passport with Self.xyz app. Zero-knowledge proof
                  confirms you pass OFAC/compliance checks without revealing
                  personal data.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  2
                </div>
                <h4 className="text-xl font-semibold">Upload Recipients</h4>
                <p className="text-muted-foreground">
                  Add wallet addresses and amounts via CSV or paste directly.
                  Pay anyone, anywhere—no bank accounts required.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  3
                </div>
                <h4 className="text-xl font-semibold">Execute & Done</h4>
                <p className="text-muted-foreground">
                  One transaction sends to all recipients simultaneously.
                  Everyone receives funds in seconds at 70%+ cost savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold">
              Ready to transform cross-border payments?
            </h3>
            <p className="text-lg opacity-90">
              Join the future of compliant, instant, affordable global payments.
              Open source, non-custodial, privacy-preserving.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/distribute">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 text-lg h-12 px-8"
                >
                  Launch App <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <a
                href="https://github.com/talentprotocol/verifiable-multisend"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-lg h-12 px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  View Documentation
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold">HumanPay</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open-source infrastructure for compliant cross-border payments.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold">Resources</h5>
              <div className="space-y-2 text-sm">
                <a
                  href="https://github.com/talentprotocol/verifiable-multisend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub Repository
                </a>
                <a
                  href="https://docs.self.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Self.xyz Documentation
                </a>
                <a
                  href="https://docs.celo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Celo Documentation
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold">Network</h5>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  Celo Sepolia (Testnet)
                </div>
                <a
                  href="https://sepolia.celoscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Block Explorer
                </a>
                <a
                  href="https://faucet.celo.org/alfajores"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  Get Testnet Tokens
                </a>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto pt-8 mt-8 border-t text-center text-sm text-muted-foreground">
            <p>
              Built with{" "}
              <a
                href="https://self.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                Self.xyz
              </a>{" "}
              on{" "}
              <a
                href="https://celo.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                Celo
              </a>
              . Open source under MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
