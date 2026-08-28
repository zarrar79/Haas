"use client";

import { ThemeProvider } from "@/theme/theme-provider";
import { UiPreferencesProvider } from "@/theme/ui-preferences";
import { SelectedEventProvider } from "@/features/events/selected-event-context";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UiPreferencesProvider>
        <SelectedEventProvider>{children}</SelectedEventProvider>
      </UiPreferencesProvider>
    </ThemeProvider>
  );
}
