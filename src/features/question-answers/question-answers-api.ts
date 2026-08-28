import { callAppApi } from "@/lib/client-api";
import {
  asList,
  haasApiPath,
  unwrapHaasResult,
  type HaasForwardPayload,
} from "@/lib/haas-api";
import type { ApiResult } from "@/types";

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

async function fetchReport(path: string, filters?: ReportFilters) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(path, {
      ...filters,
      limit: filters?.limit ?? "100",
    }),
  );
  const unwrapped = unwrapHaasResult(result);
  return {
    items: asList<QuestionAnswerRow>(unwrapped.data),
    pagination: unwrapped.pagination,
    message: unwrapped.message,
  };
}

export async function listQuestionAnswerRows(
  hackathonId: string,
  filters?: ReportFilters,
) {
  return fetchReport(`hackathons/${hackathonId}/question-answer-rows`, filters);
}

export async function listAllQuestionAnswerRows(filters?: ReportFilters) {
  return fetchReport("question-answer-rows", filters);
}

export async function listChallengeQuestions(
  hackathonId: string | null,
  filters?: { challenge?: string; search?: string },
) {
  const path = hackathonId
    ? `hackathons/${hackathonId}/challenge-questions`
    : "challenge-questions";
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(path, {
      challenge: filters?.challenge,
      search: filters?.search,
      limit: "200",
    }),
  );
  return asList<ChallengeQuestionBrief>(unwrapHaasResult(result).data);
}

export async function createAnswerKey(
  hackathonId: string | null,
  body: AnswerKeyWriteInput,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(answersBasePath(hackathonId)),
    { method: "POST", body },
  );
  return unwrapHaasResult(result).data;
}

export async function updateAnswerKey(
  hackathonId: string | null,
  answerId: string,
  body: Partial<AnswerKeyWriteInput>,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`${answersBasePath(hackathonId)}/${answerId}`),
    { method: "PATCH", body },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteAnswerKey(
  hackathonId: string | null,
  answerId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    haasApiPath(`${answersBasePath(hackathonId)}/${answerId}`),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
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
