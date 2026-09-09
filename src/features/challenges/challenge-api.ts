import { haasGet, haasList, haasSend } from "@/lib/haas-api";
import type { UserBrief } from "@/types";

export type ChallengeUserBrief = UserBrief;

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
    kind?: string;
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
  hackathon?: string;
};

function challengeAdminPath(
  challengeId: string,
  hackathonId?: string | null,
) {
  return hackathonId
    ? `hackathons/${hackathonId}/challenge-admin/${challengeId}`
    : `challenges/${challengeId}`;
}

function challengeNestedPath(
  challengeId: string,
  segment: "questions" | "answers",
  hackathonId?: string | null,
) {
  return `${challengeAdminPath(challengeId, hackathonId)}/${segment}`;
}

function questionDetailPath(
  challengeId: string,
  questionId: string,
  hackathonId?: string | null,
) {
  return `${challengeNestedPath(challengeId, "questions", hackathonId)}/${questionId}`;
}

/** Platform challenge list (scoped to assigned events for hackathon admins). */
export function listAllChallenges(filters?: ChallengeListFilters) {
  return haasList<ChallengeSummary>("challenge-list", {
    search: filters?.search,
    limit: filters?.limit ?? "100",
    category: filters?.category,
    difficulty: filters?.difficulty,
    type: filters?.type,
    is_dynamic: filters?.is_dynamic,
    has_vm: filters?.has_vm,
    mode: filters?.mode,
    hackathonId: filters?.hackathon,
    hackathon: filters?.hackathon,
  });
}

/** Challenges linked to this hackathon. */
export function listEventChallengeLinks(
  hackathonId: string,
  filters?: { search?: string; status?: string; show_deleted?: string },
) {
  return haasList<ChallengeLink>(`hackathons/${hackathonId}/challenges`, {
    search: filters?.search,
    status: filters?.status,
    show_deleted: filters?.show_deleted,
    limit: "100",
  });
}

/** Attach an existing challenge to the hackathon (creates a draft link). */
export function attachChallengeToHackathon(
  hackathonId: string,
  challengeId: string,
) {
  return haasSend<ChallengeLink>(`hackathons/${hackathonId}/challenges`, {
    method: "POST",
    body: { challenge: challengeId },
  });
}

export function approveChallengeLink(hackathonId: string, linkId: string) {
  return haasSend<ChallengeLink>(
    `hackathons/${hackathonId}/challenges/${linkId}/approve`,
    { method: "POST" },
  );
}

/** Soft-remove a challenge link from the hackathon. */
export function removeChallengeFromHackathon(
  hackathonId: string,
  linkId: string,
  reason = "Removed from event in HAS admin",
) {
  return haasSend<unknown>(`hackathons/${hackathonId}/challenges/${linkId}`, {
    method: "DELETE",
    body: { reason },
  });
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
export function createPlatformChallenge(body: ChallengeCreateInput) {
  return haasSend<ChallengeSummary>("challenges", {
    method: "POST",
    body: {
      challenge_for: "hackathon",
      is_active: true,
      ...body,
    },
  });
}

/**
 * Create challenge with optional file upload (multipart).
 * Pass hackathonId for event-scoped challenge-admin; omit for platform.
 */
export function createChallengeMultipart(
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
    ? `hackathons/${hackathonId}/challenge-admin`
    : "challenges";
  return haasSend<ChallengeSummary>(path, { method: "POST", body: formData });
}

export function getChallenge(
  challengeId: string,
  hackathonId?: string | null,
) {
  return haasGet<ChallengeDetail>(challengeAdminPath(challengeId, hackathonId));
}

export function listChallengeQuestions(
  challengeId: string,
  hackathonId?: string | null,
) {
  return haasList<ChallengeQuestionDetail>(
    challengeNestedPath(challengeId, "questions", hackathonId),
    { limit: "200" },
  );
}

export function listChallengeAnswers(
  challengeId: string,
  hackathonId?: string | null,
) {
  return haasList<ChallengeAnswerDetail>(
    challengeNestedPath(challengeId, "answers", hackathonId),
    { limit: "500" },
  );
}

export function updateChallengeMultipart(
  challengeId: string,
  formData: FormData,
  hackathonId?: string | null,
) {
  return haasSend<ChallengeSummary>(
    challengeAdminPath(challengeId, hackathonId),
    { method: "PATCH", body: formData },
  );
}

export function setChallengeActive(
  challengeId: string,
  isActive: boolean,
  hackathonId?: string | null,
) {
  return haasSend<ChallengeSummary>(
    challengeAdminPath(challengeId, hackathonId),
    { method: "PATCH", body: { is_active: isActive } },
  );
}

export function deleteChallenge(
  challengeId: string,
  hackathonId?: string | null,
) {
  return haasSend<unknown>(challengeAdminPath(challengeId, hackathonId), {
    method: "DELETE",
  });
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

export function createChallengeQuestion(
  challengeId: string,
  body: ChallengeQuestionInput,
  hackathonId?: string | null,
) {
  return haasSend<{ id: string; name?: string }>(
    challengeNestedPath(challengeId, "questions", hackathonId),
    { method: "POST", body },
  );
}

export function updateChallengeQuestion(
  challengeId: string,
  questionId: string,
  body: Partial<ChallengeQuestionInput>,
  hackathonId?: string | null,
) {
  return haasSend<ChallengeQuestionDetail>(
    questionDetailPath(challengeId, questionId, hackathonId),
    { method: "PATCH", body },
  );
}

export function deleteChallengeQuestion(
  challengeId: string,
  questionId: string,
  hackathonId?: string | null,
) {
  return haasSend<unknown>(
    questionDetailPath(challengeId, questionId, hackathonId),
    { method: "DELETE" },
  );
}

export function createChallengeAnswer(
  challengeId: string,
  body: ChallengeAnswerInput,
  hackathonId?: string | null,
) {
  return haasSend<{ id: string }>(
    challengeNestedPath(challengeId, "answers", hackathonId),
    { method: "POST", body: { challenge: challengeId, ...body } },
  );
}


