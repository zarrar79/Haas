"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

type HackathonPickerProps = {
  value: string;
  onChange: (id: string) => void;
  /** When set, changing selection navigates to `/events/{id}/{section}` */
  section?: string;
  className?: string;
};

export function HackathonPicker({
  value,
  onChange,
  section,
  className,
}: HackathonPickerProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [items, setItems] = useState<Hackathon[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { items: rows } = await listHackathons({
          show_deleted: "false",
        });
        setItems(rows);
      } catch (err) {
        if (err instanceof ApiRequestError && err.httpStatus === 401) {
          router.replace("/login");
        }
      }
    })();
  }, [router]);

  function handleChange(next: string) {
    onChange(next);
    setSelectedHackathonId(next || null);
    if (section && next) {
      router.push(`/events/${next}/${section}`);
    }
  }

  return (
    <label
      className={`flex flex-col gap-1.5 text-sm text-[var(--text-muted)] ${className ?? ""}`}
    >
      <span className="font-medium text-[var(--text)]">Hackathon</span>
      <select
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      >
        {items.length === 0 ? (
          <option value="">No hackathons available</option>
        ) : (
          items.map((h) => (
            <option key={h.id} value={h.id}>
              {h.display_name || h.name}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
