"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSelect } from "@/components/ui/form-fields";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type HackathonPickerProps = {
  value: string;
  onChange: (id: string) => void;
  /** When set, changing selection navigates to `/events/{id}/{section}` */
  section?: string;
  /** When false, only calls onChange (no router navigation). Default true when section is set. */
  navigateOnChange?: boolean;
  /** Label for the empty option when navigateOnChange is false. */
  emptyLabel?: string;
  className?: string;
};

export function HackathonPicker({
  value,
  onChange,
  section,
  navigateOnChange,
  emptyLabel = "All hackathons",
  className,
}: HackathonPickerProps) {
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [items, setItems] = useState<Hackathon[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        // Match header event picker: include ended/inactive events so the
        // Event Workspace selection stays consistent across pages.
        const { items: rows } = await listHackathons({
          show_deleted: "false",
        });
        setItems(rows);
      } catch (err) {
        redirectIfUnauthorized(err, router);
      }
    })();
  }, [router]);

  const shouldNavigate = navigateOnChange ?? Boolean(section);
  // On event-scoped pages (section set / navigate), never offer "All hackathons".
  const allowEmpty = !shouldNavigate;

  function handleChange(next: string) {
    onChange(next);
    setSelectedHackathonId(next || null);
    if (shouldNavigate && section && next) {
      router.push(`/events/${next}/${section}`);
    }
  }

  const knownIds = new Set(items.map((h) => h.id));
  const valueMissing = Boolean(value) && !knownIds.has(value);

  return (
    <FormSelect
      label="Hackathon"
      value={value}
      onChange={handleChange}
      className={className}
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {valueMissing ? (
        <option value={value}>Current event</option>
      ) : null}
      {items.length === 0 && !valueMissing ? (
        <option value="">No hackathons available</option>
      ) : (
        items.map((h) => (
          <option key={h.id} value={h.id}>
            {hackathonLabel(h)}
          </option>
        ))
      )}
    </FormSelect>
  );
}
