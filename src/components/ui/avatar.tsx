"use client";

import { useNfsMediaUrl } from "@/features/media/use-nfs-media-url";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  rounded?: "full" | "md";
  /**
   * Load stored media via NFS BFF (default true).
   * Matches user-blue-team pictures.getPicture → blob display.
   */
  useNfs?: boolean;
};

const SIZE_CLASS = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-lg",
} as const;

function initialsFromName(name?: string | null) {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function Avatar({
  src,
  name,
  size = "md",
  className = "",
  rounded = "full",
  useNfs = true,
}: AvatarProps) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-[var(--radius-sm)]";
  const base = `${SIZE_CLASS[size]} shrink-0 ${radius} border border-[var(--border)] ${className}`;

  const isLocalPreview =
    Boolean(src) && (src!.startsWith("blob:") || src!.startsWith("data:"));
  const { url: nfsUrl } = useNfsMediaUrl(useNfs && !isLocalPreview ? src : null);
  const resolved = isLocalPreview ? src : useNfs ? nfsUrl : src;

  if (resolved) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt=""
        className={`${base} object-cover bg-[var(--surface-raised)]`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center border-[var(--border-strong)] bg-[var(--accent-muted)] font-bold text-[var(--accent)] ${base}`}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}
