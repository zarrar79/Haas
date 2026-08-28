import { callAppApi } from "@/lib/client-api";
import { asList, unwrapHaasResult, type HaasForwardPayload } from "@/lib/haas-api";
import type { ApiResult } from "@/types";

export type ChallengeUserBrief = {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  last_name?: string;
};

export type ChallengeCreatedInHackathon = {
  id?: string;
  name?: string;
  display_name?: string;
  playing_hackathon_id?: string | null;
};

export type ChallengeSummary = {
  id: string;
  name: string;
  description?: string;
  category?: string | null;
  category_name?: string | null;
  difficulty_level?: string | null;
  difficulty_name?: string | null;
  challenge_type?: string | null;
  type_name?: string | null;
  challenge_source?: string | null;
  source_name?: string | null;
  is_active?: boolean;
  is_dynamic?: boolean;
  has_vm?: boolean;
  docker_image?: string | null;
  docker?: {
    id?: string;
    image_name?: string;
    image_tag?: string;
    machine_name?: string;
    machine_description?: string;
    docker_type?: string;
    os?: string;
    port?: number;
    flag_num?: number;
    time_limit?: number;
  } | null;
  challenge_for?: string;
  techniques?: string[];
  technique_details?: Array<{
    id: string;
    name?: string;
    parent_tag?: string | null;
  }>;
  created_by?: string | null;
  created_by_detail?: ChallengeUserBrief | null;
  created_in?: string | null;
  created_in_hackathon?: ChallengeCreatedInHackathon | null;
  playing_hackathon?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ChallengeLink = {
  id: string;
  hackathon?: string;
  challenge: string;
  challenge_name?: string;
  status: "draft" | "approved" | "deleted" | string;
  deleted_at?: string | null;
  created_at?: string;
};

export type ChallengeListFilters = {
  search?: string;
  limit?: string;
  category?: string;
  difficulty?: string;
  type?: string;
  is_dynamic?: string;
  has_vm?: string;
  mode?: string;
};

function withQuery(path: string, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** All platform challenges (Root / system.admin). */
export async function listAllChallenges(filters?: ChallengeListFilters) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    withQuery("/api/haas/challenges/", {
      search: filters?.search,
      limit: filters?.limit ?? "100",
      category: filters?.category,
      difficulty: filters?.difficulty,
      type: filters?.type,
      is_dynamic: filters?.is_dynamic,
      has_vm: filters?.has_vm,
      mode: filters?.mode,
    }),
  );
  const unwrapped = unwrapHaasResult(result);
  return asList<ChallengeSummary>(unwrapped.data);
}

/** Challenges linked to this hackathon. */
export async function listEventChallengeLinks(
  hackathonId: string,
  filters?: { search?: string; status?: string; show_deleted?: string },
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    withQuery(`/api/haas/hackathons/${hackathonId}/challenges/`, {
      search: filters?.search,
      status: filters?.status,
      show_deleted: filters?.show_deleted,
      limit: "100",
    }),
  );
  const unwrapped = unwrapHaasResult(result);
  return asList<ChallengeLink>(unwrapped.data);
}

/** Attach an existing challenge to the hackathon (creates a draft link). */
export async function attachChallengeToHackathon(
  hackathonId: string,
  challengeId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeLink>>>(
    `/api/haas/hackathons/${hackathonId}/challenges/`,
    {
      method: "POST",
      body: { challenge: challengeId },
    },
  );
  return unwrapHaasResult(result).data;
}

export async function approveChallengeLink(
  hackathonId: string,
  linkId: string,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeLink>>>(
    `/api/haas/hackathons/${hackathonId}/challenges/${linkId}/approve/`,
    { method: "POST" },
  );
  return unwrapHaasResult(result).data;
}

/** Soft-remove a challenge link from the hackathon. */
export async function removeChallengeFromHackathon(
  hackathonId: string,
  linkId: string,
  reason = "Removed from event in HAS admin",
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    `/api/haas/hackathons/${hackathonId}/challenges/${linkId}/`,
    {
      method: "DELETE",
      body: { reason },
    },
  );
  return unwrapHaasResult(result);
}

export type ChallengeCreateInput = {
  name: string;
  description?: string;
  category?: string | null;
  difficulty_level?: string | null;
  challenge_type?: string | null;
  challenge_source?: string | null;
  is_dynamic?: boolean;
  challenge_for?: string;
  hackathon?: string;
  techniques?: string[];
};

/** Platform create (Root / system.admin). Optional hackathon creates a draft link too. */
export async function createPlatformChallenge(body: ChallengeCreateInput) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeSummary>>>(
    `/api/haas/challenges/`,
    {
      method: "POST",
      body: {
        challenge_for: "hackathon",
        is_active: true,
        ...body,
      },
    },
  );
  return unwrapHaasResult(result).data;
}

/**
 * Create challenge with optional file upload (multipart).
 * Pass hackathonId for event-scoped challenge-admin; omit for platform.
 */
