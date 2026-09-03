"use client";

import { useCallback, useState } from "react";

import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { useLogoutIfSelf } from "@/features/auth/use-logout-if-self";
import {
  activateEventUser,
  blockEventUser,
  deleteEventUser,
  eventUserLabel,
  unblockEventUser,
  type EventUser,
} from "@/features/users/users-api";

type Options = {
  hackathonId: string;
  onChanged: () => void | Promise<void>;
  /** Called after deactivating another user (detail page may navigate away). */
  onDeactivated?: () => void | Promise<void>;
  /** Called after self-deactivation instead of onChanged */
  onSelfDeactivated?: () => void | Promise<void>;
};

export function useEventUserActions({
  hackathonId,
  onChanged,
  onDeactivated,
  onSelfDeactivated,
}: Options) {
  const { confirm, prompt } = usePlatformDialog();
  const logoutIfSelf = useLogoutIfSelf();
  const [busyId, setBusyId] = useState<string | null>(null);

  const blockUser = useCallback(
    async (user: Pick<EventUser, "id"> & Partial<EventUser>) => {
      const reason = await prompt({
        title: "Block user",
        message: `Provide a reason for blocking ${eventUserLabel(user)}.`,
        label: "Block reason",
        defaultValue: "Blocked in HAS admin",
        confirmLabel: "Block",
      });
      if (reason == null) return false;
      setBusyId(user.id);
      try {
        await blockEventUser(hackathonId, user.id, reason);
        await onChanged();
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [hackathonId, onChanged, prompt],
  );

  const unblockUser = useCallback(
    async (user: Pick<EventUser, "id">) => {
      setBusyId(user.id);
      try {
        await unblockEventUser(hackathonId, user.id);
        await onChanged();
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [hackathonId, onChanged],
  );

  const activateUser = useCallback(
    async (user: Pick<EventUser, "id">) => {
      setBusyId(user.id);
      try {
        await activateEventUser(hackathonId, user.id);
        await onChanged();
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [hackathonId, onChanged],
  );

  const deactivateUser = useCallback(
    async (user: Pick<EventUser, "id">) => {
      const ok = await confirm({
        title: "Deactivate user",
        message: "Deactivate this user (soft delete)?",
        confirmLabel: "Deactivate",
        destructive: true,
      });
      if (!ok) return false;
      setBusyId(user.id);
      try {
        await deleteEventUser(hackathonId, user.id);
        if (await logoutIfSelf(user.id)) {
          await onSelfDeactivated?.();
          return true;
        }
        if (onDeactivated) {
          await onDeactivated();
        } else {
          await onChanged();
        }
        return true;
      } finally {
        setBusyId(null);
      }
    },
    [confirm, hackathonId, logoutIfSelf, onChanged, onDeactivated, onSelfDeactivated],
  );

  return { busyId, blockUser, unblockUser, activateUser, deactivateUser };
}
