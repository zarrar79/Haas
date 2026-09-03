"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BiChevronDown } from "react-icons/bi";

import { resolveEventWorkspaceNavigation } from "@/components/shell/nav-utils";
import { useEffectiveHackathonId } from "@/features/events/use-effective-hackathon-id";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";

type HeaderEventPickerProps = {
  className?: string;
  fullWidth?: boolean;
};

export function HeaderEventPicker({
  className = "",
  fullWidth = false,
}: HeaderEventPickerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedHackathonId, setSelectedHackathonId } = useSelectedEvent();
  const effectiveHackathonId = useEffectiveHackathonId();
  const hackathonId = effectiveHackathonId ?? selectedHackathonId;
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setOptions(
          items.map((h) => ({
            id: h.id,
            label: h.display_name || h.name || h.id,
          })),
        );
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function onEventChange(nextId: string) {
    if (!nextId) {
      setSelectedHackathonId(null);
      return;
    }
    setSelectedHackathonId(nextId);
    router.push(resolveEventWorkspaceNavigation(pathname, nextId));
  }

  return (
    <label
      className={`relative block ${fullWidth ? "w-full min-w-0" : "shrink-0"} ${className}`}
      title="Select event workspace"
    >
      <span className="sr-only">Active event</span>
      <select
        disabled={isLoading}
        className={`appearance-none rounded-[var(--radius-sm)] border bg-[var(--surface-raised)] py-0 pl-2.5 pr-7 text-[0.6875rem] font-semibold leading-none text-[var(--text)] shadow-[var(--shadow-sm)] transition focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] xl:pl-3 xl:text-[0.75rem] ${
          fullWidth
            ? "h-10 w-full max-w-none"
            : "h-9 max-w-[7.5rem] sm:h-[42px] sm:max-w-[10rem] xl:max-w-[12.5rem]"
        } ${
          hackathonId
            ? "border-[var(--border-strong)] hover:border-[var(--accent)]"
            : "border-[var(--warning)]/50 hover:border-[var(--warning)]"
        }`}
        value={hackathonId ?? ""}
        onChange={(e) => onEventChange(e.target.value)}
        aria-label={
          hackathonId
            ? "Active event workspace"
            : "Select event workspace"
        }
      >
        <option value="">
          {isLoading ? "Loading…" : "Select event…"}
        </option>
        {options.map((h) => (
          <option key={h.id} value={h.id}>
            {h.label}
          </option>
        ))}
      </select>
      <BiChevronDown
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
        aria-hidden
      />
    </label>
  );
}
