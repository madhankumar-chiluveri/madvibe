import { NextRequest, NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

// Allow up to 300 s for the OCI VM agent to respond
export const maxDuration = 300;

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
      signal: AbortSignal.timeout(290_000), // 290 s — just under 300 s limit
    });

    if (!agentRes.ok) {
      const text = await agentRes.text();
      return NextResponse.json(
        { error: "Agent error", detail: text },
        { status: agentRes.status }
      );
    }

    if (body.stream && agentRes.body) {
      return new Response(agentRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
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
