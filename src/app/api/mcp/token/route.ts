import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { adminMutation } from "@/mcp/convex-admin";

/**
 * GET /api/mcp/token
 * Visit while signed in to MadVibe → generates a persistent API key.
 */
export async function GET() {
  const sessionToken = await convexAuthNextjsToken();
  if (!sessionToken) {
    return Response.json(
      { error: "Not authenticated", hint: "Sign in to MadVibe first." },
      { status: 401 }
    );
  }

  // Identify current user using their session JWT
  const userClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  userClient.setAuth(sessionToken);
  const user = await userClient.query(api.workspaces.getCurrentUser, {});
  if (!user) {
    return Response.json({ error: "Could not resolve user" }, { status: 401 });
  }

  // Generate persistent key via internal mutation (deploy key)
  const plainKey = await adminMutation("mcpService:generateApiKey", {
    userId: String(user._id),
  }) as string;

  const baseUrl =
    process.env.SITE_URL ??
    process.env.CUSTOM_AUTH_SITE_URL ??
    "https://your-app.vercel.app";

  const connectorUrl = `${baseUrl}/api/mcp?key=${plainKey}`;

  return Response.json({
    connectorUrl,
    apiKey: plainKey,
    note: "This key never expires. Visit this URL again to rotate it.",
    instructions: [
      "1. Copy connectorUrl (full URL including ?key=...)",
      "2. Claude.ai → Settings → Connectors → Add custom connector",
      "3. Name: MadVibe | URL: paste connectorUrl | OAuth fields: leave blank",
      "4. Click Add",
    ],
  });
}
