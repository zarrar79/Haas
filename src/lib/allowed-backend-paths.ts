import "server-only";

/**
 * HAS may only talk to Django for:
 * - user/login/  (auth)
 * - haas/**      (HaaS admin API)
 */
export function assertAllowedBackendPath(path: string): void {
  const normalized = path
    .replace(/^\//, "")
    .split("?")[0]
    ?.replace(/\/+$/, "") ?? "";

  if (normalized === "user/login") {
    return;
  }

  if (normalized === "haas" || normalized.startsWith("haas/")) {
    return;
  }

  throw new Error(
    `Backend path not allowed: "${path}". Only user/login/ and haas/* are permitted.`,
  );
}
