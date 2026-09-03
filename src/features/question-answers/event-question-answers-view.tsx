"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  BulkActionBar,
  runBulkSequential,
} from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { PageHeader } from "@/components/ui/page-header";
import {
  ListPageStat,
  ListPageStats,
  ListPageStatsDot,
} from "@/components/ui/list-page-stats";
import { FilterSelect, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import { listAllChallenges } from "@/features/challenges/challenge-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import { listHackathons } from "@/features/hackathons/hackathon-api";
import {
  applySectionSearch,
  questionAnswerRowSearchParts,
  useSectionSearch,
} from "@/features/search/section-search";
import { QuestionAnswerFormModal } from "@/features/question-answers/question-answer-form-modal";
import {
  deleteAnswerKey,
  listAllQuestionAnswerRows,
  listQuestionAnswerRows,
  resolveAnswerHackathonScope,
  updateAnswerKey,
  type QuestionAnswerRow,
} from "@/features/question-answers/question-answers-api";
import { listAllTeams, listTeams } from "@/features/teams/team-api";
import type { EventTeam } from "@/features/teams/team-api";
import { ApiRequestError } from "@/lib/client-api";
import type { Hackathon } from "@/types/hackathon";

type Props = { hackathonId: string };

const ALL_HACKATHONS = "__all__";

type ModeFilter = "all" | "static" | "dynamic";
type ValidityFilter = "all" | "correct" | "incorrect" | "pending";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function EventQuestionAnswersView({ hackathonId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [activeId, setActiveId] = useState(hackathonId || ALL_HACKATHONS);
  const isAllScope = activeId === ALL_HACKATHONS || !activeId;
  const [rows, setRows] = useState<QuestionAnswerRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const { search, setSearch, debouncedSearch, focusId, clearDeepSearch } =
    useSectionSearch();
  const [ipFilter, setIpFilter] = useState("");
  const [debouncedIp, setDebouncedIp] = useState("");
  const [challengeFilter, setChallengeFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<QuestionAnswerRow | null>(null);

  function scopeHackathonId(): string | null {
    return isAllScope ? null : activeId;
  }

  useEffect(() => {
    if (hackathonId) setActiveId(hackathonId);
  }, [hackathonId]);

  useEffect(() => {
    void (async () => {
      try {
        const { items } = await listHackathons({ show_deleted: "false" });
        setHackathons(items);
      } catch {
        setHackathons([]);
      }
    })();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedIp(ipFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [ipFilter]);

  const load = useCallback(async () => {
    if (!isAllScope && !activeId) return;
    setIsLoading(true);
    setError(null);
    const filters = {
      search: debouncedSearch || undefined,
      challenge: challengeFilter || undefined,
      ip: debouncedIp || undefined,
      mode: modeFilter === "all" ? undefined : modeFilter,
      answer_validity:
        validityFilter === "correct"
          ? "true"
          : validityFilter === "incorrect"
            ? "false"
            : undefined,
      limit: "100",
    };
    try {
      const [report, challengeList, teamList] = await Promise.all([
        isAllScope
          ? listAllQuestionAnswerRows(filters)
          : listQuestionAnswerRows(activeId, filters),
        isAllScope ? listAllChallenges() : listChallengeAdmin(activeId),
        isAllScope ? listAllTeams() : listTeams(activeId),
      ]);
      setRows(report.items);
      setChallenges(challengeList);
      setTeams(teamList);
    } catch (err) {
      if (err instanceof ApiRequestError && err.httpStatus === 401) {
        router.replace("/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load question answers",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    activeId,
    challengeFilter,
    debouncedIp,
    debouncedSearch,
    isAllScope,
    modeFilter,
    router,
    validityFilter,
  ]);

  function onHackathonChange(nextId: string) {
    const id = nextId || ALL_HACKATHONS;
    setActiveId(id);
    setSelectedKeys(new Set());
    if (id && id !== ALL_HACKATHONS) {
      setSelectedHackathonId(id);
      router.push(`/events/${id}/question-answers`);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const validityFiltered =
      validityFilter === "pending"
        ? rows.filter(
            (r) => r.answer_submitted == null || r.answer_submitted === "",
          )
        : rows;

    return applySectionSearch(
      validityFiltered,
      debouncedSearch,
      focusId,
      questionAnswerRowSearchParts,
    );
  }, [rows, validityFilter, debouncedSearch, focusId]);

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selectedKeys.has(r.id)),
    [filteredRows, selectedKeys],
  );

  const dynamicCount = filteredRows.filter((r) => r.is_dynamic).length;
  const staticCount = filteredRows.length - dynamicCount;

  function rowScope(row: QuestionAnswerRow) {
    return resolveAnswerHackathonScope(row, activeId, isAllScope);
  }

  function openCreate() {
    setEditingRow(null);
    setModalOpen(true);
  }

  function openEdit(row: QuestionAnswerRow) {
    if (!row.answer_key_id) return;
    setEditingRow(row);
    setModalOpen(true);
  }

  async function toggleActive(row: QuestionAnswerRow) {
    if (!row.answer_key_id) return;
    const scope = rowScope(row);
    setBusyId(row.id);
    setError(null);
    try {
      await updateAnswerKey(scope, row.answer_key_id, {
        is_active: row.is_active === false,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(row: QuestionAnswerRow) {
    if (!row.answer_key_id) return;
    const ok = await confirm({
      title: "Delete answer key",
      message: "Delete this answer key? This soft-deletes the flag.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    const scope = rowScope(row);
    setBusyId(row.id);
    setError(null);
    try {
      await deleteAnswerKey(scope, row.answer_key_id);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function runBulk(
    label: string,
    targets: QuestionAnswerRow[],
    worker: (row: QuestionAnswerRow) => Promise<void>,
  ) {
    if (targets.length === 0) {
      setError(`No selected rows can be ${label.toLowerCase()}.`);
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      const result = await runBulkSequential(targets.map((r) => r.id), (id) => {
        const row = targets.find((r) => r.id === id);
        if (!row) return Promise.resolve();
        return worker(row);
      });
      if (result.failed > 0) {
        setError(
          `${label}: ${result.ok} succeeded, ${result.failed} failed.${result.error ? ` ${result.error}` : ""}`,
        );
      }
      setSelectedKeys(new Set());
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  function uniqueAnswerTargets(rowsToUse: QuestionAnswerRow[]) {
    const seen = new Set<string>();
    const out: QuestionAnswerRow[] = [];
    for (const row of rowsToUse) {
      const key = row.answer_key_id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  function bulkActivate(active: boolean) {
    const targets = uniqueAnswerTargets(selectedRows);
    void runBulk(active ? "Activate" : "Deactivate", targets, (row) =>
      updateAnswerKey(rowScope(row), row.answer_key_id!, {
        is_active: active,
      }).then(() => undefined),
    );
  }

  async function bulkDelete() {
    const targets = uniqueAnswerTargets(selectedRows);
    const ok = await confirm({
      title: "Delete answer keys",
      message: `Delete ${targets.length} selected answer key(s)? This soft-deletes them.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    void runBulk("Delete", targets, (row) =>
      deleteAnswerKey(rowScope(row), row.answer_key_id!).then(() => undefined),
    );
  }

  const modalHackathonId =
    editingRow != null
      ? rowScope(editingRow)
      : scopeHackathonId();

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Event workspace"
        title="Question answers"
        actions={<Button onClick={openCreate}>Create answer</Button>}
      />

      <StickyToolbar
        footer={
          <ListPageStats>
            <ListPageStat label="Rows" value={filteredRows.length} />
            <ListPageStatsDot />
            <ListPageStat label="Dynamic" value={dynamicCount} />
            <ListPageStatsDot />
            <ListPageStat label="Static" value={staticCount} />
          </ListPageStats>
        }
      >
        <FilterSelect
          label="Hackathon"
          value={activeId || ALL_HACKATHONS}
          onChange={onHackathonChange}
          className="min-w-[200px]"
        >
          <option value={ALL_HACKATHONS}>All events</option>
          {hackathons.map((h) => (
            <option key={h.id} value={h.id}>
              {h.display_name || h.name}
            </option>
          ))}
        </FilterSelect>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Challenge, question, answer, team…"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </label>

        {(search.trim() || focusId) && (
          <div className="flex items-end pb-0.5">
            <Button size="sm" variant="secondary" onClick={clearDeepSearch}>
              Clear search
            </Button>
          </div>
        )}

        <FilterSelect
          label="Challenge"
          value={challengeFilter}
          onChange={setChallengeFilter}
          className="min-w-[160px]"
        >
          <option value="">All challenges</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>

        <label className="flex min-w-[140px] flex-col gap-1 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">IP / pool</span>
          <input
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            placeholder="Machine IP or pool"
            className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-2 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </label>

        <FilterSelect
          label="Type"
          value={modeFilter}
          onChange={(v) => setModeFilter(v as ModeFilter)}
        >
          <option value="all">All</option>
          <option value="static">Static</option>
          <option value="dynamic">Dynamic</option>
        </FilterSelect>

        <FilterSelect
          label="Submission"
          value={validityFilter}
          onChange={(v) => setValidityFilter(v as ValidityFilter)}
        >
          <option value="all">All</option>
          <option value="correct">Correct only</option>
          <option value="incorrect">Incorrect only</option>
          <option value="pending">No submission yet</option>
        </FilterSelect>
      </StickyToolbar>

      <div className="mt-4">
      {error ? (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      <BulkActionBar
        selectedCount={selectedKeys.size}
        busy={bulkBusy}
        onClear={() => setSelectedKeys(new Set())}
        actions={[
          {
            id: "activate",
            label: "Activate",
            onClick: () => bulkActivate(true),
          },
          {
            id: "deactivate",
            label: "Deactivate",
            onClick: () => bulkActivate(false),
          },
          {
            id: "delete",
            label: "Delete",
            variant: "danger",
            onClick: bulkDelete,
          },
        ]}
      />

      <DataTable
        isLoading={isLoading}
        rows={filteredRows}
        rowKey={(r) => r.id}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        emptyMessage={
          debouncedSearch || focusId
            ? "No question answers match your search."
            : "No question answers match your filters."
        }
        columns={[
          ...(isAllScope
            ? [
                {
                  key: "hackathon",
                  header: "Event",
                  render: (row: QuestionAnswerRow) => (
                    <span className="font-medium">
                      {row.hackathon_name || "—"}
                    </span>
                  ),
                },
              ]
            : []),
          {
            key: "challenge",
            header: "Challenge",
            render: (row) => (
              <div>
                <div className="font-medium">{row.challenge_name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {row.is_dynamic ? (
                    <Badge tone="warning">Dynamic</Badge>
                  ) : (
                    <Badge>Static</Badge>
                  )}
                  {row.is_active === false ? (
                    <Badge tone="danger">Inactive</Badge>
                  ) : null}
                </div>
              </div>
            ),
          },
          {
            key: "question",
            header: "Question",
            render: (row) => (
              <span className="text-[var(--text)]">{row.question_name}</span>
            ),
          },
          {
            key: "answer",
            header: "Answer (flag)",
            render: (row) => (
              <CopyableText value={row.canonical_answer} mono />
            ),
          },
          {
            key: "ip",
            header: "Machine IP",
            render: (row) => <CopyableText value={row.docker_ip} mono />,
          },
          {
            key: "pool",
            header: "IP pool",
            render: (row) => <CopyableText value={row.ip_pool} mono />,
          },
          {
            key: "team",
            header: "Team",
            render: (row) => row.team_name || "—",
          },
          {
            key: "submitted",
            header: "Submitted",
            render: (row) => (
              <CopyableText value={row.answer_submitted} mono />
            ),
          },
          {
            key: "validity",
            header: "Result",
            render: (row) => {
              if (row.answer_submitted == null || row.answer_submitted === "") {
                return <Badge>Pending</Badge>;
              }
              return row.answer_validity ? (
                <Badge tone="success">Correct</Badge>
              ) : (
                <Badge tone="danger">Incorrect</Badge>
              );
            },
          },
          {
            key: "score",
            header: "Score",
            className: "text-right",
            render: (row) => (
              <span className="font-mono text-sm">
                {row.score != null ? row.score : "—"}
              </span>
            ),
          },
          {
            key: "when",
            header: "Submitted at",
            render: (row) => (
              <span className="text-xs text-[var(--text-muted)]">
                {formatDate(row.submitted_at)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-12",
            render: (row) => (
              <RowActionsMenu
                label={`Actions for ${row.question_name || row.challenge_name || "answer"}`}
                items={[
                  {
                    id: "edit",
                    label: "Edit",
                    disabled: !row.answer_key_id || busyId === row.id,
                    onClick: () => openEdit(row),
                  },
                  {
                    id: "toggle",
                    label: row.is_active === false ? "Activate" : "Deactivate",
                    disabled: !row.answer_key_id || busyId === row.id,
                    onClick: () => void toggleActive(row),
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    disabled: !row.answer_key_id || busyId === row.id,
                    destructive: true,
                    onClick: () => void removeRow(row),
                  },
                ]}
              />
            ),
          },
        ]}
      />

      <QuestionAnswerFormModal
        open={modalOpen}
        mode={editingRow ? "edit" : "create"}
        hackathonId={modalHackathonId}
        row={editingRow}
        challenges={challenges}
        teams={teams}
        onClose={() => {
          setModalOpen(false);
          setEditingRow(null);
        }}
        onSaved={() => void load()}
      />
      </div>
    </div>
  );
}
