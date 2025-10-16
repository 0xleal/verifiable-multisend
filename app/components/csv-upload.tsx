"use client";

import type React from "react";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface RecipientData {
  address: string;
  amount: string;
}

interface CSVUploadProps {
  onDataParsed: (data: RecipientData[]) => void;
}

export function CSVUpload({ onDataParsed }: CSVUploadProps) {
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseCSV = useCallback((text: string): RecipientData[] => {
    const lines = text.trim().split("\n");
    const data: RecipientData[] = [];

    // Skip header if it exists
    const startIndex = lines[0]?.toLowerCase().includes("address") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [address, amount] = line.split(",").map((s) => s.trim());

      if (!address || !amount) {
        throw new Error(
          `Invalid format on line ${i + 1}. Expected: address,amount`
        );
      }

      // Basic Ethereum address validation
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error(
          `Invalid Ethereum address on line ${i + 1}: ${address}`
        );
      }

      // Validate amount is a number
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error(`Invalid amount on line ${i + 1}: ${amount}`);
      }

      data.push({ address, amount });
    }

    return data;
  }, []);

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvText(text);
        try {
          const parsed = parseCSV(text);
          setError(null);
          onDataParsed(parsed);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
        }
      };
      reader.readAsText(file);
    },
    [parseCSV, onDataParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
        handleFileUpload(file);
      } else {
        setError("Please upload a CSV file");
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      setCsvText(text);
      if (text.trim()) {
        try {
          const parsed = parseCSV(text);
          setError(null);
          onDataParsed(parsed);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
        }
      }
    },
    [parseCSV, onDataParsed]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Recipients
        </CardTitle>
        <CardDescription>
          Upload a CSV file or paste CSV data with wallet addresses and token
          amounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop your CSV file here, or
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileUpload(file);
              };
              input.click();
            }}
          >
            Browse Files
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-text">Or paste CSV data</Label>
          <Textarea
            id="csv-text"
            placeholder={`0x1234...,100
0x5678...,200
0x9abc...,150`}
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="font-mono text-sm min-h-[150px]"
          />
          <p className="text-xs text-muted-foreground">
            Format: address,amount (one per line)
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
