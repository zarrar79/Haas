import { HackathonDetailView } from "@/features/hackathons/hackathon-detail-view";

type PageProps = {
  params: Promise<{ hackathonId: string }>;
};

export default async function HackathonDetailPage({ params }: PageProps) {
  const { hackathonId } = await params;
  return <HackathonDetailView hackathonId={hackathonId} />;
}