export async function createChallengeMultipart(
  formData: FormData,
  hackathonId?: string | null,
) {
  if (!formData.has("challenge_for")) {
    formData.set("challenge_for", "hackathon");
  }
  if (!formData.has("is_active")) {
    formData.set("is_active", "true");
  }

  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/`
    : `/api/haas/challenges/`;

  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeSummary>>>(
    path,
    { method: "POST", body: formData },
  );
  return unwrapHaasResult(result).data;
}

export async function getChallenge(
  challengeId: string,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/`
    : `/api/haas/challenges/${challengeId}/`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeDetail>>>(
    path,
  );
  return unwrapHaasResult(result).data;
}

function challengeNestedPath(
  challengeId: string,
  segment: "questions" | "answers",
  hackathonId?: string | null,
) {
  return hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/${segment}/`
    : `/api/haas/challenges/${challengeId}/${segment}/`;
}

export async function listChallengeQuestions(
  challengeId: string,
  hackathonId?: string | null,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    withQuery(challengeNestedPath(challengeId, "questions", hackathonId), {
      limit: "200",
    }),
  );
  return asList<ChallengeQuestionDetail>(unwrapHaasResult(result).data);
}

export async function listChallengeAnswers(
  challengeId: string,
  hackathonId?: string | null,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    withQuery(challengeNestedPath(challengeId, "answers", hackathonId), {
      limit: "500",
    }),
  );
  return asList<ChallengeAnswerDetail>(unwrapHaasResult(result).data);
}

export async function updateChallengeMultipart(
  challengeId: string,
  formData: FormData,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/`
    : `/api/haas/challenges/${challengeId}/`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeSummary>>>(
    path,
    { method: "PATCH", body: formData },
  );
  return unwrapHaasResult(result).data;
}

export async function setChallengeActive(
  challengeId: string,
  isActive: boolean,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/`
    : `/api/haas/challenges/${challengeId}/`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<ChallengeSummary>>>(
    path,
    { method: "PATCH", body: { is_active: isActive } },
  );
  return unwrapHaasResult(result).data;
}

export async function deleteChallenge(
  challengeId: string,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/`
    : `/api/haas/challenges/${challengeId}/`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(path, {
    method: "DELETE",
  });
  return unwrapHaasResult(result);
}

export type ChallengeQuestionInput = {
  name: string;
  description?: string;
  score?: number;
  negative_score?: number;
  default_max_attempts?: number;
  format_answer?: string;
  is_multiple?: boolean;
  is_active?: boolean;
  hints?: string;
};

export type ChallengeQuestionDetail = ChallengeQuestionInput & {
  id: string;
  challenge?: string;
  is_auto_created?: boolean;
  difficulty_level?: string | null;
  hints?: string | null;
};

export type ChallengeAnswerDetail = {
  id: string;
  challenge?: string;
  challenge_question: string;
  question_name?: string;
  answer: string;
  team?: string | null;
  team_name?: string | null;
  team_code?: string | null;
  docker_ip?: string | null;
  is_active?: boolean;
  is_deleted?: boolean;
};

export type ChallengeDetail = ChallengeSummary & {
  questions_count?: number;
  total_score?: number;
  max_allowed_attempts?: number;
  first_blood_score?: number;
  hints?: string | null;
  description_markdown?: string | null;
  file_url?: string | null;
  markdown_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  updated_by?: string | null;
  updated_by_detail?: ChallengeUserBrief | null;
};

export type ChallengeAnswerInput = {
  challenge_question: string;
  answer: string;
  team?: string | null;
  docker_ip?: string;
};

export async function createChallengeQuestion(
  challengeId: string,
  body: ChallengeQuestionInput,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/questions/`
    : `/api/haas/challenges/${challengeId}/questions/`;
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<{ id: string; name?: string }>>
  >(path, { method: "POST", body });
  return unwrapHaasResult(result).data;
}

function questionDetailPath(
  challengeId: string,
  questionId: string,
  hackathonId?: string | null,
) {
  return hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/questions/${questionId}/`
    : `/api/haas/challenges/${challengeId}/questions/${questionId}/`;
}

export async function updateChallengeQuestion(
  challengeId: string,
  questionId: string,
  body: Partial<ChallengeQuestionInput>,
  hackathonId?: string | null,
) {
  const result = await callAppApi<
    ApiResult<HaasForwardPayload<ChallengeQuestionDetail>>
  >(questionDetailPath(challengeId, questionId, hackathonId), {
    method: "PATCH",
    body,
  });
  return unwrapHaasResult(result).data;
}

export async function deleteChallengeQuestion(
  challengeId: string,
  questionId: string,
  hackathonId?: string | null,
) {
  const result = await callAppApi<ApiResult<HaasForwardPayload<unknown>>>(
    questionDetailPath(challengeId, questionId, hackathonId),
    { method: "DELETE" },
  );
  return unwrapHaasResult(result);
}

export async function createChallengeAnswer(
  challengeId: string,
  body: ChallengeAnswerInput,
  hackathonId?: string | null,
) {
  const path = hackathonId
    ? `/api/haas/hackathons/${hackathonId}/challenge-admin/${challengeId}/answers/`
    : `/api/haas/challenges/${challengeId}/answers/`;
  const result = await callAppApi<ApiResult<HaasForwardPayload<{ id: string }>>>(
    path,
    {
      method: "POST",
      body: { challenge: challengeId, ...body },
    },
  );
  return unwrapHaasResult(result).data;
}
