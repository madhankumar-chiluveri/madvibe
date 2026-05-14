import { NextRequest, NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

// Allow up to 60 s for the Railway agent to respond (cold starts can be slow)
export const maxDuration = 60;

const AGENT_URL = process.env.MADVIBE_AGENT_URL ?? "http://localhost:8000";
const AGENT_KEY = process.env.MADVIBE_AGENT_KEY ?? "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = await convexAuthNextjsToken();
    body.convex_token = token;

    const agentRes = await fetch(`${AGENT_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55_000), // 55 s — just under Vercel's 60 s limit
    });

    if (!agentRes.ok) {
      const text = await agentRes.text();
      return NextResponse.json(
        { error: "Agent error", detail: text },
        { status: agentRes.status }
      );
    }

    const data = await agentRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    const isUnreachable = err?.cause?.code === "ECONNREFUSED" || err?.cause?.code === "ENOTFOUND";

    console.error("[/api/agent] error:", err?.name, err?.message);

    if (isTimeout) {
      return NextResponse.json(
        { error: "Agent timed out", detail: "The agent took too long to respond. Try again." },
        { status: 504 }
      );
    }
    if (isUnreachable) {
      return NextResponse.json(
        { error: "Agent unreachable", detail: `Cannot connect to agent at ${AGENT_URL}. Check MADVIBE_AGENT_URL in environment variables.` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "Failed to reach Maddy agent", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
