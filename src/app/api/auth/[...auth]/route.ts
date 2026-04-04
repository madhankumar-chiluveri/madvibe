import { fetchAction } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthRouteContext = {
  params: Promise<{
    auth: string[];
  }>;
};

const PROXIED_AUTH_PREFIXES = new Set(["signin", "callback"]);
const ALLOWED_GOOGLE_PROMPTS = new Set(["select_account"]);

function getConvexSiteUrl() {
  const convexSiteUrl = process.env.CONVEX_SITE_URL?.trim();

  if (convexSiteUrl) {
    return convexSiteUrl.replace(/\/$/, "");
  }

  const publicConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

  if (publicConvexUrl) {
    const derivedSiteUrl = publicConvexUrl.replace(
      /\.convex\.cloud\/?$/,
      ".convex.site"
    );

    if (derivedSiteUrl !== publicConvexUrl) {
      return derivedSiteUrl;
    }
  }

  throw new Error(
    "Missing `CONVEX_SITE_URL`, and `NEXT_PUBLIC_CONVEX_URL` could not be used to derive it."
  );
}

function isSupportedAuthRoute(authSegments: string[]) {
  return (
    authSegments.length >= 2 &&
    PROXIED_AUTH_PREFIXES.has(authSegments[0] ?? "")
  );
}

function getCookiePrefix(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" ? "" : "__Host-";
}

function getAuthTokenFromRequest(request: NextRequest) {
  const tokenName = `${getCookiePrefix(request)}__convexAuthJWT`;
  return request.cookies.get(tokenName)?.value;
}

function getSafeRedirectTarget(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirectTo");

  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return undefined;
  }

  return redirectTo;
}

function getSafeGoogleLoginHint(request: NextRequest) {
  const loginHint = request.nextUrl.searchParams.get("login_hint")?.trim();

  if (!loginHint) {
    return undefined;
  }

  if (loginHint.length > 320 || /[\r\n]/.test(loginHint)) {
    return undefined;
  }

  return loginHint;
}

function getSafeGooglePrompt(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get("prompt")?.trim();

  if (!prompt) {
    return undefined;
  }

  if (!ALLOWED_GOOGLE_PROMPTS.has(prompt)) {
    return undefined;
  }

  return prompt;
}

async function proxyAuthRequest(
  request: NextRequest,
  authSegments: string[]
) {
  if (!isSupportedAuthRoute(authSegments)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    authSegments[0] === "signin" &&
    !request.nextUrl.searchParams.get("code")
  ) {
    const provider = authSegments[1];
    const redirectTo = getSafeRedirectTarget(request);
    const loginHint =
      provider === "google" ? getSafeGoogleLoginHint(request) : undefined;
    const prompt =
      provider === "google" ? getSafeGooglePrompt(request) : undefined;
    const token = getAuthTokenFromRequest(request);

    try {
      const result = await fetchAction(
        api.auth.signIn,
        {
          provider,
          params: redirectTo ? { redirectTo } : {},
          calledBy: "nextjs-api-auth-route",
        },
        token ? { token } : {}
      );

      if (!result.redirect || !result.verifier) {
        throw new Error("OAuth sign-in did not return a redirect and verifier.");
      }

      const providerRedirectUrl = new URL(result.redirect);

      if (loginHint) {
        providerRedirectUrl.searchParams.set("login_hint", loginHint);
      }

      if (prompt) {
        providerRedirectUrl.searchParams.set("prompt", prompt);
      }

      const redirectResponse = NextResponse.redirect(providerRedirectUrl);
      redirectResponse.cookies.set(
        `${getCookiePrefix(request)}__convexAuthOAuthVerifier`,
        result.verifier,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: getCookiePrefix(request) === "__Host-",
          path: "/",
        }
      );

      return redirectResponse;
    } catch (error) {
      console.error("Auth proxy sign-in bootstrap failed", error);

      return NextResponse.json(
        {
          error:
            "Could not bootstrap Google sign-in. Check that NEXT_PUBLIC_CONVEX_URL points at the active production deployment.",
        },
        { status: 500 }
      );
    }
  }

  try {
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
  } catch (error) {
    console.error("Auth proxy request failed", error);

    return NextResponse.json(
      {
        error:
          "The auth proxy could not reach the configured Convex auth routes. Check that `CONVEX_SITE_URL` matches the same deployment as `NEXT_PUBLIC_CONVEX_URL`.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: AuthRouteContext) {
  const { auth } = await context.params;
  return proxyAuthRequest(request, auth);
}

export async function POST(request: NextRequest, context: AuthRouteContext) {
  const { auth } = await context.params;
  return proxyAuthRequest(request, auth);
}
