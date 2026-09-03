"use client";

import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import {
  eventUserDetailPath,
  eventUserLabel,
  type EventUser,
} from "@/features/users/users-api";

type ActionHandlers = {
  busyId: string | null;
  onEdit: (user: EventUser) => void;
  onBlock: (user: EventUser) => void;
  onUnblock: (user: EventUser) => void;
  onActivate: (user: EventUser) => void;
  onDeactivate: (user: EventUser) => void;
};

export function buildEventUserRowActionItems(
  hackathonId: string,
  row: EventUser,
  canWrite: boolean,
  handlers: ActionHandlers,
) {
  if (!canWrite) {
    return [
      {
        id: "view",
        label: "View",
        href: eventUserDetailPath(hackathonId, row.id),
      },
    ];
  }

  const isInactive = row.is_active === false;

  return [
    {
      id: "view",
      label: "View",
      href: eventUserDetailPath(hackathonId, row.id),
    },
    {
      id: "edit",
      label: "Edit",
      disabled: handlers.busyId === row.id,
      onClick: () => handlers.onEdit(row),
    },
    row.is_block
      ? {
          id: "unblock",
          label: "Unblock",
          disabled: handlers.busyId === row.id,
          onClick: () => void handlers.onUnblock(row),
        }
      : {
          id: "block",
          label: "Block",
          disabled: handlers.busyId === row.id,
          onClick: () => void handlers.onBlock(row),
        },
    isInactive
      ? {
          id: "activate",
          label: "Activate",
          disabled: handlers.busyId === row.id,
          onClick: () => void handlers.onActivate(row),
        }
      : {
          id: "deactivate",
          label: "Deactivate",
          disabled: handlers.busyId === row.id,
          destructive: true,
          onClick: () => void handlers.onDeactivate(row),
        },
  ];
}

export function EventUserRowActions({
  hackathonId,
  user,
  canWrite,
  handlers,
}: {
  hackathonId: string;
  user: EventUser;
  canWrite: boolean;
  handlers: ActionHandlers;
}) {
  return (
    <RowActionsMenu
      label={`Actions for ${eventUserLabel(user)}`}
      items={buildEventUserRowActionItems(hackathonId, user, canWrite, handlers)}
    />
  );
}
