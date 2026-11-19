"use client";

import { useState } from "react";

import { FORM_CONTROL_CLASS } from "@/components/ui/form-control";
import { MarkdownContent } from "@/components/ui/markdown-content";

/** Editable markdown textarea with a Write / Preview toggle. */
export function MarkdownField({
  label,
  value,
  onChange,
  className = "",
  controlClassName = "",
  placeholder = "Supports markdown — **bold**, `code`, lists, links, tables…",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  controlClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState(false);
  const tab = (active: boolean) =>
    `rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium ${
      active
        ? "bg-[var(--accent)]/15 text-[var(--text)]"
        : "text-[var(--text-muted)] hover:text-[var(--text)]"
    }`;
  return (
    <div className={`flex flex-col gap-1.5 text-sm ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-[var(--text)]">{label}</span>
        <div className="flex gap-1">
          <button
            type="button"
            className={tab(!preview)}
            onClick={() => setPreview(false)}
          >
            Write
          </button>
          <button
            type="button"
            className={tab(preview)}
            onClick={() => setPreview(true)}
          >
            Preview
          </button>
        </div>
      </div>
      {preview ? (
        <div className={`${FORM_CONTROL_CLASS} ${controlClassName}`.trim()}>
          {value.trim() ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <span className="text-[var(--text-muted)]">Nothing to preview</span>
          )}
        </div>
      ) : (
        <textarea
          className={`${FORM_CONTROL_CLASS} ${controlClassName}`.trim()}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
