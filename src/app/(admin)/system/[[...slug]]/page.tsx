import { EventProvisioningView } from "@/features/system/event-provisioning-view";
import { SystemConsoleView } from "@/features/system/system-console-view";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  const section = slug?.[0];
  if (section === "provisioning") {
    return <EventProvisioningView />;
  }
  return <SystemConsoleView section={section} />;
}
