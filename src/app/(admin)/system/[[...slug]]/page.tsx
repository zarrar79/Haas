import { SystemConsoleView } from "@/features/system/system-console-view";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  const section = slug?.[0];
  return <SystemConsoleView section={section} />;
}
