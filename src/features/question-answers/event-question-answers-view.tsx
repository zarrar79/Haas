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
import { FilterSelect, FilterTextField, StickyToolbar } from "@/components/ui/sticky-toolbar";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { listChallengeAdmin } from "@/features/challenges/challenge-admin-api";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { useSelectedEvent } from "@/features/events/selected-event-context";
import {
  applySectionSearch,
  questionAnswerRowSearchParts,
  useSectionSearch,
} from "@/features/search/section-search";
import { QuestionAnswerFormModal } from "@/features/question-answers/question-answer-form-modal";
import {
  deleteAnswerKey,
  listQuestionAnswerRows,
  resolveAnswerHackathonScope,
  updateAnswerKey,
  type QuestionAnswerRow,
} from "@/features/question-answers/question-answers-api";
import { listTeams } from "@/features/teams/team-api";
import type { EventTeam } from "@/features/teams/team-api";
import { redirectIfUnauthorized } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type Props = { hackathonId: string };
type ModeFilter = "all" | "static" | "dynamic";
type ValidityFilter = "all" | "correct" | "incorrect" | "pending";

export function EventQuestionAnswersView({ hackathonId }: Props) {
  const { confirm } = usePlatformDialog();
  const router = useRouter();
  const { setSelectedHackathonId } = useSelectedEvent();
  const [activeId, setActiveId] = useState(hackathonId);
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
    return activeId || null;
  }

  useEffect(() => {
    setActiveId(hackathonId);
    if (hackathonId) setSelectedHackathonId(hackathonId);
  }, [hackathonId, setSelectedHackathonId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedIp(ipFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [ipFilter]);

  const load = useCallback(async () => {
    if (!activeId) return;
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
        listQuestionAnswerRows(activeId, filters),
        listChallengeAdmin(activeId),
        listTeams(activeId),
      ]);
      setRows(report.items);
      setChallenges(challengeList);
      setTeams(teamList);
    } catch (err) {
      if (redirectIfUnauthorized(err, router)) return;
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
    modeFilter,
    router,
    validityFilter,
  ]);

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
    return resolveAnswerHackathonScope(row, activeId, false);
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
        <FilterTextField
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Challenge, question, answer, team…"
        />

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

        <FilterTextField
          label="IP / pool"
          value={ipFilter}
          onChange={setIpFilter}
          placeholder="Machine IP or pool"
        />

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
