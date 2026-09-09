"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormCheckbox, FormSelect } from "@/components/ui/form-fields";
import { ModalShell } from "@/components/ui/modal-shell";
import { TextField } from "@/components/ui/text-field";
import type { ChallengeSummary } from "@/features/challenges/challenge-api";
import { listChallengeQuestions } from "@/features/challenges/challenge-api";
import type { EventUser } from "@/features/users/users-api";
import { eventUserLabel } from "@/features/users/users-api";
import {
  createScore,
  updateScore,
  type ScoreRow,
  type ScoreWriteInput,
} from "@/features/ops/ops-api";
import type { EventTeam } from "@/features/teams/team-api";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  hackathonId: string;
  row?: ScoreRow | null;
  teams: EventTeam[];
  challenges: ChallengeSummary[];
  users: EventUser[];
  onClose: () => void;
  onSaved: () => void;
};

export function ScoreFormModal({
  open,
  mode,
  hackathonId,
  row,
  teams,
  challenges,
  users,
  onClose,
  onSaved,
}: Props) {
  const [teamId, setTeamId] = useState("");
  const [userId, setUserId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [score, setScore] = useState("0");
  const [firstBlood, setFirstBlood] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [negative, setNegative] = useState("0");
  const [answerSubmitted, setAnswerSubmitted] = useState("");
  const [answerValidity, setAnswerValidity] = useState<boolean | "">("");
  const [isFlag, setIsFlag] = useState(false);
  const [questions, setQuestions] = useState<{ id: string; name?: string }[]>(
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && row) {
      setTeamId(row.team || "");
      setUserId(row.user || "");
      setChallengeId(row.challenge || "");
      setQuestionId(row.challenges_questions || "");
      setScore(String(row.score ?? 0));
      setFirstBlood(String(row.first_blood_score ?? 0));
      setBonus(String(row.bonus_score ?? 0));
      setNegative(String(row.negative_score ?? 0));
      setAnswerSubmitted(row.answer_submitted || "");
      setAnswerValidity(
        row.answer_validity === true
          ? true
          : row.answer_validity === false
            ? false
            : "",
      );
      setIsFlag(Boolean(row.is_flag));
    } else {
      setTeamId(teams[0]?.id || "");
      setUserId("");
      setChallengeId(challenges[0]?.id || "");
      setQuestionId("");
      setScore("0");
      setFirstBlood("0");
      setBonus("0");
      setNegative("0");
      setAnswerSubmitted("");
      setAnswerValidity("");
      setIsFlag(false);
    }
  }, [open, mode, row, teams, challenges]);

  useEffect(() => {
    if (!open || !challengeId) {
      setQuestions([]);
      return;
    }
    let cancelled = false;
    void listChallengeQuestions(challengeId, hackathonId)
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

  function userOptionLabel(u: EventUser) {
    return eventUserLabel(u);
  }

  async function submit() {
    if (!teamId || !challengeId) {
      setError("Team and challenge are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const body: ScoreWriteInput = {
      team: teamId,
      user: userId || undefined,
      challenge: challengeId,
      challenges_questions: questionId || undefined,
      score: Number(score) || 0,
      first_blood_score: Number(firstBlood) || 0,
      bonus_score: Number(bonus) || 0,
      negative_score: Number(negative) || 0,
      answer_submitted: answerSubmitted.trim() || undefined,
      answer_validity: answerValidity === "" ? undefined : answerValidity,
      is_flag: isFlag,
    };
    try {
      if (mode === "edit" && row) {
        await updateScore(hackathonId, row.id, body);
      } else {
        await createScore(hackathonId, body);
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
      panelClassName="max-w-2xl"
      zIndexClass="z-[60]"
      ariaLabel={mode === "edit" ? "Edit score entry" : "Record score"}
    >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {mode === "edit" ? "Edit score entry" : "Record score"}
          </h2>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Team" required value={teamId} onChange={setTeamId}>
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="User" value={userId} onChange={setUserId}>
              <option value="">None</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userOptionLabel(u)}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="Challenge"
              required
              value={challengeId}
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
              disabled={!challengeId}
              onChange={setQuestionId}
            >
              <option value="">None</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name || q.id}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField
              label="Score"
              name="score"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
            <TextField
              label="First blood"
              name="first_blood"
              type="number"
              value={firstBlood}
              onChange={(e) => setFirstBlood(e.target.value)}
            />
            <TextField
              label="Bonus"
              name="bonus"
              type="number"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
            />
            <TextField
              label="Negative"
              name="negative"
              type="number"
              value={negative}
              onChange={(e) => setNegative(e.target.value)}
            />
          </div>
          <TextField
            label="Answer submitted"
            name="answer_submitted"
            value={answerSubmitted}
            onChange={(e) => setAnswerSubmitted(e.target.value)}
          />
          <FormSelect
            label="Answer validity"
            value={
              answerValidity === "" ? "" : answerValidity ? "true" : "false"
            }
            onChange={(v) => {
              setAnswerValidity(v === "" ? "" : v === "true");
            }}
          >
            <option value="">Unknown</option>
            <option value="true">Correct</option>
            <option value="false">Incorrect</option>
          </FormSelect>
          <FormCheckbox
            label="Flag submission"
            checked={isFlag}
            onChange={setIsFlag}
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
