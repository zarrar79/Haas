/**
 * Client-safe helpers to load media via the Haas BFF NFS proxy
 * (same strategy as user-blue-team pictures.getPicture).
 */

/** Normalize any media path/URL into `/api/media/uploads/...`. */
export function resolveMediaProxyUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return null;
  let p = pathOrUrl.trim();
  if (!p) return null;

  // Local previews stay as-is
  if (p.startsWith("blob:") || p.startsWith("data:")) return p;

  // Already proxied
  if (p.startsWith("/api/media/")) return p;

  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      p = new URL(p).pathname;
    } catch {
      return null;
    }
  }

  p = p.replace(/^\/+/, "");

  if (p.startsWith("media/uploads/")) {
    p = p.slice("media/".length);
  } else if (p.startsWith("media/")) {
    p = `uploads/${p.slice("media/".length)}`;
  }

  while (p.startsWith("uploads/uploads/")) {
    p = p.slice("uploads/".length);
  }

  if (!p.startsWith("uploads/")) {
    p = `uploads/${p}`;
  }

  return `/api/media/${p}`;
}
