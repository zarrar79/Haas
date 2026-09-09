"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BiBell,
  BiDotsVerticalRounded,
  BiFullscreen,
  BiLogOut,
  BiMoon,
  BiSun,
} from "react-icons/bi";

type HeaderOverflowMenuProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNotifications: () => void;
  onFullscreen?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

const MENU_WIDTH = 220;
const VIEWPORT_PADDING = 8;

type MenuPosition = { top: number; left: number };

function computeMenuPosition(rect: DOMRect, menuHeight: number): MenuPosition {
  let left = rect.right - MENU_WIDTH;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
  );

  const gap = 6;
  let top = rect.bottom + gap;
  if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(
      VIEWPORT_PADDING,
      rect.top - gap - menuHeight,
    );
  }
  return { top, left };
}

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-[var(--text)] transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50";

export function HeaderOverflowMenu({
  theme,
  onToggleTheme,
  onNotifications,
  onFullscreen,
  onLogout,
  isLoggingOut,
}: HeaderOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const applyPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const height = menuRef.current?.offsetHeight ?? 200;
    setMenuPos(computeMenuPosition(el.getBoundingClientRect(), height));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    applyPosition();
    const frame = requestAnimationFrame(applyPosition);
    return () => cancelAnimationFrame(frame);
  }, [open, applyPosition]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => applyPosition();
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
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] min-w-[220px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]"
            style={{ top: menuPos.top, left: menuPos.left }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASS}
              onClick={() => {
                setOpen(false);
                onNotifications();
              }}
            >
              <BiBell className="text-lg text-[var(--text-muted)]" />
              Notifications
            </button>
            <button
              type="button"
              role="menuitem"
              className={ITEM_CLASS}
              onClick={() => {
                onToggleTheme();
                setOpen(false);
              }}
            >
              {theme === "dark" ? (
                <BiSun className="text-lg text-[var(--text-muted)]" />
              ) : (
                <BiMoon className="text-lg text-[var(--text-muted)]" />
              )}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {onFullscreen ? (
              <button
                type="button"
                role="menuitem"
                className={ITEM_CLASS}
                onClick={() => {
                  onFullscreen();
                  setOpen(false);
                }}
              >
                <BiFullscreen className="text-lg text-[var(--text-muted)]" />
                Fullscreen
              </button>
            ) : null}
            {onLogout ? (
              <button
                type="button"
                role="menuitem"
                className={`${ITEM_CLASS} text-[var(--danger)] hover:bg-[var(--danger-muted)]`}
                disabled={isLoggingOut}
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                <BiLogOut className="text-lg" />
                {isLoggingOut ? "Logging out…" : "Log out"}
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] sm:size-[42px]"
        onClick={() => setOpen((value) => !value)}
      >
        <BiDotsVerticalRounded className="text-xl" aria-hidden />
      </button>
      {menu}
    </>
  );
}
