import "server-only";

import fs from "fs";
import path from "path";

/**
 * Resolve media roots the same way as user-blue-team:
 * NFS / shared mount first (DJ_MEDIA_ROOT or cyberrange/uploads → /mnt/shared/uploads).
 */
export function getMediaRoots(): string[] {
  const roots = [
    process.env.DJ_MEDIA_ROOT,
    process.env.UPLOADS_PATH,
    path.resolve(process.cwd(), "../cyberrange/uploads"),
    path.resolve(process.cwd(), "uploads"),
  ].filter((root): root is string => Boolean(root && root.trim()));

  const resolved: string[] = [];
  for (const root of roots) {
    const absolute = path.resolve(root);
    if (!resolved.includes(absolute)) resolved.push(absolute);
  }
  return resolved;
}

/** Strip URL / uploads / media prefixes to a path under MEDIA_ROOT (e.g. images/foo.png). */
export function toMediaRelativePath(imagePath: string): string | null {
  let p = imagePath.trim();
  if (!p) return null;

  if (p.startsWith("http://") || p.startsWith("https://")) {
    try {
      p = new URL(p).pathname;
    } catch {
      return null;
    }
  }

  p = p.replace(/^\/+/, "");
  if (p.startsWith("media/uploads/")) p = p.slice("media/uploads/".length);
  else if (p.startsWith("uploads/")) p = p.slice("uploads/".length);
  else if (p.startsWith("media/")) p = p.slice("media/".length);

  if (!p || p.includes("..")) return null;
  return p;
}

export function contentTypeFromExt(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export function readMediaFromNfs(
  imagePath: string,
): { buffer: Buffer; contentType: string; fullPath: string } | null {
  const relative = toMediaRelativePath(imagePath);
  if (!relative) return null;

  for (const root of getMediaRoots()) {
    const resolvedRoot = path.resolve(root);
    const fullPath = path.resolve(resolvedRoot, relative);
    if (
      !fullPath.startsWith(resolvedRoot + path.sep) &&
      fullPath !== resolvedRoot
    ) {
      continue;
    }
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      continue;
    }
    return {
      buffer: fs.readFileSync(fullPath),
      contentType: contentTypeFromExt(fullPath),
      fullPath,
    };
  }
  return null;
}
