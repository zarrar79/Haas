import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import { listAllChallenges } from "@/features/challenges/challenge-api";
import { listMachines } from "@/features/ops/ops-api";
import { listQuestionAnswerRows } from "@/features/question-answers/question-answers-api";
import { listAllTeams, listTeams } from "@/features/teams/team-api";

export type GlobalSearchResultType =
  | "challenge"
  | "team"
  | "machine"
  | "question";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

function looksLikeIp(query: string) {
  return /^[\d.a-fA-F:]+$/.test(query.trim());
}

function sectionHref(
  hackathonId: string | null,
  section: string,
  query: string,
  focusId?: string,
) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (focusId) params.set("focus", focusId);
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";
  if (hackathonId) {
    return `/events/${hackathonId}/${section}${suffix}`;
  }
  if (section === "teams") return `/teams${suffix}`;
  if (section === "challenges") return `/challenges${suffix}`;
  return `/hackathons${suffix}`;
}

export async function runGlobalSearch(
  hackathonId: string | null,
  query: string,
): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const results: GlobalSearchResult[] = [];
  const ipLike = looksLikeIp(q);

  if (hackathonId) {
    const [challenges, teams, machines, questionReport] = await Promise.all([
      listChallengeAdmin(hackathonId, { search: q }).catch(() => []),
      listTeams(hackathonId, { search: q, limit: "30" }).catch(() => []),
      listMachines(hackathonId, {
        search: ipLike ? undefined : q,
        ip: ipLike ? q : undefined,
        limit: "30",
      }).catch(() => []),
      listQuestionAnswerRows(hackathonId, {
        search: q,
        docker_ip: ipLike ? q : undefined,
        limit: "30",
      }).catch(() => ({ items: [] as Awaited<ReturnType<typeof listQuestionAnswerRows>>["items"] })),
    ]);
    const questions = questionReport.items;

    for (const row of challenges.slice(0, 8)) {
      results.push({
        id: `challenge-${row.id}`,
        type: "challenge",
        title: row.name || "Challenge",
        subtitle: row.category || row.difficulty_level || row.id,
        href: sectionHref(hackathonId, "challenges", q, row.id),
      });
    }

    for (const row of teams.slice(0, 8)) {
      results.push({
        id: `team-${row.id}`,
        type: "team",
        title: row.name || "Team",
        subtitle: row.team_code || row.register_as || undefined,
        href: sectionHref(hackathonId, "teams", q, row.id),
      });
    }

    for (const row of machines.slice(0, 8)) {
      results.push({
        id: `machine-${row.id}`,
        type: "machine",
        title: row.machine_name || row.pod_name || "Machine",
        subtitle: [row.ip_address, row.team_name, row.challenge_name]
          .filter(Boolean)
          .join(" · "),
        href: sectionHref(hackathonId, "machines", q, row.id),
      });
    }

    for (const row of questions.slice(0, 8)) {
      results.push({
        id: `question-${row.id}`,
        type: "question",
        title: row.question_name || "Question",
        subtitle: [row.challenge_name, row.team_name, row.docker_ip]
          .filter(Boolean)
          .join(" · "),
        href: sectionHref(hackathonId, "question-answers", q, row.id),
      });
    }

    return results;
  }

  const [teams, challenges] = await Promise.all([
    listAllTeams({ search: q, limit: "15" }).catch(() => []),
    listAllChallenges({ search: q, limit: "15" }).catch(() => []),
  ]);

  for (const row of challenges.slice(0, 6)) {
    results.push({
      id: `challenge-${row.id}`,
      type: "challenge",
      title: row.name || "Challenge",
      subtitle: row.category || undefined,
      href: sectionHref(null, "challenges", q, row.id),
    });
  }

  for (const row of teams.slice(0, 6)) {
    results.push({
      id: `team-${row.id}`,
      type: "team",
      title: row.name || "Team",
      subtitle: row.team_code || undefined,
      href: sectionHref(null, "teams", q, row.id),
    });
  }

  return results;
}

export const SEARCH_TYPE_LABELS: Record<GlobalSearchResultType, string> = {
  challenge: "Challenge",
  team: "Team",
  machine: "Machine",
  question: "Question",
};
