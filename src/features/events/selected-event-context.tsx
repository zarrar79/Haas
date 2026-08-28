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

type SelectedEventContextValue = {
  selectedHackathonId: string | null;
  setSelectedHackathonId: (id: string | null) => void;
};

const STORAGE_KEY = "has-selected-hackathon-id";
const SelectedEventContext = createContext<SelectedEventContextValue | null>(
  null,
);

export function SelectedEventProvider({ children }: { children: ReactNode }) {
  const [selectedHackathonId, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedState(stored);
  }, []);

  const setSelectedHackathonId = useCallback((id: string | null) => {
    setSelectedState(id);
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ selectedHackathonId, setSelectedHackathonId }),
    [selectedHackathonId, setSelectedHackathonId],
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
