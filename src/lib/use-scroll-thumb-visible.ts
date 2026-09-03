"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Shows a scrollbar thumb while scrolling; hides it shortly after scroll stops. */
export function useScrollThumbVisible(delayMs = 700) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const onScroll = useCallback(() => {
    setVisible(true);
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, delayMs);
  }, [delayMs]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [onScroll]);

  const className = visible
    ? "haas-sidebar-scroll is-scrolling"
    : "haas-sidebar-scroll";

  return { ref, className };
}
