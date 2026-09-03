/** Auth/session keys in localStorage — cleared on logout (not theme/UI prefs). */
export const CLIENT_SESSION_STORAGE_KEYS = [
  "has-selected-hackathon-id",
] as const;

export function clearClientSessionStorage() {
  if (typeof window === "undefined") return;
  for (const key of CLIENT_SESSION_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
  window.sessionStorage.clear();
}

/** Full document reload — drops all in-memory React/Next state and refetches assets. */
export function hardReloadApplication(path = "/login") {
  if (typeof window === "undefined") return;
  clearClientSessionStorage();
  window.history.replaceState(null, "", path);
  window.location.reload();
}

export const SELECTED_HACKATHON_STORAGE_KEY = CLIENT_SESSION_STORAGE_KEYS[0];
