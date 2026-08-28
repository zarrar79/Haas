"use client";

import { useState } from "react";

type CopyableTextProps = {
  value?: string | null;
  className?: string;
  mono?: boolean;
  maxWidthClass?: string;
};

export function CopyableText({
  value,
  className = "",
  mono = false,
  maxWidthClass = "max-w-[220px]",
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-[var(--text-muted)]">—</span>;
  }

  const text = value;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      title={copied ? "Copied to clipboard" : text}
      aria-label={copied ? "Copied to clipboard" : `Copy: ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        void onCopy();
      }}
      className={`block ${maxWidthClass} truncate text-left text-xs transition hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${mono ? "font-mono" : ""} ${copied ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} ${className}`}
    >
      {copied ? "Copied!" : value}
    </button>
  );
}
