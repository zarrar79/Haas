/**
 * Browser-safe helper.
 * Talks only to same-origin /api/* — never to the Django host.
 */

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
};

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.httpStatus === 401;
}

export function redirectIfUnauthorized(
  error: unknown,
  router: { replace: (href: string) => void },
): boolean {
  if (!isUnauthorizedError(error)) return false;
  router.replace("/login");
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
  const { body, headers: optionHeaders, ...requestInit } = options;
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

  if (!response.ok) {
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : `Request failed (${response.status})`;

    throw new ApiRequestError(message, response.status, parsed);
  }

  return parsed as T;
}
