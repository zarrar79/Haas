"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/loader";
import { useHaasAccess } from "@/features/auth/haas-access-context";
import { AssignUserToTeamModal } from "@/features/teams/assign-user-to-team-modal";
import { EventUserRowActions } from "@/features/users/event-user-row-actions";
import { UserFormModal } from "@/features/users/user-form-modal";
import { UserProfileSummary } from "@/features/users/user-profile-summary";
import { useEventUserActions } from "@/features/users/use-event-user-actions";
import { getEventUser, type EventUser } from "@/features/users/users-api";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);

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

  const { busyId, blockUser, unblockUser, activateUser, deactivateUser } =
    useEventUserActions({
    hackathonId,
    onChanged: load,
    onDeactivated: () => router.push(`/events/${hackathonId}/members`),
  });

  async function handleBlock() {
    if (!user) return;
    try {
      await blockUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block");
    }
  }

  async function handleUnblock() {
    if (!user) return;
    try {
      await unblockUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock");
    }
  }

  async function handleActivate() {
    if (!user) return;
    try {
      await activateUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate");
    }
  }

  async function handleDeactivate() {
    if (!user) return;
    try {
      await deactivateUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title={user?.full_name || user?.username || "Member details"}
        actions={
          <>
            <Link
              href={`/events/${hackathonId}/members`}
              className="inline-flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-hover)]"
            >
              Back to members
            </Link>
            {canWrite && user && !user.teams?.length ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busyId === user.id}
                onClick={() => setAssignTeamOpen(true)}
              >
                Assign to team
              </Button>
            ) : null}
            {canWrite && user ? (
              <EventUserRowActions
                hackathonId={hackathonId}
                user={user}
                canWrite={canWrite}
                handlers={{
                  busyId,
                  onEdit: () => setModalOpen(true),
                  onBlock: () => void handleBlock(),
                  onUnblock: () => void handleUnblock(),
                  onActivate: () => void handleActivate(),
                  onDeactivate: () => void handleDeactivate(),
                }}
              />
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
        <PageLoader label="Loading member profile…" variant="form" />
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

      <AssignUserToTeamModal
        open={assignTeamOpen}
        hackathonId={hackathonId}
        user={user}
        onClose={() => setAssignTeamOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
