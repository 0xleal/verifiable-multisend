"use client";

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
import { Upload, FileText, AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RecipientData } from "@/components/csv-upload";

interface Step1UploadProps {
  onNext: (recipients: RecipientData[]) => void;
  initialData?: RecipientData[];
}

export function Step1Upload({ onNext, initialData }: Step1UploadProps) {
  const [csvText, setCsvText] = useState(
    initialData
      ? initialData.map((r) => `${r.address},${r.amount}`).join("\n")
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<RecipientData[]>(
    initialData || [],
  );

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
          `Invalid format on line ${i + 1}. Expected: address,amount`,
        );
      }

      // Basic Ethereum address validation
      if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error(
          `Invalid Ethereum address on line ${i + 1}: ${address}`,
        );
      }

      // Validate amount is a number
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error(`Invalid amount on line ${i + 1}: ${amount}`);
      }

      data.push({ address, amount });
    }

    if (data.length === 0) {
      throw new Error("No valid recipient data found");
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
          setParsedData(parsed);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
          setParsedData([]);
        }
      };
      reader.readAsText(file);
    },
    [parseCSV],
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
    [handleFileUpload],
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
          setParsedData(parsed);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to parse CSV");
          setParsedData([]);
        }
      } else {
        setParsedData([]);
        setError(null);
      }
    },
    [parseCSV],
  );

  const handleNext = () => {
    if (parsedData.length > 0) {
      onNext(parsedData);
    }
  };

  const totalAmount = parsedData.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Add Recipients</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Upload a CSV file or paste wallet addresses and amounts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Recipient Data
          </CardTitle>
          <CardDescription>
            Format: address,amount (one per line)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Upload
              className={`h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 transition-colors ${
                isDragging ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <p className="text-sm md:text-base text-muted-foreground mb-3">
              Drag and drop your CSV file here, or
            </p>
            <Button
              variant="outline"
              size="sm"
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-text" className="text-sm font-medium">
              Paste CSV data
            </Label>
            <Textarea
              id="csv-text"
              placeholder={`0x1234567890123456789012345678901234567890,100
0x2345678901234567890123456789012345678901,200
0x3456789012345678901234567890123456789012,150`}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="font-mono text-xs md:text-sm min-h-[180px] md:min-h-[200px] border-2 border-primary/30 placeholder:opacity-40"
            />
            <p className="text-xs text-muted-foreground">
              Example: 0x1234...,100 (one recipient per line)
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Summary */}
          {parsedData.length > 0 && !error && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
                Successfully parsed <strong>{parsedData.length}</strong>{" "}
                recipients with a total of{" "}
                <strong>{totalAmount.toLocaleString()}</strong> tokens
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={parsedData.length === 0 || !!error}
          size="lg"
          className="w-full md:w-auto"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
