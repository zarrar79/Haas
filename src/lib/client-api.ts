/**
 * Browser-safe helper.
 * Talks only to same-origin /api/* — never to the Django host.
 */

import { hardReloadApplication } from "@/lib/client-session";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type CallAppApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Skip the global expired-session redirect (e.g. login/logout). */
  skipAuthRedirect?: boolean;
};

const AUTH_FAILURE_MESSAGE_RE =
  /token_not_valid|token is expired|invalid or expired token|given token not valid|not authenticated|authentication credentials|authentication required|session has expired|session superseded|signed in on another device|unauthorized/i;

let redirectingToLogin = false;

function bodyCode(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("code" in body)) {
    return undefined;
  }
  const code = (body as { code: unknown }).code;
  if (typeof code === "string" || typeof code === "number") {
    return String(code);
  }
  return undefined;
}

function bodyMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  if (
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return undefined;
}

/** True when status/body/message indicate an expired or invalid session. */
export function isAuthFailure(
  status: number,
  message?: string,
  body?: unknown,
): boolean {
  if (status === 401) return true;
  const code = bodyCode(body);
  if (code === "401" || code === "unauthorized" || code === "token_not_valid") {
    return true;
  }
  if (message && AUTH_FAILURE_MESSAGE_RE.test(message)) return true;
  const nested = bodyMessage(body);
  if (nested && AUTH_FAILURE_MESSAGE_RE.test(nested)) return true;
  return false;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  return isAuthFailure(error.httpStatus, error.message, error.body);
}

/**
 * Clear the HttpOnly session cookie and hard-reload to /login.
 * Safe to call multiple times; no-ops on the login page.
 */
export function handleClientUnauthorized(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  if (redirectingToLogin) return;
  redirectingToLogin = true;

  // keepalive so the cookie clear can finish during navigation/unload.
  void fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    /* cookie clear is best-effort */
  });

  hardReloadApplication("/login");
}

export function redirectIfUnauthorized(
  error: unknown,
  _router?: { replace: (href: string) => void },
): boolean {
  if (!isUnauthorizedError(error)) return false;
  handleClientUnauthorized();
  return true;
}

export function toErrorMessage(
  error: unknown,
  fallback = "Request failed",
): string {
  return error instanceof Error ? error.message : fallback;
}

export async function callAppApi<T>(
  path: string,
  options: CallAppApiOptions = {},
): Promise<T> {
  const {
    body,
    headers: optionHeaders,
    skipAuthRedirect = false,
    ...requestInit
  } = options;
  const headers = new Headers(optionHeaders);

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  // Next.js redirects `/api/foo/` → `/api/foo` (308). Following that redirect
  // drops PATCH/POST bodies, so activate/deactivate and other writes no-op.
  let url = path.startsWith("/") ? path : `/api/${path}`;
  const qIndex = url.indexOf("?");
  if (qIndex === -1) {
    if (url.length > 1 && url.endsWith("/")) url = url.slice(0, -1);
  } else {
    const base = url.slice(0, qIndex);
    const query = url.slice(qIndex);
    url =
      (base.length > 1 && base.endsWith("/") ? base.slice(0, -1) : base) +
      query;
  }

  const response = await fetch(url, {
    ...requestInit,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
    credentials: "same-origin",
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  const message =
    bodyMessage(parsed) ??
    (typeof parsed === "string" && parsed ? parsed : null) ??
    `Request failed (${response.status})`;

  const authFailed = isAuthFailure(response.status, message, parsed);

  // BFF may return HTTP 200 with { ok: false } for some backend envelopes —
  // treat those as failures too when the payload says so.
  const payloadOkFalse =
    typeof parsed === "object" &&
    parsed !== null &&
    "ok" in parsed &&
    (parsed as { ok: unknown }).ok === false;

  if (!response.ok || payloadOkFalse || authFailed) {
    const httpStatus = authFailed
      ? 401
      : !response.ok
        ? response.status
        : 400;

    if (authFailed && !skipAuthRedirect) {
      handleClientUnauthorized();
    }

    throw new ApiRequestError(message, httpStatus, parsed);
  }

  return parsed as T;
}
