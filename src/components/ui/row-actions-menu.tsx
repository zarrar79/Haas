"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BiDotsVerticalRounded } from "react-icons/bi";

export type RowActionItem = {
  id: string;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
  hidden?: boolean;
};

type RowActionsMenuProps = {
  items: RowActionItem[];
  /** Accessible label for the trigger button */
  label?: string;
};

const MENU_WIDTH = 180;
const VIEWPORT_PADDING = 8;
const ITEM_HEIGHT = 36;

type MenuPosition = { top: number; left: number };

function computeMenuPosition(
  rect: DOMRect,
  menuHeight: number,
): MenuPosition {
  let left = rect.right - MENU_WIDTH;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
  );

  const gap = 4;
  let top = rect.bottom + gap;

  if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    const aboveTop = rect.top - gap - menuHeight;
    if (aboveTop >= VIEWPORT_PADDING) {
      top = aboveTop;
    } else {
      top = Math.max(
        VIEWPORT_PADDING,
        window.innerHeight - menuHeight - VIEWPORT_PADDING,
      );
    }
  }

  return { top, left };
}

function positionsEqual(a: MenuPosition, b: MenuPosition) {
  return a.top === b.top && a.left === b.left;
}

export function RowActionsMenu({
  items,
  label = "Row actions",
}: RowActionsMenuProps) {
  const visibleCount = items.filter((item) => !item.hidden).length;
  const visible = items.filter((item) => !item.hidden);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const applyPosition = useCallback(
    (useMeasuredHeight: boolean) => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const estimatedHeight = visibleCount * ITEM_HEIGHT + 8;
      const menuHeight = useMeasuredHeight
        ? menuRef.current?.offsetHeight ?? estimatedHeight
        : estimatedHeight;
      const next = computeMenuPosition(rect, menuHeight);
      setMenuPos((prev) => (positionsEqual(prev, next) ? prev : next));
    },
    [visibleCount],
  );

  useLayoutEffect(() => {
    if (!open) return;
    applyPosition(false);
    const frame = requestAnimationFrame(() => applyPosition(true));
    return () => cancelAnimationFrame(frame);
  }, [open, applyPosition]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => applyPosition(true);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, applyPosition]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-row-actions-menu]")
      ) {
        return;
      }
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (visibleCount === 0) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            data-row-actions-menu
            className="fixed z-[200] max-h-[min(60vh,320px)] min-w-[180px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
            style={{ top: menuPos.top, left: menuPos.left }}
            role="menu"
          >
            {visible.map((item) => {
              const className = `flex w-full items-center px-3 py-2 text-left text-sm font-medium transition ${
                item.disabled
                  ? "cursor-not-allowed opacity-50"
                  : item.destructive
                    ? "text-[var(--danger)] hover:bg-[var(--danger-muted)]"
                    : "text-[var(--text)] hover:bg-[var(--surface-hover)]"
              }`;
              if (item.href && !item.disabled) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    className={className}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={className}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-muted)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <BiDotsVerticalRounded className="text-lg" aria-hidden />
      </button>
      {menu}
    </div>
  );
}
