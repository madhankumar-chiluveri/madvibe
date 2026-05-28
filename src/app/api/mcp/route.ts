import { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { TOOL_DEFINITIONS, callTool } from "@/mcp/tools";

export const maxDuration = 60;

function extractToken(req: NextRequest): string | null {
  // Claude.ai connectors embed token in URL: /api/mcp?token=<jwt>
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) return queryToken;

  // Fallback: standard Bearer header (curl / direct API use)
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;

  return null;
}

function createConvexClient(token: string): ConvexHttpClient {
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(token);
  return client;
}

function jsonRpcResult(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", result, id });
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", error: { code, message }, id });
}

// MCP Streamable HTTP — POST handles all JSON-RPC 2.0 messages
export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) {
    return jsonRpcError(null, -32001, "Unauthorized. Get your token from /api/mcp/token and add it as Authorization: Bearer <token>");
  }

  let body: { method?: string; params?: Record<string, unknown>; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error: invalid JSON");
  }

  const { method, params = {}, id } = body;
  const client = createConvexClient(token);

  try {
    switch (method) {
      // ── Lifecycle ─────────────────────────────────────────────────────────────
      case "initialize":
        return jsonRpcResult(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "madvibe", version: "1.0.0" },
        });

      case "notifications/initialized":
        return new Response(null, { status: 204 });

      case "ping":
        return jsonRpcResult(id, {});

      // ── Tools ─────────────────────────────────────────────────────────────────
      case "tools/list":
        return jsonRpcResult(id, { tools: TOOL_DEFINITIONS });

      case "tools/call": {
        const toolName = (params as { name?: string; arguments?: Record<string, unknown> }).name;
        const toolArgs = (params as { name?: string; arguments?: Record<string, unknown> }).arguments ?? {};

        if (!toolName) {
          return jsonRpcError(id, -32602, "Invalid params: missing tool name");
        }

        const known = TOOL_DEFINITIONS.find((t) => t.name === toolName);
        if (!known) {
          return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
        }

        const result = await callTool(toolName, toolArgs, client);

        return jsonRpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonRpcError(id, -32603, message);
  }
}

// GET — health check / discovery
export async function GET() {
  return Response.json({
    name: "MadVibe MCP Server",
    version: "1.0.0",
    protocol: "MCP Streamable HTTP (2024-11-05)",
    tools: TOOL_DEFINITIONS.map((t) => t.name),
    auth: "Bearer token — visit /api/mcp/token in your browser while signed in to MadVibe",
  });
}
