"use client";

import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { useUiPreferences } from "@/theme/ui-preferences";

const ApiTester = dynamic(
  () =>
    import("@/components/api-tester/api-tester").then((mod) => mod.ApiTester),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-[var(--text-muted)]">Loading tester…</p>
    ),
  },
);

/**
 * Minimal API tester drawer.
 * Not mounted at all when showApiTester is false (default).
 */
export function ApiTesterDrawer() {
  const { showApiTester, setShowApiTester } = useUiPreferences();

  if (!showApiTester) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-[var(--overlay)]"
        aria-label="Close API tester"
        onClick={() => setShowApiTester(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(100vw,720px)] flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Dev tool
            </p>
            <h2 className="text-sm font-semibold text-[var(--text)]">
              API tester
            </h2>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowApiTester(false)}
          >
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          <ApiTester />
        </div>
      </aside>
    </>
  );
}
