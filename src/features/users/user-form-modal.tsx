"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/loader";
import {
  buildTeamTypePayload,
  certificationsToPayload,
  editStateToUpdatePayload,
  educationToPayload,
  emptyUserProfileEditState,
  expertiseToPayload,
  userProfileToEditState,
  type UserProfileEditState,
} from "@/features/users/user-profile-edit-state";
import { UserProfileEditFields } from "@/features/users/user-profile-edit-fields";
import {
  createEventUser,
  getEventUser,
  updateEventUser,
  type EventUser,
} from "@/features/users/users-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string;
  row?: EventUser | null;
  userId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function UserFormModal({
  open,
  mode,
  hackathonId,
  row,
  userId,
  onClose,
  onSaved,
}: Props) {
  const [profile, setProfile] = useState<EventUser | null>(null);
  const [form, setForm] = useState<UserProfileEditState>(emptyUserProfileEditState());
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editUserId = userId || row?.id || null;

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (mode === "create") {
      setProfile(null);
      setForm(emptyUserProfileEditState());
      setPassword("");
      setLoadingProfile(false);
      return;
    }

    if (!editUserId) return;

    let cancelled = false;
    setLoadingProfile(true);
    void getEventUser(hackathonId, editUserId)
      .then((fullUser) => {
        if (cancelled) return;
        setProfile(fullUser);
        setForm(userProfileToEditState(fullUser));
        setPassword("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load user");
        if (row) {
          setProfile(row);
          setForm(userProfileToEditState(row));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, mode, editUserId, hackathonId, row]);

  if (!open) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        if (!form.email || !form.username || !form.password) {
          setError("Email, username, and password are required.");
          setBusy(false);
          return;
        }
        await createEventUser(hackathonId, {
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
          last_name: form.last_name.trim() || undefined,
          phone_number: form.phone_number.trim() || undefined,
          gender: form.gender.trim() || undefined,
          education: educationToPayload(form.education),
          certifications: certificationsToPayload(form.certifications),
          expertise: expertiseToPayload(form.expertise),
          team_type: buildTeamTypePayload(undefined, form.teamType),
        });
      } else if (editUserId) {
        await updateEventUser(
          hackathonId,
          editUserId,
          editStateToUpdatePayload(form, profile?.team_type, password || undefined),
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4">
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-bold text-[var(--text)]">
            {mode === "create" ? "Create user" : "Edit user"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Update account details, education, certifications, expertise, and team
            type for this event user.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === "edit" && loadingProfile ? (
            <div className="flex justify-center py-16">
              <InlineLoader label="Loading profile for editing…" />
            </div>
          ) : (
            <UserProfileEditFields
              mode={mode}
              state={form}
              onChange={setForm}
              password={password}
              onPasswordChange={setPassword}
            />
          )}

          {error ? (
            <div className="mt-4">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || (mode === "edit" && loadingProfile)}
          >
            {busy ? "Saving…" : mode === "create" ? "Create user" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
