"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableText } from "@/components/ui/copyable-text";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { FormSkeleton } from "@/components/ui/skeleton";
import { ModalShell } from "@/components/ui/modal-shell";
import { usePlatformDialog } from "@/components/ui/platform-dialog-provider";
import { TextField } from "@/components/ui/text-field";
import {
  TABLE_ELEMENT_CLASS,
  TableScroll,
} from "@/components/ui/table-scroll";
import {
  createChallengeQuestion,
  deleteChallengeQuestion,
  getChallenge,
  listChallengeAnswers,
  listChallengeQuestions,
  updateChallengeQuestion,
  type ChallengeAnswerDetail,
  type ChallengeDetail,
  type ChallengeQuestionDetail,
  type ChallengeQuestionInput,
} from "@/features/challenges/challenge-api";
import {
  createAnswerKey,
  deleteAnswerKey,
  updateAnswerKey,
} from "@/features/question-answers/question-answers-api";
import { listAllTeams, listTeams, type EventTeam } from "@/features/teams/team-api";

type ChallengeDetailModalProps = {
  open: boolean;
  onClose: () => void;
  challengeId: string | null;
  hackathonId?: string | null;
  onEdit?: (challengeId: string) => void;
};

type QuestionDraft = {
  name: string;
  description: string;
  score: string;
  negativeScore: string;
  maxAttempts: string;
  formatAnswer: string;
  hints: string;
  isMultiple: boolean;
  isActive: boolean;
};

type AnswerDraft = {
  answer: string;
  teamId: string;
  dockerIp: string;
  isActive: boolean;
};

const INPUT_CLASS =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]";

function emptyQuestionDraft(): QuestionDraft {
  return {
    name: "",
    description: "",
    score: "0",
    negativeScore: "0",
    maxAttempts: "0",
    formatAnswer: "",
    hints: "",
    isMultiple: false,
    isActive: true,
  };
}

function questionToDraft(question: ChallengeQuestionDetail): QuestionDraft {
  return {
    name: question.name,
    description: question.description ?? "",
    score: String(question.score ?? 0),
    negativeScore: String(question.negative_score ?? 0),
    maxAttempts: String(question.default_max_attempts ?? 0),
    formatAnswer: question.format_answer ?? "",
    hints: question.hints ?? "",
    isMultiple: Boolean(question.is_multiple),
    isActive: question.is_active !== false,
  };
}

function draftToQuestionInput(draft: QuestionDraft): ChallengeQuestionInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    score: Number(draft.score) || 0,
    negative_score: Number(draft.negativeScore) || 0,
    default_max_attempts: Number(draft.maxAttempts) || 0,
    format_answer: draft.formatAnswer.trim() || undefined,
    hints: draft.hints.trim() || undefined,
    is_multiple: draft.isMultiple,
    is_active: draft.isActive,
  };
}

function emptyAnswerDraft(): AnswerDraft {
  return {
    answer: "",
    teamId: "",
    dockerIp: "",
    isActive: true,
  };
}

function answerToDraft(answer: ChallengeAnswerDetail): AnswerDraft {
  return {
    answer: answer.answer,
    teamId: answer.team ?? "",
    dockerIp: answer.docker_ip ?? "",
    isActive: answer.is_active !== false,
  };
}

function resolveTeamsHackathonId(
  challenge: ChallengeDetail | null,
  hackathonId?: string | null,
) {
  if (hackathonId) return hackathonId;
  if (!challenge) return null;
  return (
    challenge.playing_hackathon ||
    challenge.created_in ||
    challenge.created_in_hackathon?.id ||
    null
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--text)]">{value}</dd>
    </div>
  );
}

