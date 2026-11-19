import { EventCtfTabShell } from "@/features/ctf/event-ctf-tab-shell";

type PageProps = {
  params: Promise<{ hackathonId: string; tab: string }>;
};

export default async function EventCtfTabPage({ params }: PageProps) {
  const { hackathonId, tab } = await params;
  return <EventCtfTabShell hackathonId={hackathonId} tab={tab} />;
}
