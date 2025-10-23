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
  Lock,
  Users,
  CheckCircle2,
  Coins,
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
              <h1 className="text-xl font-bold">Verifiable Multisend</h1>
              <p className="text-xs text-muted-foreground">
                Compliant token distribution
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
            Open Source • Powered by Self Protocol
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Compliant token distribution with zero-knowledge identity
            verification
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            Distribute tokens to verified humans while enforcing OFAC screening,
            country restrictions, and age requirements—without storing any
            personal data onchain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/distribute">
              <Button size="lg" className="gap-2 text-lg h-12 px-8">
                Get Started <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a
              href="https://github.com/0xleal/verifiable-multisend"
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
              <div className="text-3xl font-bold text-primary">
                Zero-Knowledge
              </div>
              <div className="text-sm text-muted-foreground">
                No personal data onchain
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">Self ID</div>
              <div className="text-sm text-muted-foreground">
                Passport-based verification
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">Onchain</div>
              <div className="text-sm text-muted-foreground">
                Verifiable compliance proofs
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What is Self */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">
                Powered by Self Protocol
              </h3>
              <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                The leading digital identity infrastructure for Web3. Self
                leverages zero-knowledge cryptography to disclose verifiable
                credentials without revealing sensitive information.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Zero-Knowledge Proofs</CardTitle>
                  <CardDescription>
                    Verify identity attributes from passports and ID cards
                    without exposing personal data. No third parties. No data
                    leaks.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Lock className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Privacy-First</CardTitle>
                  <CardDescription>
                    Users scan their passport with the Self app. ZK proofs
                    confirm compliance without revealing nationality, age, or
                    identity.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Verifiable Onchain</CardTitle>
                  <CardDescription>
                    All compliance checks happen onchain with cryptographic
                    proofs. Auditable, transparent, and tamper-proof.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Capabilities */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-3xl md:text-4xl font-bold">
                Onchain Compliance Checks
              </h3>
              <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                Enforce regulatory requirements directly on the blockchain using
                verified passport and ID card data
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>OFAC Screening</CardTitle>
                  <CardDescription>
                    Automatically screen recipients against OFAC sanctions
                    lists. Verify users are not on watchlists—without revealing
                    their identity.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Globe className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Country Restrictions</CardTitle>
                  <CardDescription>
                    Enforce jurisdiction controls based on passport nationality.
                    Exclude specific countries from token distribution with
                    cryptographic proof.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Age Verification</CardTitle>
                  <CardDescription>
                    Require minimum age for token claims. Verify birthdate from
                    government-issued IDs without exposing personal information.
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
                Built for compliant token distribution
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Token Airdrops
                  </CardTitle>
                  <CardDescription>
                    Distribute tokens to real humans, not bots
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Proof of humanity via passport verification</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Prevent sybil attacks and bot farming</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Batch distribution in single transaction</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Regulatory-Compliant Launches
                  </CardTitle>
                  <CardDescription>
                    Launch tokens with jurisdiction controls
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Exclude sanctioned countries (OFAC screening)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Enforce age restrictions (18+, 21+, etc.)</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>On-chain compliance proofs for regulators</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community Rewards
                  </CardTitle>
                  <CardDescription>
                    Reward contributors with verified identities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>One reward per verified person</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Privacy-preserving identity verification</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Flexible distribution to multiple recipients</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Geographic Token Distribution
                  </CardTitle>
                  <CardDescription>
                    Target or exclude specific regions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Country-based inclusion or exclusion rules</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Cryptographic proof of nationality</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>No personal data exposed or stored</span>
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
                Three steps to compliant token distribution
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  1
                </div>
                <h4 className="text-xl font-semibold">
                  Configure Compliance Rules
                </h4>
                <p className="text-muted-foreground">
                  Set OFAC screening, country restrictions, and age
                  requirements. Define which verified users can claim your
                  tokens.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  2
                </div>
                <h4 className="text-xl font-semibold">Upload Recipients</h4>
                <p className="text-muted-foreground">
                  Add recipient addresses and token amounts. Batch distribute to
                  hundreds of addresses in a single transaction.
                </p>
              </div>

              <div className="space-y-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                  3
                </div>
                <h4 className="text-xl font-semibold">
                  Recipients Verify & Claim
                </h4>
                <p className="text-muted-foreground">
                  Recipients scan their passport with Self app to generate ZK
                  proof, then claim tokens if they pass compliance checks.
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
              Ready to distribute tokens compliantly?
            </h3>
            <p className="text-lg opacity-90">
              Open source infrastructure for token distribution with built-in
              compliance. Powered by Self's zero-knowledge identity
              verification.
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
                <span className="font-bold">Verifiable Multisend</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open-source infrastructure for compliant token distribution.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold">Resources</h5>
              <div className="space-y-2 text-sm">
                <a
                  href="https://github.com/0xleal/verifiable-multisend"
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
