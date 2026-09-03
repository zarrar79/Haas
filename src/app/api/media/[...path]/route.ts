import { NextResponse } from "next/server";

import { getServerConfig } from "@/lib/server-config";
import { readMediaFromNfs, toMediaRelativePath } from "@/lib/nfs-media";
import { getSessionToken } from "@/lib/session-cookie";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

/**
 * Serve team/user images from NFS (cyberrange/uploads → /mnt/shared/uploads),
 * matching user-blue-team pictures.getPicture disk-first strategy.
 */
export async function GET(_request: Request, context: RouteContext) {
  const token = await getSessionToken();
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path: parts } = await context.params;
  if (!parts?.length) {
    return new NextResponse("No path provided", { status: 400 });
  }

  const joined = parts.join("/");
  const fromNfs = readMediaFromNfs(joined);
  if (fromNfs) {
    return new NextResponse(new Uint8Array(fromNfs.buffer), {
      status: 200,
      headers: {
        "Content-Type": fromNfs.contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  // Soft fallback: Django MEDIA_URL (/uploads/...) when DEBUG static serve is on
  try {
    const relative = toMediaRelativePath(joined);
    if (relative) {
      const { backendBaseUrl } = getServerConfig();
      const djangoUrl = `${backendBaseUrl.replace(/\/$/, "")}/uploads/${relative}`;
      const djangoResponse = await fetch(djangoUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (djangoResponse.ok) {
        const buffer = await djangoResponse.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type":
              djangoResponse.headers.get("content-type") || "image/jpeg",
            "Cache-Control": "private, max-age=60",
          },
        });
      }
    }
  } catch {
    /* soft miss */
  }

  return new NextResponse("Image not found", { status: 404 });
}
