"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import {
  createAnswerKey,
  listChallengeQuestions,
  updateAnswerKey,
  type QuestionAnswerRow,
} from "@/features/question-answers/question-answers-api";
import type { EventTeam } from "@/features/teams/team-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string | null;
  row?: QuestionAnswerRow | null;
  challenges: ChallengeSummary[];
  teams: EventTeam[];
  onClose: () => void;
  onSaved: () => void;
};

export function QuestionAnswerFormModal({
  open,
  mode,
  hackathonId,
  row,
  challenges,
  teams,
  onClose,
  onSaved,
}: Props) {
  const [challengeId, setChallengeId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [answer, setAnswer] = useState("");
  const [teamId, setTeamId] = useState("");
  const [dockerIp, setDockerIp] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<
    { id: string; name?: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && row) {
      setChallengeId(row.challenge_id);
      setQuestionId(row.question_id);
      setAnswer(row.canonical_answer || "");
      setTeamId(row.team_id || "");
      setDockerIp(row.docker_ip || "");
      setIsActive(row.is_active !== false);
    } else {
      setChallengeId(challenges[0]?.id || "");
      setQuestionId("");
      setAnswer("");
      setTeamId("");
      setDockerIp("");
      setIsActive(true);
    }
  }, [open, mode, row, challenges]);

  useEffect(() => {
    if (!open || !challengeId) {
      setQuestions([]);
      return;
    }
    let cancelled = false;
    void listChallengeQuestions(hackathonId, { challenge: challengeId })
      .then((items) => {
        if (!cancelled) setQuestions(items);
      })
      .catch(() => {
        if (!cancelled) setQuestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, challengeId, hackathonId]);

  useEffect(() => {
    if (!open || mode !== "create") return;
    if (questionId && questions.some((q) => q.id === questionId)) return;
    if (questions.length === 1) setQuestionId(questions[0].id);
  }, [open, mode, questions, questionId]);

  async function submit() {
    if (!challengeId || !questionId || !answer.trim()) {
      setError("Challenge, question, and answer are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = {
      challenge: challengeId,
      challenge_question: questionId,
      answer: answer.trim(),
      team: teamId || null,
      docker_ip: dockerIp.trim() || null,
      is_active: isActive,
    };
    try {
      if (mode === "edit" && row?.answer_key_id) {
        await updateAnswerKey(hackathonId, row.answer_key_id, body);
      } else {
        await createAnswerKey(hackathonId, body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      panelClassName="max-w-lg"
      ariaLabel={mode === "edit" ? "Edit answer key" : "Create answer key"}
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {mode === "edit" ? "Edit answer key" : "Create answer key"}
          </h2>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <FormSelect
            label="Challenge"
            value={challengeId}
            disabled={mode === "edit"}
            onChange={(value) => {
              setChallengeId(value);
              setQuestionId("");
            }}
          >
            <option value="">Select challenge</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Question"
            value={questionId}
            disabled={mode === "edit" || !challengeId}
            onChange={setQuestionId}
          >
            <option value="">Select question</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name || q.id}
              </option>
            ))}
          </FormSelect>
          <TextField
            label="Answer (flag)"
            name="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <FormSelect label="Team (dynamic only)" value={teamId} onChange={setTeamId}>
            <option value="">Shared / none</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FormSelect>
          <TextField
            label="Machine IP (dynamic only)"
            name="docker_ip"
            value={dockerIp}
            onChange={(e) => setDockerIp(e.target.value)}
            placeholder="10.42.0.15"
          />
          <FormCheckbox
            label="Active"
            checked={isActive}
            onChange={setIsActive}
          />
          {error ? <Alert variant="error">{error}</Alert> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
          </Button>
        </div>
    </ModalShell>
  );
}
