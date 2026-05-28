import { TOOL_DEFINITIONS } from "@/mcp/tools";

// GET /api/openapi.json
// OpenAPI 3.1 spec for ChatGPT Custom GPT Actions.
// Point your Custom GPT's "Schema" URL here.
export async function GET() {
  const baseUrl = process.env.SITE_URL ?? process.env.CUSTOM_AUTH_SITE_URL ?? "https://your-app.vercel.app";

  const paths: Record<string, unknown> = {};

  for (const tool of TOOL_DEFINITIONS) {
    paths[`/api/tools/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.description,
        requestBody: {
          required: Object.keys(tool.inputSchema.properties).length > 0,
          content: {
            "application/json": {
              schema: tool.inputSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { type: "object" },
              },
            },
          },
          "401": { description: "Unauthorized — missing or invalid Bearer token" },
          "500": { description: "Tool execution error" },
        },
        security: [{ BearerAuth: [] }],
      },
    };
  }

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "MadVibe API",
      version: "1.0.0",
      description:
        "Access your MadVibe personal knowledge OS: pages, finance, habits, reminders, and news.",
    },
    servers: [{ url: baseUrl }],
    paths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Get your token by visiting /api/mcp/token while signed in to MadVibe",
        },
      },
    },
  };

  return Response.json(spec, {
    headers: { "Content-Type": "application/json" },
  });
}
