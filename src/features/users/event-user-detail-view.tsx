"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { UserFormModal } from "@/features/users/user-form-modal";
import { UserProfileSummary } from "@/features/users/user-profile-summary";
import {
  blockEventUser,
  deleteEventUser,
  eventUserDetailPath,
  getEventUser,
  unblockEventUser,
  type EventUser,
} from "@/features/users/users-api";
import { ApiRequestError } from "@/lib/client-api";

type Props = {
  hackathonId: string;
  userId: string;
};

export function EventUserDetailView({ hackathonId, userId }: Props) {
  const router = useRouter();
  const { canMutateEvent } = useHaasAccess();
  const [user, setUser] = useState<EventUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const canWrite = canMutateEvent(hackathonId);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUser(await getEventUser(hackathonId, userId));
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, userId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBlock() {
    const reason = window.prompt("Block reason", "Blocked in HAS admin");
    if (reason == null) return;
    setBusy(true);
    try {
      await blockEventUser(hackathonId, userId, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    } finally {
      setBusy(false);
    }
  }

  async function onUnblock() {
    setBusy(true);
    try {
      await unblockEventUser(hackathonId, userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    if (!window.confirm("Deactivate this user (soft delete)?")) return;
    setBusy(true);
    try {
      await deleteEventUser(hackathonId, userId);
      router.push(`/events/${hackathonId}/members`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title={user?.full_name || user?.username || "User details"}
        description="Full profile for this event-scoped user."
        actions={
          <>
            <Link
              href={`/events/${hackathonId}/members`}
              className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)]"
            >
              Back to members
            </Link>
            <Button variant="secondary" onClick={() => void load()} disabled={isLoading}>
              Refresh
            </Button>
            {canWrite && user ? (
              <>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Edit
                </Button>
                {user.is_block ? (
                  <Button variant="secondary" disabled={busy} onClick={() => void onUnblock()}>
                    Unblock
                  </Button>
                ) : (
                  <Button variant="secondary" disabled={busy} onClick={() => void onBlock()}>
                    Block
                  </Button>
                )}
                <Button variant="ghost" disabled={busy} onClick={() => void onDeactivate()}>
                  Deactivate
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {isLoading ? (
        <PageLoader label="Loading user profile…" />
      ) : user ? (
        <section className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6">
          <UserProfileSummary user={user} />
        </section>
      ) : null}

      <UserFormModal
        open={modalOpen}
        mode="edit"
        hackathonId={hackathonId}
        userId={userId}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
