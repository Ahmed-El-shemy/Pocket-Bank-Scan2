import { useCallback, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Copy,
  Download,
  Send,
  X,
  ShieldCheck,
  Sparkles,
  Lock,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:5000";
const FORWARD_URL = "https://example.com/api/check";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/jpg"] as const;

type Status = "idle" | "loading" | "success" | "error";

export function CheckScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const jsonString = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result],
  );

  const acceptFile = useCallback((f: File) => {
    if (!ALLOWED.includes(f.type as (typeof ALLOWED)[number])) {
      toast.error("Only PNG, JPG, or JPEG images are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Image exceeds 20MB limit.");
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg(null);
    setStatus("idle");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }, [previewUrl]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyze = async () => {
    if (!file) return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await axios.post(`${API_BASE}/api/analyze-check`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });
      setResult(data);
      setStatus("success");
      toast.success("Check analyzed successfully.");
    } catch (err) {
      let msg = "Analysis failed.";
      if (axios.isAxiosError(err)) {
        msg = (err.response?.data as { error?: string } | undefined)?.error ?? err.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMsg(msg);
      setStatus("error");
      toast.error(msg);
    }
  };

  const copyJson = async () => {
    if (!jsonString) return;
    await navigator.clipboard.writeText(jsonString);
    toast.success("JSON copied to clipboard.");
  };

  const downloadJson = () => {
    if (!jsonString) return;
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "check-analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendJson = async () => {
    if (!result) return;
    try {
      await axios.post(FORWARD_URL, result, {
        headers: { "Content-Type": "application/json" },
        timeout: 30_000,
      });
      toast.success("JSON sent successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed.";
      toast.error(`Send failed: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      {/* ── Top Ribbon Banner ── */}
      <div
        style={{
          background: "linear-gradient(90deg, #1e3a5f 0%, #1a56db 45%, #0ea5e9 100%)",
          position: "relative",
          overflow: "hidden",
        }}
        className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium text-white"
      >
        {/* animated shimmer strip */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "ribbon-shimmer 3s linear infinite",
          }}
        />
        <Lock className="h-3.5 w-3.5 shrink-0 opacity-90" />
        <span className="tracking-wide">
          🏦 &nbsp;Pocket Bank Scan — AI-powered cheque analysis
        </span>
        <span className="hidden items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs backdrop-blur sm:flex">
          <Sparkles className="h-3 w-3" />
          Azure Document Intelligence
        </span>
        <style>{`
          @keyframes ribbon-shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>

      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Pocket Bank Scan</h1>
              <p className="text-xs text-muted-foreground">
                Secure document analysis powered by Azure AI
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs text-secondary-foreground sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Encrypted upload
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!file ? (
          <Card className="p-0">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold">Drop a check image here</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                or click to browse — PNG, JPG, JPEG up to 20MB
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) acceptFile(f);
                }}
              />
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: image */}
            <Card className="flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  {file.name}
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={status === "loading"}
                >
                  <X className="mr-1 h-4 w-4" /> Remove
                </Button>
              </div>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Check preview"
                    className="max-h-[520px] w-auto rounded object-contain"
                  />
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={analyze}
                  disabled={status === "loading"}
                  className="min-w-[160px]"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
                    </>
                  ) : (
                    "Analyze Check"
                  )}
                </Button>
              </div>
            </Card>

            {/* RIGHT: result */}
            <Card className="flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">Analysis Result</div>
                <StatusBadge status={status} />
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/30 p-4">
                {status === "loading" && (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Contacting Azure Document Intelligence…</p>
                  </div>
                )}
                {status === "error" && (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-destructive">
                    <p className="text-sm font-medium">Analysis failed</p>
                    <p className="text-xs text-muted-foreground">{errorMsg}</p>
                  </div>
                )}
                {status !== "loading" && status !== "error" && !result && (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                    <p className="text-sm">Run “Analyze Check” to view the Azure response here.</p>
                  </div>
                )}
                {status !== "loading" && status !== "error" && result && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <CheckField label="Check Number" data={getField(result, "CheckNumber")} />
                      <CheckField label="Date" data={getField(result, "Date")} />
                      <CheckField label="Bank Name" data={getField(result, "BankName")} />
                      <CheckField label="Branch" data={getField(result, "BankAddress")} />
                      <CheckField label="Payee" data={getField(result, "PayeeName")} />
                      <CheckField label="Amount" data={getField(result, "Amount")} />
                      <CheckField className="md:col-span-2" label="Amount in Words" data={getField(result, "AmountInWords")} />
                      <CheckField label="Account Number" data={getField(result, "AccountNumber")} />
                      <CheckField label="Routing Number" data={getField(result, "RoutingNumber")} />
                      <CheckField label="MICR" data={getField(result, "MicrNumber")} />
                      <CheckField label="Memo" data={getField(result, "Memo")} />
                      <CheckField label="Signature Detected" data={getField(result, "Signature")} />
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="raw-json" className="border-none">
                        <AccordionTrigger className="rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 data-[state=open]:rounded-b-none">
                          View Raw Azure JSON Response
                        </AccordionTrigger>
                        <AccordionContent className="rounded-b-md border border-t-0 bg-background pt-0">
                          <div className="group relative overflow-hidden bg-muted/30">
                            <div className="absolute right-3 top-3 flex gap-2">
                              <Button variant="secondary" size="sm" onClick={copyJson} className="h-8 shadow-sm">
                                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                              </Button>
                              <Button variant="secondary" size="sm" onClick={downloadJson} className="h-8 shadow-sm">
                                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                              </Button>
                              <Button variant="secondary" size="sm" onClick={sendJson} className="h-8 shadow-sm">
                                <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                              </Button>
                            </div>
                            <pre className="max-h-[300px] overflow-auto p-4 pt-14 text-xs leading-relaxed">
                              {jsonString}
                            </pre>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Backend endpoint: <code>POST {API_BASE}/api/analyze-check</code>. Configure Azure keys in{" "}
          <code>backend/.env</code>.
        </p>
      </main>
    </div>
  );
}

