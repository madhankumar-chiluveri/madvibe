/**
 * Convex admin API client.
 * Calls internal queries/mutations using the deploy key via the Convex HTTP API.
 * ConvexHttpClient.setAuth() only accepts user JWTs — deploy key requires raw fetch.
 */

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY!;

async function convexCall(
  type: "query" | "mutation",
  path: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${CONVEX_URL}/api/${type}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${DEPLOY_KEY}`,
    },
    body: JSON.stringify({ path, args, format: "json" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ${type} ${path} failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  // Convex HTTP API wraps result in { status: "success", value: ... }
  if (json.status === "error") throw new Error(json.errorMessage ?? "Convex error");
  return json.value;
}

export const adminQuery = (path: string, args: Record<string, unknown>) =>
  convexCall("query", path, args);

export const adminMutation = (path: string, args: Record<string, unknown>) =>
  convexCall("mutation", path, args);
