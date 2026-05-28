import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { TOOL_DEFINITIONS, callTool } from "@/mcp/tools";

export const maxDuration = 60;

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

// REST endpoint for each tool — used by ChatGPT Custom GPT Actions
// POST /api/tools/<tool-name>  { ...args }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> }
) {
  const { tool } = await params;
  const token = extractToken(req);

  if (!token) {
    return Response.json(
      { error: "Unauthorized: provide Authorization: Bearer <token>" },
      { status: 401 }
    );
  }

  const known = TOOL_DEFINITIONS.find((t) => t.name === tool);
  if (!known) {
    return Response.json(
      { error: `Unknown tool: ${tool}`, available: TOOL_DEFINITIONS.map((t) => t.name) },
      { status: 404 }
    );
  }

  let args: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) args = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(token);

  try {
    const result = await callTool(tool, args, client);
    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
