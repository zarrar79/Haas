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
  toggleNavPlacement: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (value: boolean) => void;
};

const STORAGE_KEY = "has-ui-preferences";

type StoredPrefs = {
  showApiTester?: boolean;
  navPlacement?: NavPlacement;
  /** @deprecated migrated to navPlacement === "header" */
  sidebarCollapsed?: boolean;
};

const UiPreferencesContext = createContext<UiPreferencesValue | null>(null);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const [showApiTester, setShowApiTesterState] = useState(false);
  const [navPlacement, setNavPlacementState] = useState<NavPlacement>("sidebar");
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
        let placement: NavPlacement = "sidebar";
        if (parsed.navPlacement === "sidebar" || parsed.navPlacement === "header") {
          placement = parsed.navPlacement;
        }
        if (parsed.sidebarCollapsed && placement === "sidebar") {
          placement = "header";
        }
        setNavPlacementState(placement);
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
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, showApiTester, navPlacement]);

  const setShowApiTester = useCallback((value: boolean) => {
    setShowApiTesterState(value);
  }, []);

  const toggleApiTester = useCallback(() => {
    setShowApiTesterState((prev) => !prev);
  }, []);

  const setNavPlacement = useCallback((value: NavPlacement) => {
    setNavPlacementState(value);
  }, []);

  const toggleNavPlacement = useCallback(() => {
    setNavPlacementState((prev) => (prev === "sidebar" ? "header" : "sidebar"));
  }, []);

  const value = useMemo(
    () => ({
      showApiTester,
      setShowApiTester,
      toggleApiTester,
      navPlacement,
      setNavPlacement,
      toggleNavPlacement,
      mobileNavOpen,
      setMobileNavOpen,
    }),
    [
      showApiTester,
      setShowApiTester,
      toggleApiTester,
      navPlacement,
      setNavPlacement,
      toggleNavPlacement,
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