function QuestionForm({
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
  saveLabel,
}: {
  draft: QuestionDraft;
  onChange: (draft: QuestionDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  saveLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Name"
        name="question_name"
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
      />
      <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
        <span className="font-medium text-[var(--text)]">Description</span>
        <textarea
          className={`${INPUT_CLASS} min-h-[72px]`}
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Score"
          name="score"
          type="number"
          value={draft.score}
          onChange={(e) => onChange({ ...draft, score: e.target.value })}
        />
        <TextField
          label="Negative score"
          name="negative_score"
          type="number"
          value={draft.negativeScore}
          onChange={(e) =>
            onChange({ ...draft, negativeScore: e.target.value })
          }
        />
        <TextField
          label="Max attempts"
          name="max_attempts"
          type="number"
          value={draft.maxAttempts}
          onChange={(e) => onChange({ ...draft, maxAttempts: e.target.value })}
        />
        <TextField
          label="Answer format"
          name="format_answer"
          value={draft.formatAnswer}
          onChange={(e) =>
            onChange({ ...draft, formatAnswer: e.target.value })
          }
        />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)] sm:col-span-2">
          <span className="font-medium text-[var(--text)]">Hints</span>
          <textarea
            className={`${INPUT_CLASS} min-h-[56px]`}
            value={draft.hints}
            onChange={(e) => onChange({ ...draft, hints: e.target.value })}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--text)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.isMultiple}
            onChange={(e) =>
              onChange({ ...draft, isMultiple: e.target.checked })
            }
          />
          Multiple answers
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => onChange({ ...draft, isActive: e.target.checked })}
          />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={busy || !draft.name.trim()}>
          {busy ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function AnswerForm({
  draft,
  teams,
  isDynamic,
  onChange,
  onSave,
  onCancel,
  busy,
  saveLabel,
}: {
  draft: AnswerDraft;
  teams: EventTeam[];
  isDynamic?: boolean;
  onChange: (draft: AnswerDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  saveLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)]/40 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Answer (flag)"
          name="answer"
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
        />
        {isDynamic ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text)]">Team</span>
              <select
                className={INPUT_CLASS}
                value={draft.teamId}
                onChange={(e) => onChange({ ...draft, teamId: e.target.value })}
              >
                <option value="">Shared / none</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label="Docker IP"
              name="docker_ip"
              value={draft.dockerIp}
              onChange={(e) =>
                onChange({ ...draft, dockerIp: e.target.value })
              }
              placeholder="10.42.0.15"
            />
          </>
        ) : null}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => onChange({ ...draft, isActive: e.target.checked })}
        />
        Active
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={busy || !draft.answer.trim()}
        >
          {busy ? "Saving…" : saveLabel}
        </Button>
      </div>
    </div>
  );
}

