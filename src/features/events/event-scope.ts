/** Sentinel used by event-scoped screens that also support an “all events” view. */
export const ALL_EVENTS_SCOPE = "__all__";

export function isAllEventsScope(id: string | null | undefined): boolean {
  return !id || id === ALL_EVENTS_SCOPE;
}
