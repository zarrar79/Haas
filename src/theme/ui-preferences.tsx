"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NavPlacement = "sidebar" | "header";

type UiPreferencesValue = {
  /** API tester drawer — default hidden */
  showApiTester: boolean;
  setShowApiTester: (value: boolean) => void;
  toggleApiTester: () => void;
  navPlacement: NavPlacement;
  setNavPlacement: (value: NavPlacement) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
};

const STORAGE_KEY = "has-ui-preferences";

type StoredPrefs = {
  showApiTester?: boolean;
  navPlacement?: NavPlacement;
  sidebarCollapsed?: boolean;
};

const UiPreferencesContext = createContext<UiPreferencesValue | null>(null);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [showApiTester, setShowApiTesterState] = useState(false);
  const [navPlacement, setNavPlacementState] = useState<NavPlacement>("sidebar");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredPrefs;
        if (typeof parsed.showApiTester === "boolean") {
          setShowApiTesterState(parsed.showApiTester);
        }
        if (parsed.navPlacement === "sidebar" || parsed.navPlacement === "header") {
          setNavPlacementState(parsed.navPlacement);
        }
        if (typeof parsed.sidebarCollapsed === "boolean") {
          setSidebarCollapsedState(parsed.sidebarCollapsed);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: StoredPrefs = {
      showApiTester,
      navPlacement,
      sidebarCollapsed,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, showApiTester, navPlacement, sidebarCollapsed]);

  const setShowApiTester = useCallback((value: boolean) => {
    setShowApiTesterState(value);
  }, []);

  const toggleApiTester = useCallback(() => {
    setShowApiTesterState((prev) => !prev);
  }, []);

  const setNavPlacement = useCallback((value: NavPlacement) => {
    setNavPlacementState(value);
  }, []);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsedState(value);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsedState((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      showApiTester,
      setShowApiTester,
      toggleApiTester,
      navPlacement,
      setNavPlacement,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [
      showApiTester,
      setShowApiTester,
      toggleApiTester,
      navPlacement,
      setNavPlacement,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed,
      mobileNavOpen,
    ],
  );

  return (
    <UiPreferencesContext.Provider value={value}>
      {children}
    </UiPreferencesContext.Provider>
  );
}

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) {
    throw new Error("useUiPreferences must be used within UiPreferencesProvider");
  }
  return ctx;
}
