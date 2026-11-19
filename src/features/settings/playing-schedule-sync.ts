/** Same-tab broadcast when Event / CTF / KOTH schedules change. */

type Listener = (hackathonId: string) => void;

const listeners = new Set<Listener>();

export function notifyPlayingScheduleChanged(hackathonId: string) {
  if (!hackathonId) return;
  for (const listener of listeners) {
    try {
      listener(hackathonId);
    } catch {
      // ignore listener errors
    }
  }
}

export function onPlayingScheduleChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
