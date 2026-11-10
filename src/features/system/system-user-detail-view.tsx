"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormSelect } from "@/components/ui/form-fields";
import { PageLoader } from "@/components/ui/loader";
import { PageHeader } from "@/components/ui/page-header";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { TextField } from "@/components/ui/text-field";
import {
  blockSystemUser,
  getSystemUser,
  unblockSystemUser,
  updateSystemUser,
  type SystemUser,
  type SystemUserUpdateInput,
} from "@/features/system/system-api";
import { SystemUserAnalyticsPanel } from "@/features/system/system-user-analytics-panel";
import { SystemUserMembershipsPanel } from "@/features/system/system-user-memberships-panel";
import { listOrganizations, type Organization } from "@/features/organizations/organization-api";
import { UserProfileEditFields } from "@/features/users/user-profile-edit-fields";
import { UserProfileSummary } from "@/features/users/user-profile-summary";
import {
  editStateToUpdatePayload,
  userProfileToEditState,
  type UserProfileEditState,
} from "@/features/users/user-profile-edit-state";
import type { EventUser } from "@/features/users/users-api";
import { userLabel } from "@/lib/assigned-events";
import { redirectIfUnauthorized } from "@/lib/client-api";

/** Account fields not covered by the shared profile editor. */
type Form = {
  cnic: string;
  user_type: string;
  skill_type: string;
  organization_info: string;
  is_active: boolean;
  is_verified: boolean;
  email_verified: boolean;
  is_lms_user: boolean;
};

function toForm(u: SystemUser): Form {
  return {
    cnic: u.cnic ?? "",
    user_type: u.user_type ?? "Student",
    skill_type: u.skill_type ?? "",
    organization_info: u.organization_info ? String(u.organization_info) : "",
    is_active: u.is_active !== false,
    is_verified: Boolean(u.is_verified),
    email_verified: Boolean(u.email_verified),
    is_lms_user: Boolean(u.is_lms_user),
  };
}

function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--text)] break-words">
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
    </div>
  );
}

