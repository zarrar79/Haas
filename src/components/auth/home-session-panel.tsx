"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiRequestError, callAppApi } from "@/lib/client-api";
import { useUiPreferences } from "@/theme/ui-preferences";
import type { ApiResult } from "@/types";

type MePayload = {
  data: {
    user?: {
      id?: string;
      email?: string;
      username?: string;
      name?: string;
      last_name?: string;
      user_type?: string;
    };
    system_role?: string;
    is_root?: boolean;
    hackathon_roles?: Array<{
      hackathon_id: string;
      hackathon_name: string;
      role: string;
    }>;
  };
  message?: string;
};

export function HomeSessionPanel() {
  const router = useRouter();
  const { setShowApiTester } = useUiPreferences();
  const [me, setMe] = useState<MePayload["data"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await callAppApi<ApiResult<MePayload>>("/api/haas/me");
        if (cancelled) return;
        if (!result.ok) {
          setErrorMessage(result.message);
          return;
        }
        setMe(result.data.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiRequestError && error.httpStatus === 401) {
          router.replace("/login");
          return;
        }
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load session",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const user = me?.user;

  return (
    <div className="w-full flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Session from Haas <code className="text-[var(--text)]">/me</code>.
            Use the sidebar to open hackathons next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/hackathons")}
          >
            Hackathons
          </Button>
          <Button variant="ghost" onClick={() => setShowApiTester(true)}>
            Open API tester
          </Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading session…</p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--danger)]/40 bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}

      {!isLoading && me ? (
        <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Current user
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-muted)]">Name</dt>
              <dd className="font-medium text-[var(--text)]">
                {[user?.name, user?.last_name].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Email</dt>
              <dd className="font-medium text-[var(--text)]">
                {user?.email || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">Username</dt>
              <dd className="font-medium text-[var(--text)]">
                {user?.username || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-muted)]">System role</dt>
              <dd className="font-medium text-[var(--text)]">
                {me.is_root
                  ? "system.root"
                  : me.system_role || "none (event roles only)"}
              </dd>
            </div>
          </dl>

          {me.hackathon_roles && me.hackathon_roles.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-medium text-[var(--text)]">
                Hackathon roles
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                {me.hackathon_roles.map((role) => (
                  <li key={`${role.hackathon_id}-${role.role}`}>
                    {role.hackathon_name} — {role.role}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--text-muted)]">
              No hackathon role bindings returned.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
