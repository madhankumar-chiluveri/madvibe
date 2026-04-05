import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const CRAWL4AI_SCRIPT_PATH = join(PROJECT_ROOT, "scripts", "crawl4ai_amazon_product.py");
const PLAYWRIGHT_BROWSERS_PATH = join(PROJECT_ROOT, ".playwright-browsers");

const requestSchema = z.object({
  amazonUrl: z.string().trim().url("Enter a valid product URL."),
  affiliateTag: z.string().trim().min(1, "Enter your Amazon affiliate tag."),
});

const productSchema = z.object({
  title: z.string().trim().default(""),
  price: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  images: z.array(z.string().trim()).optional().default([]),
  rating: z.string().trim().optional().default(""),
  features: z.array(z.string().trim()).optional().default([]),
});

const textResponseSchema = z.object({
  pinTitle: z.string().trim().min(1),
  pinDescription: z.string().trim().min(1),
  tags: z.array(z.string().trim()).optional().default([]),
  imagePrompt: z.string().trim().min(1),
});

const DEFAULT_TEXT_MODEL = "google/gemma-3-27b-it:free";
const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux.2-klein-4b";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeAmazonUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  if (hostname === "amzn.to" || hostname.endsWith(".amzn.to")) {
    throw new Error("Use the full Amazon product URL instead of an amzn.to short link.");
  }

  if (!hostname.includes("amazon.")) {
    throw new Error("Paste a full Amazon product URL.");
  }

  url.hash = "";

  return url.toString();
}

function buildAffiliateUrl(rawUrl: string, affiliateTag: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("tag", affiliateTag);
  return url.toString();
}

function getOpenRouterHeaders() {
  const referer =
    process.env.SITE_URL?.trim() ||
    process.env.CUSTOM_AUTH_SITE_URL?.trim() ||
    process.env.CONVEX_SITE_URL?.trim() ||
    "https://madvibe.local";

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getRequiredEnv("OPENROUTER_API_KEY")}`,
    "HTTP-Referer": referer,
    "X-Title": "MadVibe Pinterest Pin Generator",
  };
}

async function openRouterRequest(body: Record<string, unknown>, label: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: getOpenRouterHeaders(),
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `${label} failed with status ${response.status}.`;

    throw new Error(message);
  }

  return payload;
}

function readMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof (part as { text?: unknown }).text === "string"
        ) {
          return (part as { text: string }).text;
        }

        return "";
      })
      .join("\n");
  }

  return "";
}

function parseJsonObject(raw: string) {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned);
}

function normalizeTags(tags: string[]) {
  return [...new Set(
    tags
      .map((tag) => tag.replace(/^#+/, "").trim().replace(/\s+/g, ""))
      .filter(Boolean)
  )].slice(0, 20);
}

function normalizeDescription(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return /#ad\b/i.test(trimmed) ? trimmed : `${trimmed} #ad`;
}

function readGeneratedImageUrl(payload: any) {
  const candidates = [
    payload?.choices?.[0]?.message?.images?.[0]?.url,
    payload?.data?.[0]?.url,
    payload?.images?.[0]?.url,
  ];

  return candidates.find((value) => typeof value === "string" && value.length > 0) ?? "";
}

function normalizePythonError(error: any) {
  const parts = [
    typeof error?.stderr === "string" ? error.stderr : "",
    typeof error?.stdout === "string" ? error.stdout : "",
    error instanceof Error ? error.message : "",
  ];

  const message = parts
    .join("\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (/No module named ['"]crawl4ai['"]|ModuleNotFoundError.*crawl4ai/i.test(message)) {
    return "Crawl4AI is not installed for this workspace. Run `python -m pip install crawl4ai` on this machine.";
  }

  if (/Executable doesn't exist|playwright install chromium|browserType\.launch/i.test(message)) {
    return "Chromium is not installed for Crawl4AI in this workspace. Run `python -m playwright install chromium`.";
  }

  if (/python was not found|cannot find the file specified|spawn python enoent/i.test(message)) {
    return "Python is not available, so the local Crawl4AI scraper cannot run.";
  }

  if (/Access is denied/i.test(message) && /\.crawl4ai/i.test(message)) {
    return "Crawl4AI could not create its local cache under this project folder. Check write access and try again.";
  }

  if (/Wait condition failed|timed out|TimeoutError|timeout/i.test(message)) {
    return "Crawl4AI timed out while loading the Amazon product page. Try again or use another product URL.";
  }

  if (/Blocked by anti-bot protection|robot check|amazon captcha/i.test(message)) {
    return "Amazon blocked the local Crawl4AI session with an anti-bot response. This free local path may need a different IP, a warm persistent profile, or a proxy to scrape this product page.";
  }

  return `Crawl4AI error: ${message || "The local scraper failed to run."}`;
}

