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

export type PlayingState = {
  is_open?: boolean;
  is_active?: boolean;
  challenges?: Array<{ id: string; name?: string }>;
  teams?: Array<{ id: string; name?: string }>;
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

export function patchPlaying(
  hackathonId: string,
  body: { is_open?: boolean; is_active?: boolean },
) {
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
