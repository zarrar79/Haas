/** Best-effort client IP from proxy headers (for Django rate limits / audit). */
export function getClientIpAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstHop = forwardedFor.split(",")[0]?.trim();
    if (firstHop) return firstHop;
  }

  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

/** Forward the browser query string to Django unchanged. */
export function getQueryString(request: Request): string {
  const url = new URL(request.url);
  return url.search; // includes leading "?" or empty string
}