function getField(result: any, fieldId: string) {
  // 1. Search in documents[].fields first (for prebuilt-check)
  const docs = result?.analyzeResult?.documents || result?.documents || [];
  for (const doc of docs) {
    if (doc.fields && doc.fields[fieldId]) {
      const field = doc.fields[fieldId];
      let val = field.content || field.valueString || field.valueDate || field.valueNumber;
      if (field.type === "signature") {
        val = field.valueSignature === "signed" ? "Signature Present" : "Unsigned";
      }
      return { value: val, confidence: field.confidence };
    }
  }

  // 2. Fallbacks using keyValuePairs and lines for prebuilt-document
  const kvps = result?.analyzeResult?.keyValuePairs || result?.keyValuePairs || [];
  const findKVP = (regex: RegExp) => {
    const match = kvps.find((k: any) => k.key?.content && regex.test(k.key.content));
    return match?.value?.content ? { value: match.value.content, confidence: match.confidence } : null;
  };

  const lines = result?.analyzeResult?.pages?.[0]?.lines || result?.pages?.[0]?.lines || [];
  const findLine = (regex: RegExp) => {
    const match = lines.find((l: any) => regex.test(l.content));
    return match ? { value: match.content, confidence: undefined } : null;
  };

  let res: { value: string | undefined | null, confidence?: number } | null = null;

  switch(fieldId) {
    case "CheckNumber":
      res = findKVP(/check.*no|check.*num/i);
      if (!res) {
        const micrMatch = findLine(/⑆.*?⑈\s*(\d+)/);
        if (micrMatch) res = { value: micrMatch.value.match(/⑆.*?⑈\s*(\d+)/)?.[1], confidence: undefined };
        else {
          const numMatch = findLine(/^\d{3,4}$/);
          if (numMatch) res = numMatch;
        }
      }
      break;
    case "Date":
      res = findKVP(/date/i);
      if (res && res.value) res.value = res.value.split('\n')[0].trim();
      if (!res || !res.value || res.value.length < 4) {
        res = findLine(/^\d{4}\d{2}\d{2}$|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/);
      }
      break;
    case "BankName":
      res = findKVP(/bank name/i);
      if (!res) {
        const bankLine = findLine(/bank/i);
        if (bankLine && bankLine.value) {
          const parts = bankLine.value.split(',');
          const partWithBank = parts.find((p: string) => /bank/i.test(p));
          if (partWithBank) {
            const match = partWithBank.match(/([A-Z\s]+BANK[\sA-Z]*)/i);
            res = { value: match ? match[1].trim() : partWithBank.trim(), confidence: undefined };
          }
        }
      }
      break;
    case "Branch":
      res = findKVP(/branch/i);
      if (!res) {
        const branchLine = findLine(/branch/i);
        if (branchLine && branchLine.value) {
          const parts = branchLine.value.split(',');
          const partWithBranch = parts.find((p: string) => /branch/i.test(p));
          res = { value: partWithBranch ? partWithBranch.trim() : branchLine.value, confidence: undefined };
        }
      }
      break;
    case "PayeeName":
      res = findKVP(/pay\s*to/i);
      let payeeCandidate = null;
      if (res && res.value) {
        const parts = res.value.split('\n');
        payeeCandidate = parts.find((p: string) => !/^\$|hundred|dollars/i.test(p) && p.trim().length > 3);
      }
      if (payeeCandidate) {
        const fullLine = findLine(new RegExp(payeeCandidate.trim(), "i"));
        res = { value: fullLine ? fullLine.value : payeeCandidate.trim(), confidence: res?.confidence };
      } else {
        const foundationLine = findLine(/foundation|llc|inc/i);
        if (foundationLine) res = { value: foundationLine.value, confidence: undefined };
        else res = null;
      }
      break;
    case "Amount":
      res = findKVP(/amount/i);
      if (!res) {
        const amtLine = findLine(/^\$?\s*\d+\.\d{2}$/);
        if (amtLine) res = amtLine;
        else {
          const valWithDollar = findLine(/\$\s*\d+\.\d{2}/);
          if (valWithDollar && valWithDollar.value) {
             const m = valWithDollar.value.match(/\$\s*(\d+\.\d{2})/);
             res = { value: m ? m[1] : valWithDollar.value, confidence: undefined };
          }
        }
      }
      if (res && res.value && res.value.includes('\n')) {
        const amtPart = res.value.split('\n').find((p:string) => /\d+\.\d{2}/.test(p));
        if (amtPart) res.value = amtPart.trim();
      }
      break;
    case "AmountInWords":
      res = findKVP(/dollars/i);
      if (!res) {
        const wordsLines = lines.filter((l: any) => /dollars|hundred|thousand/i.test(l.content) && !/\$\d/.test(l.content));
        if (wordsLines.length > 0) {
           const longest = wordsLines.reduce((a:any, b:any) => a.content.length > b.content.length ? a : b);
           res = { value: longest.content, confidence: undefined };
        }
      }
      break;
    case "AccountNumber":
      res = findKVP(/account/i);
      if (!res) {
        const micrLine = findLine(/⑆/);
        if (micrLine && micrLine.value) {
          const match = micrLine.value.match(/⑆.*?⑆\s*(\d+)⑈/);
          if (match) res = { value: match[1], confidence: undefined };
        }
      }
      break;
    case "RoutingNumber":
      res = findKVP(/routing/i);
      if (!res) {
        const micrLine = findLine(/⑆/);
        if (micrLine && micrLine.value) {
          const match = micrLine.value.match(/⑆(\d+)⑆/);
          if (match) res = { value: match[1], confidence: undefined };
        }
      }
      break;
    case "MicrNumber":
      res = findLine(/⑆/);
      break;
    case "Memo":
      res = findKVP(/memo/i);
      if (res && res.value && /⑆/.test(res.value)) res = null; 
      if (!res) {
        const memoLine = findLine(/^memo/i);
        if (memoLine && memoLine.value) res = { value: memoLine.value.replace(/^memo\s*/i, '').trim(), confidence: undefined };
      }
      break;
    case "Signature":
      const styles = result?.analyzeResult?.styles || result?.styles || [];
      const handwritten = styles.filter((s: any) => s.isHandwritten);
      if (handwritten.length > 0) res = { value: "Signature Present", confidence: handwritten[0].confidence || undefined };
      break;
  }

  return res && res.value ? { value: res.value, confidence: res.confidence } : null;
}

function CheckField({ label, data, className }: { label: string, data: any, className?: string }) {
  const isEstimated = data && data.confidence === undefined;
  const confValue = data?.confidence !== undefined ? data.confidence : 0.85; 
  const confPercent = Math.round(confValue * 100);
  
  let badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (confPercent < 60) badgeClass = "bg-red-100 text-red-800 border-red-200";
  else if (confPercent < 80) badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";

  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      <Label className="ml-1 text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input 
          readOnly 
          value={data?.value || "Not detected"} 
          className="bg-background pr-20 text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0" 
        />
        {data?.value && (
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 rounded border px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
            {isEstimated ? "Estimated" : `${confPercent}%`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    idle: "bg-muted text-muted-foreground",
    loading: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
  };
  const label: Record<Status, string> = {
    idle: "Ready",
    loading: "Analyzing",
    success: "Success",
    error: "Error",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}