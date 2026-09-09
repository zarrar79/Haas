import { haasList, haasListPage, haasSend } from "@/lib/haas-api";

export type QuestionAnswerRow = {
  id: string;
  answer_key_id?: string | null;
  submission_id?: string | null;
  hackathon_id?: string | null;
  hackathon_name?: string | null;
  challenge_id: string;
  challenge_name: string;
  question_id: string;
  question_name: string;
  canonical_answer: string;
  docker_ip?: string | null;
  ip_pool?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  is_dynamic: boolean;
  is_active?: boolean;
  answer_submitted?: string | null;
  answer_validity?: boolean | null;
  score?: number | null;
  submitted_at?: string | null;
};

export type ChallengeQuestionBrief = {
  id: string;
  name?: string;
  challenge?: string;
  challenge_name?: string;
};

export type AnswerKeyWriteInput = {
  challenge: string;
  challenge_question: string;
  answer: string;
  team?: string | null;
  docker_ip?: string | null;
  is_active?: boolean;
};

type ReportFilters = {
  search?: string;
  challenge?: string;
  docker_ip?: string;
  ip?: string;
  answer_validity?: string;
  mode?: string;
  page?: string;
  limit?: string;
};

function answersBasePath(hackathonId: string | null) {
  return hackathonId
    ? `hackathons/${hackathonId}/challenge-answers`
    : "challenge-answers";
}

export function listQuestionAnswerRows(
  hackathonId: string,
  filters?: ReportFilters,
) {
  return haasListPage<QuestionAnswerRow>(
    `hackathons/${hackathonId}/question-answer-rows`,
    { ...filters, limit: filters?.limit ?? "100" },
  );
}

export function listAllQuestionAnswerRows(filters?: ReportFilters) {
  return haasListPage<QuestionAnswerRow>("question-answer-rows", {
    ...filters,
    limit: filters?.limit ?? "100",
  });
}

export function listChallengeQuestions(
  hackathonId: string | null,
  filters?: { challenge?: string; search?: string },
) {
  const path = hackathonId
    ? `hackathons/${hackathonId}/challenge-questions`
    : "challenge-questions";
  return haasList<ChallengeQuestionBrief>(path, {
    challenge: filters?.challenge,
    search: filters?.search,
    limit: "200",
  });
}

export function createAnswerKey(
  hackathonId: string | null,
  body: AnswerKeyWriteInput,
) {
  return haasSend<unknown>(answersBasePath(hackathonId), {
    method: "POST",
    body,
  });
}

export function updateAnswerKey(
  hackathonId: string | null,
  answerId: string,
  body: Partial<AnswerKeyWriteInput>,
) {
  return haasSend<unknown>(`${answersBasePath(hackathonId)}/${answerId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteAnswerKey(hackathonId: string | null, answerId: string) {
  return haasSend<unknown>(`${answersBasePath(hackathonId)}/${answerId}`, {
    method: "DELETE",
  });
}

/** Resolve hackathon scope for CRUD from row + page scope. */
export function resolveAnswerHackathonScope(
  row: QuestionAnswerRow,
  pageHackathonId: string | null,
  isAllScope: boolean,
): string | null {
  if (!isAllScope && pageHackathonId) return pageHackathonId;
  if (row.hackathon_id) return row.hackathon_id;
  return null;
}
