import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ hackathonId: string }>;
};

/** Platform detail → Event workspace Hackathon (same complete editor). */
export default async function HackathonDetailRedirectPage({ params }: PageProps) {
  const { hackathonId } = await params;
  redirect(`/events/${hackathonId}/hackathon`);
}
