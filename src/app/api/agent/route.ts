import { NextRequest, NextResponse } from "next/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

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
  } catch (err) {
    console.error("[/api/agent] error:", err);
    return NextResponse.json(
      { error: "Failed to reach Maddy agent" },
      { status: 500 }
    );
  }
}
