import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthRouteContext = {
  params: Promise<{
    auth: string[];
  }>;
};

const PROXIED_AUTH_PREFIXES = new Set(["signin", "callback"]);

function getConvexSiteUrl() {
  const convexSiteUrl = process.env.CONVEX_SITE_URL;

  if (!convexSiteUrl) {
    throw new Error("Missing environment variable `CONVEX_SITE_URL`.");
  }

  return convexSiteUrl.replace(/\/$/, "");
}

function isSupportedAuthRoute(authSegments: string[]) {
  return (
    authSegments.length >= 2 &&
    PROXIED_AUTH_PREFIXES.has(authSegments[0] ?? "")
  );
}

async function proxyAuthRequest(
  request: NextRequest,
  authSegments: string[]
) {
  if (!isSupportedAuthRoute(authSegments)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetUrl = new URL(
    `/api/auth/${authSegments.join("/")}`,
    getConvexSiteUrl()
  );
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");

  if (accept) {
    headers.set("accept", accept);
  }

  if (contentType) {
    headers.set("content-type", contentType);
  }

  if (cookie) {
    headers.set("cookie", cookie);
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
  });

  const responseHeaders = new Headers();
  const location = response.headers.get("location");
  const cacheControl = response.headers.get("cache-control");
  const contentLanguage = response.headers.get("content-language");
  const responseContentType = response.headers.get("content-type");
  const responseSetCookie =
    (
      response.headers as Headers & {
        getSetCookie?: () => string[];
      }
    ).getSetCookie?.() ?? [];

  if (location) {
    responseHeaders.set("location", location);
  }

  if (cacheControl) {
    responseHeaders.set("cache-control", cacheControl);
  }

  if (contentLanguage) {
    responseHeaders.set("content-language", contentLanguage);
  }

  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  if (responseSetCookie.length > 0) {
    for (const setCookie of responseSetCookie) {
      responseHeaders.append("set-cookie", setCookie);
    }
  } else {
    const fallbackSetCookie = response.headers.get("set-cookie");
    if (fallbackSetCookie) {
      responseHeaders.append("set-cookie", fallbackSetCookie);
    }
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: AuthRouteContext) {
  const { auth } = await context.params;
  return proxyAuthRequest(request, auth);
}

export async function POST(request: NextRequest, context: AuthRouteContext) {
  const { auth } = await context.params;
  return proxyAuthRequest(request, auth);
}
