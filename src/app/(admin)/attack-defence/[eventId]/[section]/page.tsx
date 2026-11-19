import { AdEventDetailView } from "@/features/attack-defence/event-detail-view";
import {
  adEventSectionFromPathname,
  type AdEventSectionId,
} from "@/features/attack-defence/ad-nav";

type Props = {
  params: Promise<{ eventId: string; section: string }>;
};

export default async function AttackDefenceEventSectionPage({ params }: Props) {
  const { eventId, section } = await params;
  const sectionId = adEventSectionFromPathname(
    `/attack-defence/${eventId}/${section}`,
  ) as AdEventSectionId;
  return <AdEventDetailView eventId={eventId} initialSection={sectionId} />;
}
