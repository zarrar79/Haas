"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useSelectedEvent } from "@/features/events/selected-event-context";

export default function CurrentEventSectionRedirectPage() {
  const router = useRouter();
  const params = useParams<{ section: string }>();
  const { selectedHackathonId } = useSelectedEvent();

  useEffect(() => {
    if (selectedHackathonId && params.section) {
      router.replace(`/events/${selectedHackathonId}/${params.section}`);
    } else if (!selectedHackathonId) {
      router.replace("/hackathons");
    }
  }, [selectedHackathonId, params.section, router]);

  return (
    <p className="text-sm text-[var(--text-muted)]">Opening section…</p>
  );
}
