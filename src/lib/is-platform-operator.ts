import type { HaasMePayload } from "@/lib/haas-access";
import { isPlatformOperator as isPlatformOperatorFromMe } from "@/lib/haas-access";

export type HaasMeSummary = HaasMePayload;

/** Root or system.admin — platform-level operators. */
export function isPlatformChallengeOperator(
  me: HaasMeSummary | null | undefined,
): boolean {
  return isPlatformOperatorFromMe(me);
}
