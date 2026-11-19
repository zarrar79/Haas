"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { EventModeSchedulePanel } from "@/features/events/event-mode-schedule-panel";
import {
  EventModeSubnav,
  kothSubnavItems,
} from "@/features/events/event-mode-subnav";
import { useSelectedEvent } from "@/features/events/selected-event-context";

export default function EventKothSchedulePage() {
  const params = useParams<{ hackathonId: string }>();
  const hackathonId = params.hackathonId;
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="King of the Hill"
        title="Play window"
        description="KOTH round timing is independent of the Hackathon Event envelope and CTF."
      />
      <EventModeSubnav items={kothSubnavItems(activeId)} />
      <EventModeSchedulePanel
        hackathonId={activeId}
        showEvent={false}
        visibleModes={["koth"]}
        title="KOTH schedule"
        description="Updates the latest active KOTH session start/end. Manage sessions under Sessions."
      />
    </div>
  );
}
