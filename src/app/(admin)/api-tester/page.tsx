"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useUiPreferences } from "@/theme/ui-preferences";

/** Legacy route: open home and show the API tester drawer. */
export default function ApiTesterRedirectPage() {
  const router = useRouter();
  const { setShowApiTester } = useUiPreferences();

  useEffect(() => {
    setShowApiTester(true);
    router.replace("/home");
  }, [router, setShowApiTester]);

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening API tester…</p>
  );
}
