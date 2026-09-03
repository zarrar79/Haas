"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  UserCertificationsSection,
  UserEducationSection,
  UserExpertiseSection,
} from "@/features/users/profile-fields-display";
import { TeamTypeDisplay } from "@/features/users/team-type-display";
import type { EventUser } from "@/features/users/users-api";
import { eventUserLabel } from "@/features/users/users-api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm font-medium text-[var(--text)] ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

type Props = {
  user: EventUser;
  compact?: boolean;
};

export function UserProfileSummary({ user, compact }: Props) {
  const displayName = user.full_name || eventUserLabel(user);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar
          src={user.media_url}
          name={displayName}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-[var(--text)]">{displayName}</h3>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {user.email || user.username}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.is_staff ? <Badge tone="success">Staff</Badge> : null}
            {user.is_block ? (
              <Badge tone="danger">Blocked</Badge>
            ) : user.is_active === false ? (
              <Badge>Inactive</Badge>
            ) : (
              <Badge tone="success">Active</Badge>
            )}
            {user.is_verified ? <Badge tone="success">Verified</Badge> : null}
            {user.user_type ? <Badge>{user.user_type}</Badge> : null}
            {user.skill_type ? <Badge>{user.skill_type}</Badge> : null}
          </div>
        </div>
      </div>

      <dl
        className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        <DetailItem label="Username" value={user.username} mono />
        <DetailItem label="Email" value={user.email} />
        <DetailItem label="First name" value={user.name} />
        <DetailItem label="Last name" value={user.last_name} />
        <DetailItem label="Phone" value={user.phone_number} />
        <DetailItem label="Gender" value={user.gender} />
        <DetailItem label="CNIC" value={user.cnic} mono />
        <DetailItem label="Organization" value={user.organization_name} />
        {user.team_type ? (
          <DetailItem
            label="Team type"
            value={<TeamTypeDisplay teamType={user.team_type} />}
          />
        ) : null}
        <DetailItem label="User ID" value={user.id} mono />
        <DetailItem label="Created" value={formatDate(user.created_at)} />
        <DetailItem label="Updated" value={formatDate(user.updated_at)} />
        {!compact ? (
          <>
            <DetailItem
              label="Email verified"
              value={user.email_verified ? "Yes" : "No"}
            />
            <DetailItem
              label="Phone confirmed"
              value={user.phone_number_confirmed ? "Yes" : "No"}
            />
            <DetailItem
              label="2FA enabled"
              value={user.two_factor_enabled ? "Yes" : "No"}
            />
            <DetailItem label="Blocked at" value={formatDate(user.blocked_at)} />
            <DetailItem label="Block reason" value={user.block_reason} />
            <DetailItem
              label="Created in event"
              value={user.created_in_hackathon?.display_name || user.created_in_hackathon?.name}
            />
          </>
        ) : null}
      </dl>

      {user.teams && user.teams.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Teams ({user.team_count ?? user.teams.length})
          </p>
          <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius-sm)] border border-[var(--border)]">
            {user.teams.map((team) => (
              <li
                key={team.membership_id || team.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--text)]">
                  {team.name || team.team_code || team.id}
                </span>
                <span className="flex flex-wrap gap-1">
                  {team.is_captain ? <Badge tone="warning">Captain</Badge> : null}
                  {team.is_approved === false ? (
                    <Badge tone="warning">Pending</Badge>
                  ) : (
                    <Badge tone="success">Approved</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact ? (
        <div className="grid gap-3 lg:grid-cols-1">
          <UserEducationSection value={user.education} />
          <UserCertificationsSection value={user.certifications} />
          <UserExpertiseSection value={user.expertise} />
        </div>
      ) : null}
    </div>
  );
}
