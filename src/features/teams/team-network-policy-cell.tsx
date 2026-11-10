"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventTeam } from "@/features/teams/team-api";

/** Network policy status + Apply / Retry / Delete, mirroring the Django Teams admin column. */
export function TeamNetworkPolicyCell({
  team,
  busy,
  canManage,
  onApply,
  onDelete,
}: {
  team: EventTeam;
  busy: boolean;
  canManage: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  const policy = team.network_policy;
  const status = policy?.status ?? "not_applied";
  const canApply = policy?.can_apply ?? Boolean(team.name_code && team.pool_ip);

  let badge;
  let action = null;
  if (status === "applied") {
    badge = <Badge tone="success">Applied</Badge>;
    if (canManage) {
      action = (
        <Button
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-[10px] text-[var(--danger)]"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          {busy ? "Deleting…" : "Delete"}
        </Button>
      );
    }
  } else {
    badge =
      status === "failed" ? (
        <span title={policy?.last_error || undefined}>
          <Badge tone="danger">Failed</Badge>
        </span>
      ) : (
        <Badge tone="warning">Needs apply</Badge>
      );
    if (canManage) {
      action = (
        <Button
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-[10px]"
          disabled={busy}
          title={
            canApply
              ? undefined
              : "No namespace/IP pool yet — one will be provisioned first"
          }
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
        >
          {busy ? "Applying…" : status === "failed" ? "Retry" : "Apply"}
        </Button>
      );
    } else if (!canApply) {
      action = (
        <span className="text-[10px] text-[var(--text-muted)]">No namespace/IP</span>
      );
    }
  }

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      {badge}
      {action}
    </div>
  );
}