function QuestionRow({
  question,
  answers,
  expanded,
  isEditing,
  questionDraft,
  editingAnswerId,
  addingAnswer,
  answerDraft,
  teams,
  isDynamic,
  busy,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onQuestionDraftChange,
  onSaveQuestion,
  onToggleQuestionActive,
  onDeleteQuestion,
  onStartAddAnswer,
  onStartEditAnswer,
  onCancelAnswerForm,
  onAnswerDraftChange,
  onSaveAnswer,
  onToggleAnswerActive,
  onDeleteAnswer,
}: {
  question: ChallengeQuestionDetail;
  answers: ChallengeAnswerDetail[];
  expanded: boolean;
  isEditing: boolean;
  questionDraft: QuestionDraft;
  editingAnswerId: string | null;
  addingAnswer: boolean;
  answerDraft: AnswerDraft;
  teams: EventTeam[];
  isDynamic?: boolean;
  busy: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onQuestionDraftChange: (draft: QuestionDraft) => void;
  onSaveQuestion: () => void;
  onToggleQuestionActive: () => void;
  onDeleteQuestion: () => void;
  onStartAddAnswer: () => void;
  onStartEditAnswer: (answer: ChallengeAnswerDetail) => void;
  onCancelAnswerForm: () => void;
  onAnswerDraftChange: (draft: AnswerDraft) => void;
  onSaveAnswer: () => void;
  onToggleAnswerActive: (answer: ChallengeAnswerDetail) => void;
  onDeleteAnswer: (answer: ChallengeAnswerDetail) => void;
}) {
  const answersTableRef = useRef<HTMLTableElement>(null);

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)]">
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] px-2 py-1 text-left transition hover:bg-[var(--surface-raised)]/60"
        >
          <span
            className="shrink-0 text-xs text-[var(--text-muted)]"
            aria-hidden
          >
            {expanded ? "▼" : "▶"}
          </span>
          <span className="min-w-0 flex-1 font-medium text-[var(--text)]">
            {question.name}
          </span>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {typeof question.score === "number" ? (
              <Badge>{question.score} pts</Badge>
            ) : null}
            <Badge tone="neutral">{answers.length} answers</Badge>
            {question.is_active === false ? (
              <Badge tone="warning">Inactive</Badge>
            ) : (
              <Badge tone="success">Active</Badge>
            )}
            {question.is_multiple ? <Badge>Multiple</Badge> : null}
          </div>
        </button>
        <RowActionsMenu
          label={`Actions for ${question.name}`}
          items={[
            {
              id: "edit",
              label: "Edit",
              disabled: busy,
              onClick: () => {
                if (!expanded) onToggle();
                onStartEdit();
              },
            },
            {
              id: "toggle",
              label: question.is_active === false ? "Activate" : "Deactivate",
              disabled: busy,
              onClick: onToggleQuestionActive,
            },
            {
              id: "delete",
              label: "Delete",
              disabled: busy,
              destructive: true,
              onClick: onDeleteQuestion,
            },
          ]}
        />
      </div>

      {expanded ? (
        <div
          className="border-t border-[var(--border)] px-4 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <QuestionForm
              draft={questionDraft}
              onChange={onQuestionDraftChange}
              onSave={onSaveQuestion}
              onCancel={onCancelEdit}
              busy={busy}
              saveLabel="Save question"
            />
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Description" value={question.description} />
              <DetailField label="Score" value={question.score} />
              <DetailField
                label="Negative score"
                value={question.negative_score}
              />
              <DetailField
                label="Max attempts"
                value={question.default_max_attempts}
              />
              <DetailField
                label="Answer format"
                value={question.format_answer}
              />
              <DetailField
                label="Difficulty"
                value={question.difficulty_level}
              />
              <DetailField label="Hints" value={question.hints} />
              <DetailField
                label="Auto-created"
                value={question.is_auto_created ? "Yes" : undefined}
              />
            </dl>
          )}

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Answer keys
              </h4>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || addingAnswer || Boolean(editingAnswerId)}
                onClick={onStartAddAnswer}
              >
                Add answer
              </Button>
            </div>

            {addingAnswer ? (
              <div className="mb-3">
                <AnswerForm
                  draft={answerDraft}
                  teams={teams}
                  isDynamic={isDynamic}
                  onChange={onAnswerDraftChange}
                  onSave={onSaveAnswer}
                  onCancel={onCancelAnswerForm}
                  busy={busy}
                  saveLabel="Create answer"
                />
              </div>
            ) : null}

            {answers.length === 0 && !addingAnswer ? (
              <p className="text-sm text-[var(--text-muted)]">
                No answer keys for this question.
              </p>
            ) : (
              <TableScroll tableRef={answersTableRef}>
                <table ref={answersTableRef} className={TABLE_ELEMENT_CLASS}>
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--text-muted)]">
                      <th className="px-3 py-2">Answer</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Docker IP</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((answer) =>
                      editingAnswerId === answer.id ? (
                        <tr key={answer.id}>
                          <td colSpan={5} className="px-3 py-2">
                            <AnswerForm
                              draft={answerDraft}
                              teams={teams}
                              isDynamic={isDynamic}
                              onChange={onAnswerDraftChange}
                              onSave={onSaveAnswer}
                              onCancel={onCancelAnswerForm}
                              busy={busy}
                              saveLabel="Save answer"
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={answer.id}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-3 py-2">
                            <CopyableText
                              value={answer.answer}
                              mono
                              maxWidthClass="max-w-[320px]"
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-[var(--text)]">
                            {answer.team_name || answer.team_code || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <CopyableText
                              value={answer.docker_ip}
                              mono
                              maxWidthClass="max-w-[160px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {answer.is_deleted ? (
                              <Badge tone="warning">Deleted</Badge>
                            ) : answer.is_active === false ? (
                              <Badge tone="warning">Inactive</Badge>
                            ) : (
                              <Badge tone="success">Active</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <RowActionsMenu
                              label={`Actions for answer ${answer.id}`}
                              items={[
                                {
                                  id: "edit",
                                  label: "Edit",
                                  disabled: busy || addingAnswer,
                                  onClick: () => onStartEditAnswer(answer),
                                },
                                {
                                  id: "toggle",
                                  label:
                                    answer.is_active === false
                                      ? "Activate"
                                      : "Deactivate",
                                  disabled: busy,
                                  onClick: () => onToggleAnswerActive(answer),
                                },
                                {
                                  id: "delete",
                                  label: "Delete",
                                  disabled: busy,
                                  destructive: true,
                                  onClick: () => onDeleteAnswer(answer),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChallengeDetailModal({
  open,
  onClose,
  challengeId,
  hackathonId,
  onEdit,
}: ChallengeDetailModalProps) {
  const { confirm } = usePlatformDialog();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [questions, setQuestions] = useState<ChallengeQuestionDetail[]>([]);
  const [answers, setAnswers] = useState<ChallengeAnswerDetail[]>([]);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(
    emptyQuestionDraft,
  );
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(
    emptyQuestionDraft,
  );
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [addingAnswerForQuestionId, setAddingAnswerForQuestionId] = useState<
    string | null
  >(null);
  const [answerDraft, setAnswerDraft] = useState<AnswerDraft>(emptyAnswerDraft);
  const [answerQuestionId, setAnswerQuestionId] = useState<string | null>(
    null,
  );

  const resetEditors = useCallback(() => {
    setAddingQuestion(false);
    setNewQuestionDraft(emptyQuestionDraft());
    setEditingQuestionId(null);
    setQuestionDraft(emptyQuestionDraft());
    setEditingAnswerId(null);
    setAddingAnswerForQuestionId(null);
    setAnswerDraft(emptyAnswerDraft());
    setAnswerQuestionId(null);
  }, []);

  const load = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, questionList, answerList] = await Promise.all([
        getChallenge(challengeId, hackathonId),
        listChallengeQuestions(challengeId, hackathonId),
        listChallengeAnswers(challengeId, hackathonId),
      ]);
      setChallenge(detail);
      setQuestions(questionList);
      setAnswers(answerList);

      const scopeId = resolveTeamsHackathonId(detail, hackathonId);
      if (scopeId) {
        try {
          const teamList = await listTeams(scopeId, { limit: "200" });
          setTeams(teamList);
        } catch {
          setTeams([]);
        }
      } else {
        try {
          const teamList = await listAllTeams({ limit: "200" });
          setTeams(teamList);
        } catch {
          setTeams([]);
        }
      }
    } catch (err) {
      setChallenge(null);
      setQuestions([]);
      setAnswers([]);
      setTeams([]);
      setError(
        err instanceof Error ? err.message : "Failed to load challenge details",
      );
    } finally {
      setLoading(false);
    }
  }, [challengeId, hackathonId]);

  useEffect(() => {
    if (!open || !challengeId) {
      setChallenge(null);
      setQuestions([]);
      setAnswers([]);
      setTeams([]);
      setExpandedQuestions(new Set());
      resetEditors();
      setError(null);
      return;
    }
    void load();
  }, [open, challengeId, load, resetEditors]);

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, ChallengeAnswerDetail[]>();
    for (const answer of answers) {
      const key = answer.challenge_question;
      const list = map.get(key) ?? [];
      list.push(answer);
      map.set(key, list);
    }
    return map;
  }, [answers]);

  function toggleQuestion(id: string) {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      resetEditors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveNewQuestion() {
    if (!challengeId || !newQuestionDraft.name.trim()) return;
    await runAction(async () => {
      const created = await createChallengeQuestion(
        challengeId,
        draftToQuestionInput(newQuestionDraft),
        hackathonId,
      );
      setExpandedQuestions((prev) => new Set(prev).add(created.id));
    });
  }

  async function saveQuestionEdit(questionId: string) {
    if (!challengeId || !questionDraft.name.trim()) return;
    await runAction(async () => {
      await updateChallengeQuestion(
        challengeId,
        questionId,
        draftToQuestionInput(questionDraft),
        hackathonId,
      );
    });
  }

  async function toggleQuestionActive(question: ChallengeQuestionDetail) {
    if (!challengeId) return;
    const next = question.is_active === false;
    await runAction(async () => {
      await updateChallengeQuestion(
        challengeId,
        question.id,
        { is_active: next },
        hackathonId,
      );
    });
  }

  async function removeQuestion(question: ChallengeQuestionDetail) {
    if (!challengeId) return;
    const ok = await confirm({
      title: "Delete question",
      message: `Delete question "${question.name}"? This deactivates the question.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    await runAction(async () => {
      await deleteChallengeQuestion(
        challengeId,
        question.id,
        hackathonId,
      );
    });
  }

  async function saveAnswer() {
    if (!challengeId || !answerQuestionId || !answerDraft.answer.trim()) return;
    const body = {
      challenge: challengeId,
      challenge_question: answerQuestionId,
      answer: answerDraft.answer.trim(),
      team: answerDraft.teamId || null,
      docker_ip: answerDraft.dockerIp.trim() || null,
      is_active: answerDraft.isActive,
    };
    await runAction(async () => {
      if (editingAnswerId) {
        await updateAnswerKey(hackathonId ?? null, editingAnswerId, body);
      } else {
        await createAnswerKey(hackathonId ?? null, body);
      }
    });
  }

  async function toggleAnswerActive(answer: ChallengeAnswerDetail) {
    if (!challengeId) return;
    const next = answer.is_active === false;
    await runAction(async () => {
      await updateAnswerKey(hackathonId ?? null, answer.id, {
        challenge: challengeId,
        challenge_question: answer.challenge_question,
        answer: answer.answer,
        team: answer.team ?? null,
        docker_ip: answer.docker_ip ?? null,
        is_active: next,
      });
    });
  }

  async function removeAnswer(answer: ChallengeAnswerDetail) {
    const ok = await confirm({
      title: "Delete answer key",
      message: "Delete this answer key? This soft-deletes the answer.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) {
      return;
    }
    await runAction(async () => {
      await deleteAnswerKey(hackathonId ?? null, answer.id);
    });
  }

  function startEditQuestion(question: ChallengeQuestionDetail) {
    setEditingQuestionId(question.id);
    setQuestionDraft(questionToDraft(question));
    setAddingQuestion(false);
    cancelAnswerForm();
  }

  function cancelQuestionEdit() {
    setEditingQuestionId(null);
    setQuestionDraft(emptyQuestionDraft());
  }

  function cancelAnswerForm() {
    setEditingAnswerId(null);
    setAddingAnswerForQuestionId(null);
    setAnswerDraft(emptyAnswerDraft());
    setAnswerQuestionId(null);
  }

  function startAddAnswer(questionId: string) {
    setAddingAnswerForQuestionId(questionId);
    setAnswerQuestionId(questionId);
    setAnswerDraft(emptyAnswerDraft());
    setEditingAnswerId(null);
    setEditingQuestionId(null);
  }

  function startEditAnswer(
    questionId: string,
    answer: ChallengeAnswerDetail,
  ) {
    setEditingAnswerId(answer.id);
    setAnswerQuestionId(questionId);
    setAnswerDraft(answerToDraft(answer));
    setAddingAnswerForQuestionId(null);
  }

  const docker = challenge?.docker;
  const techniques =
    challenge?.technique_details?.map((t) => t.name).filter(Boolean) ??
    challenge?.techniques ??
    [];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-4xl"
      ariaLabel="Challenge details"
    >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-[var(--text)]">
              {loading && !challenge
                ? "Loading challenge…"
                : challenge?.name ?? "Challenge details"}
            </h2>
            {challenge ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {challenge.is_dynamic ? (
                  <Badge tone="warning">Dynamic</Badge>
                ) : (
                  <Badge>Static</Badge>
                )}
                {challenge.has_vm ? (
                  <Badge tone="success">VM</Badge>
                ) : (
                  <Badge>Non-VM</Badge>
                )}
                {challenge.is_active === false ? (
                  <Badge tone="warning">Inactive</Badge>
                ) : (
                  <Badge tone="success">Active</Badge>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            {onEdit && challengeId ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onEdit(challengeId);
                  onClose();
                }}
              >
                Edit challenge
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
          {loading && !challenge ? (
            <FormSkeleton fields={8} />
          ) : challenge ? (
            <div className="flex flex-col gap-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
                  Overview
                </h3>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailField label="Type" value={challenge.type_name} />
                  <DetailField label="Category" value={challenge.category_name} />
                  <DetailField
                    label="Difficulty"
                    value={challenge.difficulty_name}
                  />
                  <DetailField label="Source" value={challenge.source_name} />
                  <DetailField
                    label="Questions"
                    value={challenge.questions_count}
                  />
                  <DetailField
                    label="Total score"
                    value={challenge.total_score}
                  />
                  <DetailField
                    label="Max attempts"
                    value={challenge.max_allowed_attempts}
                  />
                  <DetailField
                    label="First blood"
                    value={challenge.first_blood_score}
                  />
                  <DetailField
                    label="Created in"
                    value={
                      challenge.created_in_hackathon?.display_name ||
                      challenge.created_in_hackathon?.name
                    }
                  />
                </dl>
                {challenge.description ? (
                  <div className="mt-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Description
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">
                      {challenge.description}
                    </dd>
                  </div>
                ) : null}
                {challenge.hints ? (
                  <div className="mt-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Hints
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">
                      {challenge.hints}
                    </dd>
                  </div>
                ) : null}
                {techniques.length > 0 ? (
                  <div className="mt-4">
                    <dt className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Techniques
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {techniques.map((name) => (
                        <Badge key={name}>{name}</Badge>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {docker ? (
                  <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-3">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Docker / VM
                    </h4>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <DetailField
                        label="Image"
                        value={
                          docker.image_name
                            ? `${docker.image_name}:${docker.image_tag ?? "latest"}`
                            : challenge.docker_image
                        }
                      />
                      <DetailField label="Machine" value={docker.machine_name} />
                      <DetailField label="OS" value={docker.os} />
                      <DetailField label="Port" value={docker.port} />
                      <DetailField label="Flags" value={docker.flag_num} />
                      <DetailField
                        label="Time limit"
                        value={
                          docker.time_limit != null
                            ? `${docker.time_limit}s`
                            : undefined
                        }
                      />
                    </dl>
                  </div>
                ) : null}
                {challenge.file_url || challenge.markdown_url ? (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {challenge.file_url ? (
                      <a
                        href={challenge.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        Download file
                        {challenge.file_name ? ` (${challenge.file_name})` : ""}
                      </a>
                    ) : null}
                    {challenge.markdown_url ? (
                      <a
                        href={challenge.markdown_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        View markdown
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Questions
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">
                      {questions.length} total · expand to edit
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || addingQuestion}
                      onClick={() => {
                        setAddingQuestion(true);
                        setNewQuestionDraft(emptyQuestionDraft());
                        cancelQuestionEdit();
                        cancelAnswerForm();
                      }}
                    >
                      Add question
                    </Button>
                  </div>
                </div>

                {addingQuestion ? (
                  <div className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] p-4">
                    <h4 className="mb-3 text-sm font-medium text-[var(--text)]">
                      New question
                    </h4>
                    <QuestionForm
                      draft={newQuestionDraft}
                      onChange={setNewQuestionDraft}
                      onSave={() => void saveNewQuestion()}
                      onCancel={() => {
                        setAddingQuestion(false);
                        setNewQuestionDraft(emptyQuestionDraft());
                      }}
                      busy={busy}
                      saveLabel="Create question"
                    />
                  </div>
                ) : null}

                {questions.length === 0 && !addingQuestion ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    No questions defined for this challenge.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {questions.map((question) => (
                      <QuestionRow
                        key={question.id}
                        question={question}
                        answers={answersByQuestion.get(question.id) ?? []}
                        expanded={expandedQuestions.has(question.id)}
                        isEditing={editingQuestionId === question.id}
                        questionDraft={questionDraft}
                        editingAnswerId={
                          answerQuestionId === question.id
                            ? editingAnswerId
                            : null
                        }
                        addingAnswer={addingAnswerForQuestionId === question.id}
                        answerDraft={answerDraft}
                        teams={teams}
                        isDynamic={challenge.is_dynamic}
                        busy={busy}
                        onToggle={() => toggleQuestion(question.id)}
                        onStartEdit={() => startEditQuestion(question)}
                        onCancelEdit={cancelQuestionEdit}
                        onQuestionDraftChange={setQuestionDraft}
                        onSaveQuestion={() => void saveQuestionEdit(question.id)}
                        onToggleQuestionActive={() =>
                          void toggleQuestionActive(question)
                        }
                        onDeleteQuestion={() => void removeQuestion(question)}
                        onStartAddAnswer={() => startAddAnswer(question.id)}
                        onStartEditAnswer={(answer) =>
                          startEditAnswer(question.id, answer)
                        }
                        onCancelAnswerForm={cancelAnswerForm}
                        onAnswerDraftChange={setAnswerDraft}
                        onSaveAnswer={() => void saveAnswer()}
                        onToggleAnswerActive={(answer) =>
                          void toggleAnswerActive(answer)
                        }
                        onDeleteAnswer={(answer) => void removeAnswer(answer)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
    </ModalShell>
  );
}
