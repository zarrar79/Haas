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

import { SELECTED_HACKATHON_STORAGE_KEY } from "@/lib/client-session";

type SelectedEventContextValue = {
  selectedHackathonId: string | null;
  setSelectedHackathonId: (id: string | null) => void;
  clearSession: () => void;
};

const SelectedEventContext = createContext<SelectedEventContextValue | null>(
  null,
);

export function SelectedEventProvider({ children }: { children: ReactNode }) {
  const [selectedHackathonId, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(SELECTED_HACKATHON_STORAGE_KEY);
    if (stored) setSelectedState(stored);
  }, []);

  const setSelectedHackathonId = useCallback((id: string | null) => {
    setSelectedState(id);
    if (id) window.localStorage.setItem(SELECTED_HACKATHON_STORAGE_KEY, id);
    else window.localStorage.removeItem(SELECTED_HACKATHON_STORAGE_KEY);
  }, []);

  const clearSession = useCallback(() => {
    setSelectedState(null);
    window.localStorage.removeItem(SELECTED_HACKATHON_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ selectedHackathonId, setSelectedHackathonId, clearSession }),
    [selectedHackathonId, setSelectedHackathonId, clearSession],
  );

  return (
    <SelectedEventContext.Provider value={value}>
      {children}
    </SelectedEventContext.Provider>
  );
}

export function useSelectedEvent() {
  const ctx = useContext(SelectedEventContext);
  if (!ctx) {
    throw new Error("useSelectedEvent must be used within SelectedEventProvider");
  }
  return ctx;
}
