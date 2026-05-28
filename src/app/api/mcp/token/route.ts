import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

/**
 * GET /api/mcp/token
 *
 * Visit this URL in your browser while signed in to MadVibe.
 * Copy the returned token and paste it as the Bearer token
 * when configuring the MadVibe MCP server in Claude.ai.
 *
 * The token is your Convex session JWT — valid for up to 400 days
 * of activity (refreshed automatically on each MadVibe visit).
 */
export async function GET() {
  const token = await convexAuthNextjsToken();

  if (!token) {
    return Response.json(
      {
        error: "Not authenticated",
        hint: "Sign in to MadVibe first, then revisit this URL.",
      },
      { status: 401 }
    );
  }

  return Response.json({
    token,
    instructions: [
      "1. Copy the token value above",
      "2. In Claude.ai → Settings → Integrations → Add MCP Server",
      "3. URL: https://<your-domain>/api/mcp",
      "4. Auth: Bearer <paste token here>",
      "5. Save and start chatting with your MadVibe data",
    ],
    note: "Revisit this URL to get a fresh token if the old one expires.",
  });
}
