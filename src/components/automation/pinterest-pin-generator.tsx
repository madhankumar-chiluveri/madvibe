"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlignLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Sparkles,
  Tag,
  Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PinResult = {
  pinTitle: string;
  pinDescription: string;
  tags: string[];
  imagePrompt: string;
  generatedImage: string;
  productImage: string;
  affiliateUrl: string;
  productTitle: string;
};

const LOADING_STEPS = [
  "Scraping product data from Amazon...",
  "Writing Pinterest-ready affiliate copy...",
  "Generating the pin visual...",
] as const;

function CopyButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
    >
      <Copy className="h-3.5 w-3.5" />
      {active ? "Copied" : "Copy"}
    </button>
  );
}

function ResultBlock({
  icon,
  label,
  copyActive = false,
  onCopy,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  copyActive?: boolean;
  onCopy?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-foreground">
            {icon}
          </span>
          {label}
        </div>
        {onCopy ? <CopyButton active={copyActive} onClick={onCopy} /> : null}
      </div>
      {children}
    </div>
  );
}

export function PinterestPinGenerator() {
  const [url, setUrl] = useState("");
  const [affiliateTag, setAffiliateTag] = useState(
    process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(LOADING_STEPS[0]);
  const [result, setResult] = useState<PinResult | null>(null);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(LOADING_STEPS[0]);
      return;
    }

    let stepIndex = 0;
    setLoadingStep(LOADING_STEPS[stepIndex]);

    const interval = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, LOADING_STEPS.length - 1);
      setLoadingStep(LOADING_STEPS[stepIndex]);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [loading]);

  async function handleCopy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  }

  async function generate() {
    if (!url.trim() || !affiliateTag.trim()) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amazonUrl: url.trim(),
          affiliateTag: affiliateTag.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to generate the Pinterest pin.");
      }

      setResult(payload as PinResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the Pinterest pin.");
    } finally {
      setLoading(false);
    }
  }

  const previewImage = result?.generatedImage || result?.productImage || "";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[32px] border border-border/70 bg-card/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_45%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_42%)] px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                First Automation
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Amazon affiliate pins
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
              Pinterest Pin Generator
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Drop in a full Amazon product URL and MadVibe handles the scrape, the affiliate-safe copy,
              and the Pinterest-ready visual prompt in one server-side workflow.
            </p>
          </div>

          <div className="grid gap-4 px-5 py-5 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Amazon Product URL
                </label>
                <Input
                  type="url"
                  placeholder="https://www.amazon.com/dp/B08N5WRWNW"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-none focus-visible:ring-primary/30"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Use the full Amazon product page. Short links like <span className="font-medium text-foreground">amzn.to</span> are rejected.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Affiliate Tag
                </label>
                <Input
                  type="text"
                  placeholder="yourtag-20"
                  value={affiliateTag}
                  onChange={(event) => setAffiliateTag(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-none focus-visible:ring-primary/30"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Prefilled from <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_AMAZON_AFFILIATE_TAG</code> when available.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1">Crawl4AI scrape</span>
                <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1">OpenRouter copy</span>
                <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1">AI visual prompt</span>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={generate}
                disabled={loading || !url.trim() || !affiliateTag.trim()}
                className="h-11 rounded-2xl bg-rose-600 px-5 text-white shadow-sm hover:bg-rose-500"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Pin Package
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-[24px] border border-rose-500/25 bg-rose-500/8 p-4 text-sm text-rose-700 dark:text-rose-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-5">
            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-[28px] border border-border/70 bg-card/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Preview
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {result.productTitle}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      result.generatedImage
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {result.generatedImage ? "AI visual ready" : "Using product image"}
                  </span>
                </div>

                {previewImage ? (
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[24px] border border-border/70 bg-muted/30">
                    <Image
                      src={previewImage}
                      alt={result.productTitle}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                    No image returned
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {result.generatedImage ? (
                    <Button asChild variant="outline" className="rounded-2xl">
                      <a href={result.generatedImage} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        Open Image
                      </a>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" className="rounded-2xl">
                    <a href={result.affiliateUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open Affiliate Link
                    </a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-5">
                <ResultBlock
                  icon={<Type className="h-4 w-4" />}
                  label="Pin Title"
                  copyActive={copiedKey === "pin-title"}
                  onCopy={() => handleCopy(result.pinTitle, "pin-title")}
                >
                  <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm font-medium leading-6 text-foreground">
                    {result.pinTitle}
                  </div>
                </ResultBlock>

                <ResultBlock
                  icon={<AlignLeft className="h-4 w-4" />}
                  label="Description"
                  copyActive={copiedKey === "pin-description"}
                  onCopy={() => handleCopy(result.pinDescription, "pin-description")}
                >
                  <Textarea
                    readOnly
                    value={result.pinDescription}
                    className="min-h-[132px] rounded-2xl border-border/70 bg-background/70 leading-6 shadow-none focus-visible:ring-0"
                  />
                </ResultBlock>

                <ResultBlock
                  icon={<Link2 className="h-4 w-4" />}
                  label="Affiliate Link"
                  copyActive={copiedKey === "affiliate-link"}
                  onCopy={() => handleCopy(result.affiliateUrl, "affiliate-link")}
                >
                  <Textarea
                    readOnly
                    value={result.affiliateUrl}
                    className="min-h-[94px] rounded-2xl border-border/70 bg-background/70 font-mono text-xs leading-6 shadow-none focus-visible:ring-0"
                  />
                </ResultBlock>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <ResultBlock
                icon={<Tag className="h-4 w-4" />}
                label={`Tags (${result.tags.length})`}
                copyActive={copiedKey === "tags"}
                onCopy={() => handleCopy(result.tags.map((tag) => `#${tag}`).join(" "), "tags")}
              >
                <div className="flex flex-wrap gap-2">
                  {result.tags.length > 0 ? (
                    result.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleCopy(`#${tag}`, tag)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          copiedKey === tag
                            ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                            : "border-rose-500/20 bg-rose-500/8 text-rose-700 hover:border-rose-500/30 hover:bg-rose-500/12 dark:text-rose-200"
                        )}
                      >
                        #{tag}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags were returned.</p>
                  )}
                </div>
              </ResultBlock>

              <ResultBlock
                icon={<ImageIcon className="h-4 w-4" />}
                label="Image Prompt"
                copyActive={copiedKey === "image-prompt"}
                onCopy={() => handleCopy(result.imagePrompt, "image-prompt")}
              >
                <Textarea
                  readOnly
                  value={result.imagePrompt}
                  className="min-h-[168px] rounded-2xl border-border/70 bg-background/70 leading-6 shadow-none focus-visible:ring-0"
                />
              </ResultBlock>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="space-y-5">
        <div className="overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(160deg,rgba(225,29,72,0.12),rgba(251,146,60,0.08)_55%,rgba(255,255,255,0.02))] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-rose-500" />
            Workflow Status
          </div>
          <div className="mt-4 rounded-[24px] border border-border/70 bg-background/80 p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border",
                  loading
                    ? "border-rose-500/25 bg-rose-500/10 text-rose-600"
                    : result
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600"
                      : "border-border/70 bg-muted/40 text-muted-foreground"
                )}
              >
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : result ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {loading
                    ? loadingStep
                    : result
                      ? "Pin package ready to post"
                      : "Waiting for a product URL"}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground" aria-live="polite">
                  {loading
                    ? "The generator runs Crawl4AI locally, then text generation and image generation in sequence on the server."
                    : result
                      ? "You can copy each field individually, open the affiliate link, and reuse the image prompt for future variations."
                      : "Once you hit generate, MadVibe returns the title, description, affiliate link, hashtags, and the image prompt together."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-border/70 bg-card/90 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            What You Get
          </div>
          <div className="mt-4 grid gap-3">
            {[
              "Keyword-rich pin title capped for Pinterest-friendly copy.",
              "Benefit-led description with CTA and #ad disclosure.",
              "Hashtag set ready to paste into your publishing workflow.",
              "Affiliate-tagged destination link and reusable image prompt.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-3 text-sm leading-6 text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
