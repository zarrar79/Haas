/**
 * Client-safe role helper (also used from the admin shell).
 */
export type HaasMeSummary = {
  is_root?: boolean;
  system_role?: string;
};

/** Root or system.admin — platform-level operators. */
export function isPlatformChallengeOperator(
  me: HaasMeSummary | null | undefined,
): boolean {
  if (!me) return false;
  if (me.is_root) return true;

  const role = (me.system_role ?? "").trim();
  return role === "system.root" || role === "system.admin";
}
