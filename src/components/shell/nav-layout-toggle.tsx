"use client";

import { BiLayout, BiMenuAltLeft } from "react-icons/bi";

import { useUiPreferences } from "@/theme/ui-preferences";

export function NavLayoutToggle() {
  const { navPlacement, setNavPlacement } = useUiPreferences();
  const isSidebar = navPlacement === "sidebar";

  function toggle() {
    setNavPlacement(isSidebar ? "header" : "sidebar");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isSidebar ? "Switch to nav bar" : "Switch to sidebar"}
      aria-label={isSidebar ? "Switch to nav bar layout" : "Switch to sidebar layout"}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--input-bg)] text-[var(--text)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--surface-hover)] lg:size-auto lg:gap-1.5 lg:px-3 lg:py-2 lg:text-[0.6875rem] lg:font-bold lg:uppercase lg:tracking-[0.06em]"
    >
      {isSidebar ? (
        <>
          <BiMenuAltLeft className="text-sm" aria-hidden />
          <span className="hidden lg:inline">Sidebar</span>
        </>
      ) : (
        <>
          <BiLayout className="text-sm" aria-hidden />
          <span className="hidden lg:inline">Nav bar</span>
        </>
      )}
    </button>
  );
}
