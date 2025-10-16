"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Coins } from "lucide-react";
import type { RecipientData } from "./csv-upload";
import { Skeleton } from "./ui/skeleton";

interface DistributionPreviewProps {
  recipients: RecipientData[];
}

const MOCK_RECIPIENTS: RecipientData[] = [
  { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", amount: "1000" },
  { address: "0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c", amount: "500" },
  { address: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", amount: "750" },
];

export function DistributionPreview({ recipients }: DistributionPreviewProps) {
  const displayRecipients =
    recipients.length > 0 ? recipients : MOCK_RECIPIENTS;
  const isMockData = recipients.length === 0;

  const totalAmount = displayRecipients.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  return (
    <Card className={isMockData ? "opacity-60" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Distribution Preview
        </CardTitle>
        <CardDescription>
          {isMockData
            ? "Upload or paste CSV data to see your distribution preview"
            : "Review the recipients and amounts before distributing"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Recipients:</span>
            {isMockData ? (
              <Skeleton className="w-10 h-5 bg-muted" />
            ) : (
              <Badge variant="secondary">{displayRecipients.length}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Amount:</span>
            {isMockData ? (
              <Skeleton className="w-10 h-5 bg-muted" />
            ) : (
              <Badge variant="secondary">{totalAmount.toLocaleString()}</Badge>
            )}
          </div>
        </div>

        <div className="border rounded-lg max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Wallet Address</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isMockData ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <Skeleton className="w-full h-10 bg-muted" />
                  </TableCell>
                </TableRow>
              ) : (
                displayRecipients.map((recipient, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {recipient.address}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(recipient.amount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
