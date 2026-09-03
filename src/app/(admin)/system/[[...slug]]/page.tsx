import { SystemConsoleView } from "@/features/system/system-console-view";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export default async function SystemPage({ params }: PageProps) {
  const { slug } = await params;
  return <SystemConsoleView section={slug?.[0]} />;
}
