import { haasGet, haasSend } from "@/lib/haas-api";
import type { HackathonModules } from "@/types/hackathon";

export type EventSettings = Record<string, unknown>;

export type EventModules = HackathonModules;

export type UserRules = {
  max_attempts?: number;
  spawn_limit?: number;
  vpn_allowed?: boolean;
  force_password_policy?: boolean;
};

export type ModeScheduleBlock = {
  id?: string;
  enabled?: boolean;
  start?: string | null;
  end?: string | null;
  isPaused?: boolean;
  isInfinite?: boolean;
  isOpen?: boolean;
  phase?: string;
  sessionId?: string;
  status?: string;
};

export type PlayingEventWindow = {
  id?: string;
  start?: string | null;
  end?: string | null;
  isPaused?: boolean;
  isInfinite?: boolean;
};

export type PlayingModes = {
  ctf?: ModeScheduleBlock | null;
  koth?: ModeScheduleBlock | null;
  attackDefense?: ModeScheduleBlock | null;
};

export type ModeSchedulePatch = {
  start?: string | null;
  end?: string | null;
  enabled?: boolean;
  isPaused?: boolean;
  isInfinite?: boolean;
  /** KOTH: pin the shared session ModeSchedule / Sessions / Play window edit. */
  sessionId?: string;
};

export type PlayingState = {
  id?: string;
  /** Allow players to create/join teams. Auto-closes when the event starts. */
  is_open?: boolean;
  /** Show this event in the player Events catalog. */
  show_to_clients?: boolean;
  is_active?: boolean;
  team_count?: number;
  challenge_count?: number;
  challenges?: Array<{ id: string; name?: string }>;
  teams?: Array<{ id: string; name?: string }>;
  event?: PlayingEventWindow | null;
  modes?: PlayingModes;
  scheduleOrder?: string[];
};

export type EventSchedulePatch = {
  start?: string | null;
  end?: string | null;
  isPaused?: boolean;
  isInfinite?: boolean;
};

export type PlayingPatchBody = {
  is_open?: boolean;
  show_to_clients?: boolean;
  is_active?: boolean;
  /** Hackathon = Event envelope (not CTF). */
  event?: EventSchedulePatch;
  eventPaused?: boolean;
  ctf?: ModeSchedulePatch;
  koth?: ModeSchedulePatch;
  attackDefense?: ModeSchedulePatch;
};

export type ScoringConfig = Record<string, unknown>;

function eventPath(hackathonId: string, segment: string) {
  return `hackathons/${hackathonId}/${segment}`;
}

export function getSettings(hackathonId: string) {
  return haasGet<EventSettings>(eventPath(hackathonId, "settings"));
}

export function patchSettings(hackathonId: string, body: Partial<EventSettings>) {
  return haasSend<EventSettings>(eventPath(hackathonId, "settings"), {
    method: "PATCH",
    body,
  });
}

export function getModules(hackathonId: string) {
  return haasGet<EventModules>(eventPath(hackathonId, "modules"));
}

export function patchModules(hackathonId: string, body: Partial<EventModules>) {
  return haasSend<EventModules>(eventPath(hackathonId, "modules"), {
    method: "PATCH",
    body,
  });
}

export function getUserRules(hackathonId: string) {
  return haasGet<UserRules>(eventPath(hackathonId, "user-rules"));
}

export function patchUserRules(hackathonId: string, body: Partial<UserRules>) {
  return haasSend<UserRules>(eventPath(hackathonId, "user-rules"), {
    method: "PATCH",
    body,
  });
}

export function getPlaying(hackathonId: string) {
  return haasGet<PlayingState>(eventPath(hackathonId, "playing"));
}

export function patchPlaying(hackathonId: string, body: PlayingPatchBody) {
  return haasSend<PlayingState>(eventPath(hackathonId, "playing"), {
    method: "PATCH",
    body,
  });
}

export function getScoringConfig(hackathonId: string) {
  return haasGet<ScoringConfig>(eventPath(hackathonId, "scoring-config"));
}

export function patchScoringConfig(
  hackathonId: string,
  body: Partial<ScoringConfig>,
) {
  return haasSend<ScoringConfig>(eventPath(hackathonId, "scoring-config"), {
    method: "PATCH",
    body,
  });
}