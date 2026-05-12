// Browsers cap long-lived first-party cookies to roughly 400 days, so use
// that as the sliding inactivity window and keep the backend session longer.
export const PERSISTENT_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
export const PERSISTENT_AUTH_INACTIVE_DURATION_MS =
  PERSISTENT_AUTH_COOKIE_MAX_AGE_SECONDS * 1000;
export const PERSISTENT_AUTH_TOTAL_DURATION_MS =
  1000 * 60 * 60 * 24 * 365 * 10;

const PERSISTENT_AUTH_COOKIE_SUFFIXES = [
  "__convexAuthJWT",
  "__convexAuthRefreshToken",
] as const;

function getCookieName(setCookie: string) {
  const equalsIndex = setCookie.indexOf("=");
  return equalsIndex === -1
    ? setCookie.trim()
    : setCookie.slice(0, equalsIndex).trim();
}

function isPersistentAuthCookie(cookieName: string) {
  return PERSISTENT_AUTH_COOKIE_SUFFIXES.some(
    (suffix) => cookieName === suffix || cookieName.endsWith(suffix),
  );
}

function isCookieDeletion(setCookie: string) {
  return (
    /;\s*max-age=0(?:;|$)/i.test(setCookie) ||
    /;\s*expires=\s*(?:Thu,\s*01 Jan 1970 00:00:00 GMT|0)(?:;|$)/i.test(
      setCookie,
    )
  );
}

export function applyPersistentAuthCookieLifetime(setCookie: string) {
  const cookieName = getCookieName(setCookie);
  if (!isPersistentAuthCookie(cookieName) || isCookieDeletion(setCookie)) {
    return setCookie;
  }

  const expires = new Date(
    Date.now() + PERSISTENT_AUTH_INACTIVE_DURATION_MS,
  ).toUTCString();

  const withoutLifetime = setCookie
    .replace(/;\s*max-age=[^;]*/gi, "")
    .replace(/;\s*expires=[^;]*/gi, "");

  return `${withoutLifetime}; Max-Age=${PERSISTENT_AUTH_COOKIE_MAX_AGE_SECONDS}; Expires=${expires}`;
}

export function splitSetCookieHeader(setCookieHeader: string) {
  return setCookieHeader
    .split(/,(?=\s*[^=;,\s]+=)/g)
    .map((part) => part.trim())
    .filter(Boolean);
}
