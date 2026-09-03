import { AssignedEventSync } from "@/features/events/assigned-event-sync";
import { AppShell } from "@/components/shell/app-shell";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AssignedEventSync />
      {children}
    </AppShell>
  );
}
