import { AdEventDetailView } from "@/features/attack-defence/event-detail-view";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function AttackDefenceEventPage({ params }: Props) {
  const { eventId } = await params;
  return <AdEventDetailView eventId={eventId} initialSection="overview" />;
}
