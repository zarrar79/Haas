"use client";

import { useEffect, useRef } from "react";

import { readUrlSearchParams } from "@/features/search/section-search";

/** @deprecated Prefer useSectionSearch for new code. */
export function useDeepSearchQuery(
  setSearch: (value: string) => void,
  enabled = true,
) {
  const applied = useRef(false);

  useEffect(() => {
    if (!enabled || applied.current || typeof window === "undefined") return;
    const { q } = readUrlSearchParams();
    if (q) {
      setSearch(q);
      applied.current = true;
    }
  }, [enabled, setSearch]);
}
