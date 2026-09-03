"use client";

import { PlatformDialogProvider } from "@/components/ui/platform-dialog-provider";
import { HaasAccessProvider } from "@/features/auth/haas-access-context";
import { SelectedEventProvider } from "@/features/events/selected-event-context";
import { ThemeProvider } from "@/theme/theme-provider";
import { UiPreferencesProvider } from "@/theme/ui-preferences";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UiPreferencesProvider>
        <PlatformDialogProvider>
          <HaasAccessProvider>
            <SelectedEventProvider>{children}</SelectedEventProvider>
          </HaasAccessProvider>
        </PlatformDialogProvider>
      </UiPreferencesProvider>
    </ThemeProvider>
  );
}
