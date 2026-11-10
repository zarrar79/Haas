import { Suspense } from "react";

import { PageLoader } from "@/components/ui/loader";
import { SystemUserDetailView } from "@/features/system/system-user-detail-view";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function SystemUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  return (
    <Suspense fallback={<PageLoader />}>
      <SystemUserDetailView userId={userId} />
    </Suspense>
  );
}
