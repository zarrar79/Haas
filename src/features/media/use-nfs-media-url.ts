"use client";

import { useEffect, useState } from "react";

import { resolveMediaProxyUrl } from "@/lib/media-url";

/**
 * Load a stored media path via the NFS BFF proxy (same idea as
 * user-blue-team `pictures.getPicture`), returning a blob: URL.
 * Local blob:/data: previews are returned as-is.
 */
export function useNfsMediaUrl(pathOrUrl: string | null | undefined): {
  url: string | null;
  loading: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    if (!pathOrUrl) {
      setUrl(null);
      setLoading(false);
      return;
    }

    if (pathOrUrl.startsWith("blob:") || pathOrUrl.startsWith("data:")) {
      setUrl(pathOrUrl);
      setLoading(false);
      return;
    }

    const proxyUrl = resolveMediaProxyUrl(pathOrUrl);
    if (!proxyUrl) {
      setUrl(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setUrl(null);

    void fetch(proxyUrl, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Media fetch failed (${response.status})`);
        const blob = await response.blob();
        if (cancelled) return;
        createdObjectUrl = URL.createObjectURL(blob);
        setUrl(createdObjectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [pathOrUrl]);

  return { url, loading };
}
