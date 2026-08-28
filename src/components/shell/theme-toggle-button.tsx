"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/theme-provider";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="secondary" size="sm" onClick={toggleTheme}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </Button>
  );
}
