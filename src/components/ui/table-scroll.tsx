"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Outer bordered shell for scrollable tables — Spark Admin style. */
export const TABLE_SHELL_CLASS =
  "relative overflow-hidden rounded-[var(--radius)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-sm)]";

/** Horizontal scroll region with styled scrollbar (see globals.css). */
export const TABLE_SCROLL_CLASS =
  "haas-table-scroll overflow-x-auto overscroll-x-contain";

/** Table element: grows with columns, never squishes below container width. */
export const TABLE_ELEMENT_CLASS =
  "w-max min-w-full border-collapse text-left text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap [&_thead]:bg-[var(--surface-raised)] [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-[11px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[var(--text-subtle)] [&_td]:border-t [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-[var(--text)]";

/** Right-frozen actions (three-dot) column. */
export const TABLE_STICKY_ACTIONS_CLASS = "haas-table-sticky-actions";

/** Edge band (px) where hover starts auto-scrolling the table. */
const EDGE_ZONE_PX = 72;
/** Max auto-scroll speed in px per frame (~60fps). */
const MAX_SCROLL_SPEED = 18;

export function SyncedHorizontalScroll({
  children,
  tableRef,
}: {
  children: ReactNode;
  tableRef: React.RefObject<HTMLTableElement | null>;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dirRef = useRef<-1 | 0 | 1>(0);
  const speedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [spacerWidth, setSpacerWidth] = useState(0);
  const [showTopBar, setShowTopBar] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [edgeHint, setEdgeHint] = useState<"left" | "right" | null>(null);

  function updateOverflowHints() {
    const bottom = bottomRef.current;
    if (!bottom) return;
    const max = bottom.scrollWidth - bottom.clientWidth;
    const left = bottom.scrollLeft;
    setCanScrollLeft(left > 2);
    setCanScrollRight(max - left > 2);
    setShowTopBar(max > 2);
    if (tableRef.current) {
      setSpacerWidth(tableRef.current.scrollWidth);
    }
  }

  useEffect(() => {
    const table = tableRef.current;
    const bottom = bottomRef.current;
    if (!table || !bottom) return;

    updateOverflowHints();
    const ro = new ResizeObserver(updateOverflowHints);
    ro.observe(table);
    ro.observe(bottom);
    window.addEventListener("resize", updateOverflowHints);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateOverflowHints);
    };
  }, [tableRef]);

  useEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!bottom) return;

    let syncing = false;
    const syncFromTop = () => {
      if (!top || syncing) return;
      syncing = true;
      bottom.scrollLeft = top.scrollLeft;
      syncing = false;
      updateOverflowHints();
    };
    const syncFromBottom = () => {
      if (syncing) return;
      syncing = true;
      if (top) top.scrollLeft = bottom.scrollLeft;
      syncing = false;
      updateOverflowHints();
    };

    top?.addEventListener("scroll", syncFromTop);
    bottom.addEventListener("scroll", syncFromBottom);
    return () => {
      top?.removeEventListener("scroll", syncFromTop);
      bottom.removeEventListener("scroll", syncFromBottom);
    };
  }, [showTopBar]);

  useEffect(() => {
    const bottom = bottomRef.current;
    if (!bottom) return;

    const stop = () => {
      dirRef.current = 0;
      speedRef.current = 0;
      setEdgeHint(null);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = () => {
      const dir = dirRef.current;
      if (!dir) {
        rafRef.current = null;
        return;
      }
      const el = bottomRef.current;
      if (!el) {
        rafRef.current = null;
        return;
      }
      const before = el.scrollLeft;
      el.scrollLeft = before + dir * speedRef.current;
      if (topRef.current) topRef.current.scrollLeft = el.scrollLeft;
      updateOverflowHints();
      // Stop at ends
      if (el.scrollLeft === before) {
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        stop();
        return;
      }
      const target = event.target as Element | null;
      // Pause while aiming at clickable controls (⋮ menu, links, etc.)
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='menu'], [role='menuitem'], [role='button']",
        )
      ) {
        stop();
        return;
      }

      const rect = bottom.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const maxScroll = bottom.scrollWidth - bottom.clientWidth;
      if (maxScroll <= 2) {
        stop();
        return;
      }

      let dir: -1 | 0 | 1 = 0;
      let intensity = 0;
      if (x >= rect.width - EDGE_ZONE_PX && bottom.scrollLeft < maxScroll - 1) {
        dir = 1;
        // Deeper into the right edge → faster scroll
        intensity = Math.min(
          1,
          Math.max(0.2, (x - (rect.width - EDGE_ZONE_PX)) / EDGE_ZONE_PX),
        );
      } else if (x <= EDGE_ZONE_PX && bottom.scrollLeft > 1) {
        dir = -1;
        intensity = Math.min(
          1,
          Math.max(0.2, (EDGE_ZONE_PX - x) / EDGE_ZONE_PX),
        );
      }

      dirRef.current = dir;
      speedRef.current = dir ? MAX_SCROLL_SPEED * intensity : 0;
      setEdgeHint(dir === 1 ? "right" : dir === -1 ? "left" : null);

      if (dir && rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
      if (!dir && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const onLeave = () => stop();

    bottom.addEventListener("pointermove", onMove);
    bottom.addEventListener("pointerleave", onLeave);
    return () => {
      stop();
      bottom.removeEventListener("pointermove", onMove);
      bottom.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {showTopBar ? (
        <div
          ref={topRef}
          className={`${TABLE_SCROLL_CLASS} haas-table-scroll-top border-b border-[var(--border)]`}
          aria-hidden
        >
          <div style={{ width: spacerWidth, height: 1 }} />
        </div>
      ) : null}
      <div
        ref={bottomRef}
        className={`${TABLE_SCROLL_CLASS} haas-table-edge-scroll`}
        title={
          canScrollLeft || canScrollRight
            ? "Hover near the left/right edge to scroll hidden columns"
            : undefined
        }
      >
        {children}
      </div>
      {canScrollLeft ? (
        <div
          className={`haas-table-edge-fade haas-table-edge-fade-left ${
            edgeHint === "left" ? "is-active" : ""
          }`}
          aria-hidden
        />
      ) : null}
      {canScrollRight ? (
        <div
          className={`haas-table-edge-fade haas-table-edge-fade-right ${
            edgeHint === "right" ? "is-active" : ""
          }`}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

type TableScrollProps = {
  children: ReactNode;
  className?: string;
  tableRef?: React.RefObject<HTMLTableElement | null>;
};

export function TableScroll({
  children,
  className = "",
  tableRef,
}: TableScrollProps) {
  const fallbackRef = useRef<HTMLTableElement>(null);
  const resolvedRef = tableRef ?? fallbackRef;

  return (
    <div className={`${TABLE_SHELL_CLASS} ${className}`.trim()}>
      <SyncedHorizontalScroll tableRef={resolvedRef}>
        {children}
      </SyncedHorizontalScroll>
    </div>
  );
}
