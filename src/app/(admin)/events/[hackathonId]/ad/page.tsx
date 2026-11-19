"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import {
  EventModeSubnav,
  adSubnavItems,
} from "@/features/events/event-mode-subnav";
import { useSelectedEvent } from "@/features/events/selected-event-context";

export default function EventAttackDefensePage() {
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
        eyebrow="Attack & Defense"
        title="Play window"
        description="A&D track for this event. Schedule and scoring come next — shell is ready."
      />
      <EventModeSubnav items={adSubnavItems(activeId)} />
      <Alert variant="info">
        Attack &amp; Defense timing and ops tabs are stubbed for now. CTF and
        KOTH schedules are available under their mode umbrellas.
      </Alert>
    </div>
  );
}