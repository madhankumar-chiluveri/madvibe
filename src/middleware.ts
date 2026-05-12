import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { DEFAULT_WORKSPACE_ROUTE } from "@/lib/routes";
import { PERSISTENT_AUTH_COOKIE_MAX_AGE_SECONDS } from "../shared/auth-session";

const isRootRoute = createRouteMatcher("/");
const isLoginRoute = createRouteMatcher("/login");
const isWorkspaceRoute = createRouteMatcher("/workspace(.*)");

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (!isRootRoute(request) && !isLoginRoute(request) && !isWorkspaceRoute(request)) {
    return;
  }

  // Avoid a hard dependency on the backend auth:isAuthenticated export here.
  // The auth middleware has already refreshed/validated cookies before this runs.
  const isAuthenticated = Boolean(await convexAuth.getToken());

  if (isRootRoute(request)) {
    return nextjsMiddlewareRedirect(
      request,
      isAuthenticated ? DEFAULT_WORKSPACE_ROUTE : "/login"
    );
  }

  if (isLoginRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, DEFAULT_WORKSPACE_ROUTE);
  }

  if (isWorkspaceRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
}, {
  cookieConfig: {
    maxAge: PERSISTENT_AUTH_COOKIE_MAX_AGE_SECONDS,
  },
  shouldHandleCode: (request) => !request.nextUrl.pathname.startsWith("/api/auth/"),
});

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|manifest.json|icons|sw.js).*)",
  ],
};
