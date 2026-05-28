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

  const baseUrl =
    process.env.SITE_URL ??
    process.env.CUSTOM_AUTH_SITE_URL ??
    "https://your-app.vercel.app";

  const connectorUrl = `${baseUrl}/api/mcp?token=${token}`;

  return Response.json({
    connectorUrl,
    instructions: [
      "1. Copy the 'connectorUrl' value above (the full URL including ?token=...)",
      "2. In Claude.ai → Settings → Connectors → Add custom connector",
      "3. Name: MadVibe",
      "4. URL: <paste connectorUrl here>",
      "5. Leave OAuth fields blank — token is embedded in the URL",
      "6. Click Add",
    ],
    note: "Revisit this URL to get a fresh connector URL if yours expires.",
    token,
  });
}
