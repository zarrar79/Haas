import { cookies } from "next/headers";

/** HttpOnly cookie that stores the Django JWT on the BFF.
 *  Same name/flags as dashboard-clone so both apps share the session on one host. */
export const SESSION_COOKIE_NAME = "session_token";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

/** Hostnames only. IP Domain attributes are rejected by many browsers;
 *  host-only cookies already apply to every port on that IP. */
function getCookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  if (!domain) return undefined;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain)) return undefined;
  return domain;
}

export function getSessionCookieOptions() {
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isCookieSecure(),
    maxAge: SESSION_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {}),
  };
}

export function getClearedSessionCookieOptions() {
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isCookieSecure(),
    maxAge: 0,
    ...(domain ? { domain } : {}),
  };
}

/** Read the Django access token from the HttpOnly cookie. */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