export function SystemUserDetailView({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { prompt } = usePlatformDialog();
  const [user, setUser] = useState<SystemUser | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [profile, setProfile] = useState<UserProfileEditState | null>(null);
  const [password, setPassword] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [editing, setEditing] = useState(searchParams.get("edit") === "1");
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const u = await getSystemUser(userId);
      setUser(u);
      setForm(toForm(u));
      setProfile(userProfileToEditState(u as unknown as EventUser));
      setPassword("");
      setImageFile(null);
      setClearImage(false);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load user");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listOrganizations()
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function resetEdit() {
    if (!user) return;
    setForm(toForm(user));
    setProfile(userProfileToEditState(user as unknown as EventUser));
    setPassword("");
    setImageFile(null);
    setClearImage(false);
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (!form || !profile || !user) return;
    setBusy(true);
    setError(null);
    const base = editStateToUpdatePayload(
      profile,
      user.team_type,
      password.trim() || undefined,
    );
    const body: SystemUserUpdateInput = {
      ...(base as SystemUserUpdateInput),
      // Platform admins can change these directly (blank allowed to clear).
      email: profile.email.trim(),
      name: profile.name.trim(),
      last_name: profile.last_name.trim(),
      phone_number: profile.phone_number.trim(),
      gender: profile.gender.trim(),
      cnic: form.cnic.trim(),
      user_type: form.user_type,
      skill_type: form.skill_type.trim(),
      organization_info: form.organization_info || null,
      is_active: form.is_active,
      is_verified: form.is_verified,
      email_verified: form.email_verified,
      is_lms_user: form.is_lms_user,
    };
    // Defense-in-depth: never send password unless admin typed one.
    if (!password.trim()) {
      delete body.password;
    }
    try {
      await updateSystemUser(user.id, body, {
        file: imageFile,
        clearMedia: clearImage,
      });
      await load();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (user.is_block) {
        await unblockSystemUser(user.id);
      } else {
        const reason = await prompt({
          title: "Block user",
          message: `Provide a global block reason for ${userLabel(user)}.`,
          label: "Block reason",
          defaultValue: "Blocked in HAS",
          confirmLabel: "Block",
        });
        if (reason == null) return;
        await blockSystemUser(user.id, reason);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <PageLoader />;

  if (!user || !form || !profile) {
    return (
      <div className="w-full space-y-3">
        <PageHeader eyebrow="Platform" title="User" />
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Link href="/users">
          <Button size="sm" variant="secondary">
            Back to users
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="Platform · Users"
        title={userLabel(user)}
        actions={
          <>
            <Link href="/users">
              <Button size="sm" variant="secondary">
                Back
              </Button>
            </Link>
            {editing ? (
              <>
                <Button size="sm" variant="secondary" disabled={busy} onClick={resetEdit}>
                  Cancel
                </Button>
                <Button size="sm" disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void toggleBlock()}
                >
                  {user.is_block ? "Unblock" : "Block"}
                </Button>
                <Button size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </>
            )}
          </>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        {user.is_block ? <Badge tone="danger">Blocked</Badge> : null}
        {user.is_active === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>}
        {user.is_staff ? <Badge tone="success">Staff</Badge> : null}
        {user.is_verified ? <Badge tone="success">Verified</Badge> : <Badge>Unverified</Badge>}
      </div>

      {user.is_block ? (
        <Alert variant="error">
          Blocked {user.blocked_at ? `on ${formatDate(user.blocked_at)}` : ""}
          {user.block_reason ? ` — ${user.block_reason}` : ""}
        </Alert>
      ) : null}

      {editing ? (
        <div className="space-y-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <UserProfileEditFields
            mode="edit"
            emailEditable
            state={profile}
            onChange={setProfile}
            password={password}
            onPasswordChange={setPassword}
            mediaUrl={user.media_url}
            imageFile={imageFile}
            clearImage={clearImage}
            onImageFileChange={setImageFile}
            onClearImageChange={setClearImage}
          />
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Account
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="CNIC" value={form.cnic} onChange={(e) => set("cnic", e.target.value)} />
              <TextField label="Skill type" value={form.skill_type} onChange={(e) => set("skill_type", e.target.value)} />
              <FormSelect label="User type" value={form.user_type} onChange={(v) => set("user_type", v)}>
                <option value="Student">Student</option>
                <option value="Instructor">Instructor</option>
                {form.user_type === "Admin" ? <option value="Admin">Admin</option> : null}
              </FormSelect>
              <FormSelect label="Organization" value={form.organization_info} onChange={(v) => set("organization_info", v)}>
                <option value="">None</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-wrap gap-4">
              <FormCheckbox label="Active" checked={form.is_active} onChange={(v) => set("is_active", v)} />
              <FormCheckbox label="Verified" checked={form.is_verified} onChange={(v) => set("is_verified", v)} />
              <FormCheckbox label="Email verified" checked={form.email_verified} onChange={(v) => set("email_verified", v)} />
              <FormCheckbox
                label="Sync account to LMS (SSO)"
                checked={form.is_lms_user}
                onChange={(v) => set("is_lms_user", v)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <UserProfileSummary user={user as unknown as EventUser} />
          <dl className="grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="CNIC" value={user.cnic} />
            <Field label="Skill type" value={user.skill_type} />
            <Field label="Organization" value={user.organization_name} />
            <Field label="Email verified" value={user.email_verified ? "Yes" : "No"} />
            <Field
              label="Synced to LMS (SSO)"
              value={user.is_lms_user ? "Yes" : "No"}
            />
            <Field label="Two-factor" value={user.two_factor_enabled ? "Enabled" : "Off"} />
            <Field label="Failed logins" value={user.access_failed_count} />
            <Field label="Created" value={formatDate(user.created_at)} />
            <Field label="Updated" value={formatDate(user.updated_at)} />
            <Field
              label="Created in event"
              value={
                user.created_in_hackathon?.display_name ||
                user.created_in_hackathon?.name
              }
            />
            <Field
              label="Email OTP"
              value={
                user.otp ? (
                  <span className="font-mono">
                    {user.otp}
                    {user.otp_expires_at
                      ? ` (expires ${formatDate(user.otp_expires_at)})`
                      : ""}
                  </span>
                ) : null
              }
            />
          </dl>
        </div>
      )}

      {!editing ? (
        <>
          <SystemUserAnalyticsPanel userId={user.id} />
          <SystemUserMembershipsPanel userId={user.id} />
        </>
      ) : null}
    </div>
  );
}
