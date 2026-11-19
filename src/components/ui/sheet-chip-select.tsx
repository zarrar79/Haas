"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type ChipOption = {
  value: string;
  /** Tailwind-friendly background + text classes, e.g. "bg-green-700 text-white" */
  className: string;
};

type SheetChipSelectProps = {
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
  onCommit?: (value?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  allowCreate?: boolean;
  createLabel?: string;
};

function toneForUnknown(value: string): string {
  const tones = [
    "bg-slate-600 text-white",
    "bg-cyan-700 text-white",
    "bg-teal-700 text-white",
    "bg-indigo-700 text-white",
    "bg-fuchsia-700 text-white",
    "bg-rose-700 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return tones[hash % tones.length];
}

export function chipClassForValue(
  value: string,
  options: ChipOption[],
): string {
  const found = options.find(
    (o) => o.value.toLowerCase() === value.trim().toLowerCase(),
  );
  if (found) return found.className;
  if (!value.trim()) return "bg-transparent text-[var(--text-muted)]";
  return toneForUnknown(value.trim());
}

/**
 * Google-Sheet-style colored chip dropdown: pick a suggestion or type a new value.
 */
export function SheetChipSelect({
  value,
  options,
  onChange,
  onCommit,
  disabled = false,
  placeholder = "Select…",
  allowCreate = true,
  createLabel = "Add",
}: SheetChipSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selectedTone = chipClassForValue(value, options);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.value.toLowerCase().includes(q));
  }, [options, query]);

  const canCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !options.some((o) => o.value.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open || !rootRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocPointerDown(e: MouseEvent | PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery("");
      onCommit?.();
    }

    // Capture phase so we can ignore menu clicks before anything else closes.
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [open, onCommit]);

  function pick(next: string) {
    const cleaned = next.trim();
    if (!cleaned) return;
    onChange(cleaned);
    setOpen(false);
    setQuery("");
    // Pass value so parent can commit without waiting for a re-render.
    onCommit?.(cleaned);
  }

  return (
    <div ref={rootRef} className="relative h-full min-h-[2.5rem] w-full">
      <button
        type="button"
        disabled={disabled}
        className="flex h-full min-h-[2.5rem] w-full items-center gap-1 px-2 py-1 text-left outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)] disabled:opacity-60"
        onClick={() => {
          if (disabled) return;
          setOpen((wasOpen) => {
            const next = !wasOpen;
            if (next) {
              setQuery("");
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }
            return next;
          });
        }}
      >
        {value.trim() ? (
          <span
            className={`inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ${selectedTone}`}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">{placeholder}</span>
        )}
      </button>

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--surface)] shadow-lg"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
              }}
              onPointerDown={(e) => {
                // Keep focus/selection inside the menu; don't treat as outside click.
                e.stopPropagation();
              }}
            >
              <div className="border-b border-[var(--border)] p-2">
                <input
                  ref={inputRef}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                  placeholder="Search or type new…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setOpen(false);
                      setQuery("");
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (canCreate) pick(query.trim());
                      else if (filtered[0]) pick(filtered[0].value);
                    }
                  }}
                />
              </div>
              <ul className="max-h-56 overflow-y-auto p-1">
                {filtered.map((opt) => {
                  const active =
                    opt.value.toLowerCase() === value.trim().toLowerCase();
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-[var(--bg)] ${
                          active ? "bg-[var(--bg)]" : ""
                        }`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          pick(opt.value);
                        }}
                      >
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.className}`}
                        >
                          {opt.value}
                        </span>
                        {active ? (
                          <span className="ml-auto text-xs text-[var(--accent)]">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {canCreate ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-[var(--bg)]"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        pick(query.trim());
                      }}
                    >
                      <span className="text-[var(--text-muted)]">
                        {createLabel}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneForUnknown(query.trim())}`}
                      >
                        {query.trim()}
                      </span>
                    </button>
                  </li>
                ) : null}
                {!filtered.length && !canCreate ? (
                  <li className="px-2 py-2 text-sm text-[var(--text-muted)]">
                    No matches
                  </li>
                ) : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
