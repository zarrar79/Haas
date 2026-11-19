"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StickyToolbar } from "@/components/ui/sticky-toolbar";
import { EventHackathonDetailsPanel } from "@/features/events/event-hackathon-details-panel";
import { EventHackathonRosterPanel } from "@/features/events/event-hackathon-roster-panel";
import { HackathonPicker } from "@/features/events/hackathon-picker";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { getHackathon } from "@/features/hackathons/hackathon-api";
import { EventOrganizationsView } from "@/features/organizations/event-organizations-view";
import { EventStaffRolesPanel } from "@/features/roles/event-staff-roles-panel";
import { EventSponsorsView } from "@/features/sponsors/event-sponsors-view";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { hackathonLabel } from "@/lib/display-name";
import type { Hackathon } from "@/types/hackathon";

type Tab = "details" | "roster" | "staff" | "organizations" | "sponsors";

const TABS: { id: Tab; label: string; description: string }[] = [
  {
    id: "details",
    label: "Details",
    description: "Name, schedule, status, main admins, and primary attachments.",
  },
  {
    id: "roster",
    label: "Teams & challenges",
    description:
      "Compare available vs playing-roster teams and challenges. Add or remove from the live event.",
  },
  {
    id: "staff",
    label: "Staff roles",
    description:
      "Assign Manager, Moderator, and other limited roles for this event.",
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Create and manage organizations for this event.",
  },
  {
    id: "sponsors",
    label: "Sponsors",
    description: "Create and attach sponsors to this event.",
  },
];

function parseTab(value: string | null): Tab {
  if (
    value === "organizations" ||
    value === "sponsors" ||
    value === "staff" ||
    value === "roster" ||
    value === "details"
  ) {
    return value;
  }
  return "details";
}

type Props = { hackathonId: string };

export function EventHackathonView({ hackathonId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get("tab")));
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const loadTitle = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await getHackathon(activeId);
      setHackathon(data);
      setError(null);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
      setError(err instanceof Error ? err.message : "Failed to load hackathon");
    }
  }, [activeId, router]);

  useEffect(() => {
    void loadTitle();
  }, [loadTitle]);

  function onHackathonChange(nextId: string) {
    setActiveId(nextId);
    setSelectedHackathonId(nextId || null);
    if (nextId) {
      router.push(`/events/${nextId}/hackathon?tab=${tab}`);
    }
  }

  function onTabChange(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "details") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(
      qs
        ? `/events/${activeId}/hackathon?${qs}`
        : `/events/${activeId}/hackathon`,
    );
  }

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Hackathon"
        description={
          hackathon
            ? `Manage ${hackathonLabel(hackathon)} — details, playing roster, staff, organizations, and sponsors.`
            : "Edit this event and manage roster, staff, organizations, and sponsors."
        }
      />

      <StickyToolbar layout="stack">
        <HackathonPicker
          value={activeId}
          onChange={onHackathonChange}
          navigateOnChange={false}
        />
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={tab === item.id ? "primary" : "secondary"}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)]">{activeTab.description}</p>
      </StickyToolbar>

      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {tab === "details" ? (
        <EventHackathonDetailsPanel
          hackathonId={activeId}
          onSaved={(h) => setHackathon(h)}
        />
      ) : null}
      {tab === "roster" ? (
        <EventHackathonRosterPanel hackathonId={activeId} />
      ) : null}
      {tab === "staff" ? <EventStaffRolesPanel hackathonId={activeId} /> : null}
      {tab === "organizations" ? (
        <EventOrganizationsView hackathonId={activeId} embedded />
      ) : null}
      {tab === "sponsors" ? (
        <EventSponsorsView hackathonId={activeId} embedded />
      ) : null}
    </div>
  );
}
