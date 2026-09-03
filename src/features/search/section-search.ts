"use client";

import { useCallback, useEffect, useState } from "react";

import type { EventTeam, TeamMember } from "@/features/teams/team-api";
import type { MachineRow } from "@/features/ops/ops-api";
import type { QuestionAnswerRow } from "@/features/question-answers/question-answers-api";

export function readUrlSearchParams() {
  if (typeof window === "undefined") {
    return { q: "", focus: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q")?.trim() ?? "",
    focus: params.get("focus")?.trim() ?? "",
  };
}

/** Search state synced from ?q= and ?focus= (global deep search navigation). */
export function useSectionSearch(debounceMs = 300) {
  const initial = readUrlSearchParams();
  const [search, setSearch] = useState(initial.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q);
  const [focusId, setFocusId] = useState(initial.focus);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      debounceMs,
    );
    return () => window.clearTimeout(timer);
  }, [search, debounceMs]);

  const clearDeepSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setFocusId("");
  }, []);

  return { search, setSearch, debouncedSearch, focusId, clearDeepSearch };
}

export function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

export function rowMatchesSearch(
  query: string,
  parts: (string | null | undefined | number | boolean)[],
) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;

  const haystack = parts
    .filter((part) => part != null && part !== "")
    .map((part) => String(part).toLowerCase())
    .join(" ");

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

export function applySectionSearch<T>(
  rows: T[],
  query: string,
  focusId: string | undefined,
  getSearchParts: (row: T) => (string | null | undefined | number | boolean)[],
  getRowId: (row: T) => string = (row) => String((row as { id: string }).id),
) {
  if (focusId) {
    const focused = rows.filter((row) => getRowId(row) === focusId);
    if (focused.length > 0) return focused;
  }

  if (!normalizeSearchQuery(query)) return rows;
  return rows.filter((row) => rowMatchesSearch(query, getSearchParts(row)));
}

function memberSearchParts(member: TeamMember) {
  const detail = member.user_detail;
  return [
    detail?.name,
    detail?.last_name,
    detail?.username,
    detail?.email,
    member.user,
  ];
}

export function teamRowSearchParts(row: EventTeam & { createdInName?: string | null }) {
  const memberParts = (row.members ?? []).flatMap((member) =>
    memberSearchParts(member),
  );
  return [
    row.name,
    row.team_code,
    row.namespace,
    row.name_code,
    row.register_as,
    row.createdInName,
    row.created_in_hackathon?.display_name,
    row.created_in_hackathon?.name,
    ...memberParts,
  ];
}

export function challengeRowSearchParts(row: {
  challengeId: string;
  name: string;
  category?: string | null;
  difficulty?: string | null;
  typeName?: string | null;
  link?: { challenge_name?: string | null };
}) {
  return [
    row.challengeId,
    row.name,
    row.category,
    row.difficulty,
    row.typeName,
    row.link?.challenge_name,
  ];
}

export function machineRowSearchParts(row: MachineRow) {
  return [
    row.id,
    row.machine_name,
    row.pod_name,
    row.namespace,
    row.ip_address,
    row.team_name,
    row.team,
    row.challenge_name,
    row.challenge,
    row.os_type,
    row.spawned_by?.name,
    row.spawned_by?.username,
    row.spawned_by?.email,
  ];
}

export function userRowSearchParts(row: {
  id: string;
  username?: string | null;
  email?: string | null;
  name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  organization_name?: string | null;
  user_type?: string | null;
}) {
  return [
    row.id,
    row.username,
    row.email,
    row.name,
    row.last_name,
    row.full_name,
    row.organization_name,
    row.user_type,
  ];
}

export function questionAnswerRowSearchParts(row: QuestionAnswerRow) {
  return [
    row.id,
    row.challenge_name,
    row.question_name,
    row.team_name,
    row.hackathon_name,
    row.docker_ip,
    row.ip_pool,
    row.canonical_answer,
    row.answer_submitted,
  ];
}
