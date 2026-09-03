"use client";

import { useEffect, useId, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  currentUrl?: string | null;
  name?: string | null;
  file: File | null;
  clearRequested: boolean;
  onFileChange: (file: File | null) => void;
  onClearChange: (clear: boolean) => void;
  rounded?: "full" | "md";
  disabled?: boolean;
};

export function ImageUploadField({
  label = "Image",
  currentUrl,
  name,
  file,
  clearRequested,
  onFileChange,
  onClearChange,
  rounded = "full",
  disabled,
}: Props) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const displayUrl = clearRequested ? null : previewUrl || currentUrl || null;
  const hasImage = Boolean(displayUrl || (!clearRequested && currentUrl));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--text)]">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={displayUrl} name={name} size="lg" rounded={rounded} />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-hover)] ${
              disabled ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {hasImage ? "Change image" : "Upload image"}
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                onFileChange(next);
                if (next) onClearChange(false);
                e.target.value = "";
              }}
            />
          </label>
          {hasImage || clearRequested ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                onClearChange(true);
              }}
            >
              Remove
            </Button>
          ) : null}
          {file || clearRequested ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                onClearChange(false);
              }}
            >
              Undo
            </Button>
          ) : null}
        </div>
      </div>
      {file ? (
        <p className="text-xs text-[var(--text-muted)]">Selected: {file.name}</p>
      ) : clearRequested ? (
        <p className="text-xs text-[var(--text-muted)]">Image will be removed on save.</p>
      ) : null}
    </div>
  );
}