async function scrapeAmazonProduct(amazonUrl: string) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "python",
      [CRAWL4AI_SCRIPT_PATH, amazonUrl],
      {
        cwd: PROJECT_ROOT,
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          CRAWL4_AI_BASE_DIRECTORY: PROJECT_ROOT,
          PLAYWRIGHT_BROWSERS_PATH,
        },
      }
    );

    if (stderr?.trim()) {
      console.warn("Crawl4AI stderr:", stderr.trim());
    }

    const parsed = productSchema.safeParse(JSON.parse(stdout));

    if (!parsed.success) {
      throw new Error("Crawl4AI returned invalid product data.");
    }

    return {
      ...parsed.data,
      title: parsed.data.title.trim(),
      images: parsed.data.images.filter(Boolean),
      features: parsed.data.features.filter(Boolean),
    };
  } catch (error) {
    throw new Error(normalizePythonError(error));
  }
}

function normalizeRouteError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong while generating the pin.";

  if (/crawl4ai|chromium is not installed|python is not available|local scraper/i.test(message)) {
    return {
      status: 503,
      message,
    };
  }

  if (/amazon product url|amzn\.to|paste a full amazon|could not extract product data/i.test(message)) {
    return {
      status: 422,
      message,
    };
  }

  return {
    status: 500,
    message,
  };
}

export async function POST(request: NextRequest) {
  try {
    const parsedRequest = requestSchema.safeParse(await request.json());

    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: parsedRequest.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const amazonUrl = normalizeAmazonUrl(parsedRequest.data.amazonUrl);
    const affiliateTag = parsedRequest.data.affiliateTag;
    const affiliateUrl = buildAffiliateUrl(amazonUrl, affiliateTag);
    const productData = await scrapeAmazonProduct(amazonUrl);

    if (!productData.title) {
      return NextResponse.json(
        { error: "Could not extract product data. Check the Amazon URL and try a full product page." },
        { status: 422 }
      );
    }

    const productImageUrl = productData.images[0] ?? "";
    const textModel = process.env.OPENROUTER_PIN_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
    const imageModel = process.env.OPENROUTER_PIN_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

    const textPayload = await openRouterRequest(
      {
        model: textModel,
        messages: [
          {
            role: "user",
            content: `You are a Pinterest marketing expert for Amazon affiliates.

Here is the product data scraped from Amazon:
${JSON.stringify(productData, null, 2)}

The affiliate link is: ${affiliateUrl}

Return ONLY a valid JSON object with exactly these fields, no markdown, no explanation:
{
  "pinTitle": "<max 100 chars, punchy, keyword-rich>",
  "pinDescription": "<150-300 chars, benefit-focused, ends with #ad and a CTA>",
  "tags": ["<15 to 20 relevant hashtags without the # symbol>"],
  "imagePrompt": "<detailed prompt for a Pinterest-style lifestyle product visual, 2:3 ratio, bright natural light, clean background, clear product visibility, and lifestyle context relevant to the category>"
}`,
          },
        ],
        response_format: { type: "json_object" },
      },
      "Text generation"
    );

    const rawText = readMessageText(textPayload?.choices?.[0]?.message?.content);
    const parsedText = textResponseSchema.safeParse(parseJsonObject(rawText || "{}"));

    if (!parsedText.success) {
      return NextResponse.json(
        { error: "OpenRouter returned an invalid pin payload. Try again or swap the text model." },
        { status: 502 }
      );
    }

    const textFields = {
      pinTitle: parsedText.data.pinTitle.trim().slice(0, 100),
      pinDescription: normalizeDescription(parsedText.data.pinDescription),
      tags: normalizeTags(parsedText.data.tags),
      imagePrompt: parsedText.data.imagePrompt.trim(),
    };

    let generatedImage = "";

    try {
      const imagePayload = await openRouterRequest(
        {
          model: imageModel,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${textFields.imagePrompt}. Pinterest pin format, 2:3 aspect ratio, high quality product photography.`,
                },
                ...(productImageUrl
                  ? [
                      {
                        type: "image_url",
                        image_url: { url: productImageUrl },
                      },
                    ]
                  : []),
              ],
            },
          ],
          modalities: ["image"],
        },
        "Image generation"
      );

      generatedImage = readGeneratedImageUrl(imagePayload);
    } catch (error) {
      console.error("Pinterest image generation failed:", error);
    }

    return NextResponse.json({
      pinTitle: textFields.pinTitle,
      pinDescription: textFields.pinDescription,
      tags: textFields.tags,
      imagePrompt: textFields.imagePrompt,
      generatedImage,
      productImage: productImageUrl,
      affiliateUrl,
      productTitle: productData.title,
    });
  } catch (error) {
    const normalized = normalizeRouteError(error);
    return NextResponse.json({ error: normalized.message }, { status: normalized.status });
  }
}
