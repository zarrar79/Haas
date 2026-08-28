/** Capability strings returned by GET /haas/me/ → permissions (matches backend). */
export const HaasCapability = {
  HACKATHON_CREATE: "hackathon.create",
  HACKATHON_READ: "hackathon.read",
  HACKATHON_UPDATE: "hackathon.update",
  SETTINGS_UPDATE: "settings.update",
  SETTINGS_OPS: "settings.ops",
  USER_MANAGE: "users.manage",
  USER_BLOCK: "users.block",
  SCORE_VIEW: "scores.view",
  SCORE_SOFT_DELETE: "scores.soft_delete",
  ACTIVITY_VIEW: "activity.view",
  ACTIVITY_VIEW_OWN: "activity.view_own",
  NOTIFY_SEND: "notifications.send",
  NOTIFY_VIEW: "notifications.view",
  MACHINE_CONTROL: "machines.control",
  MACHINE_VIEW: "machines.view",
  ANALYTICS_VIEW: "analytics.view",
  TEAM_MANAGE: "teams.manage",
  CHALLENGE_CREATE: "challenges.create",
} as const;

export type HaasCapabilityName =
  (typeof HaasCapability)[keyof typeof HaasCapability];
