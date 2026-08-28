"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  createCatalogItem,
  listCatalog,
  type CatalogItem,
} from "@/features/catalog/catalog-api";
import {
  createChallengeAnswer,
  createChallengeMultipart,
  createChallengeQuestion,
  getChallenge,
  updateChallengeMultipart,
} from "@/features/challenges/challenge-api";

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "config", label: "Config" },
  { id: "skills", label: "Skills" },
  { id: "status", label: "Status" },
  { id: "questions", label: "Questions" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type QuestionDraft = {
  name: string;
  description: string;
  score: string;
  answer: string;
};

type ChallengeCreateModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, create/update under challenge-admin for this event. */
  hackathonId?: string | null;
  /** When set, modal edits an existing challenge. */
  challengeId?: string | null;
};

function asId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

function SelectField({
  label,
  value,
  onChange,
  required,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
      <span className="font-medium text-[var(--text)]">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function InlineCreate({
  label,
  placeholder,
  onCreate,
  busy,
}: {
  label: string;
  placeholder: string;
  onCreate: (name: string) => Promise<void>;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-medium text-[var(--accent)] hover:underline"
        onClick={() => setOpen(true)}
      >
        + Add new {label}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--bg)] p-2">
      <div className="min-w-[180px] flex-1">
        <TextField
          label={`New ${label}`}
          name={`new_${label}`}
          value={name}
          placeholder={placeholder}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button
        size="sm"
        disabled={busy || !name.trim()}
        onClick={() =>
          void (async () => {
            await onCreate(name.trim());
            setName("");
            setOpen(false);
          })()
        }
      >
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

/**
 * Mirrors ChallengeWriteSerializer + question/answer create rules:
 * - Challenge: only `name` is required by the backend
 * - Static create: at least one question with `name` + `answer`
 */
function validateStep(
  current: StepId,
  values: {
    name: string;
    isDynamic: boolean;
    questions: QuestionDraft[];
    isEdit: boolean;
  },
): string | null {
  if (current === "basics") {
    if (!values.name.trim()) return "Challenge name is required.";
  }
  if (current === "questions" && !values.isDynamic && !values.isEdit) {
    const valid = values.questions.filter((q) => q.name.trim() && q.answer.trim());
    if (valid.length === 0) {
      return "Static challenges need at least one question with a name and answer.";
    }
    for (const q of values.questions) {
      const hasAny = q.name.trim() || q.answer.trim() || q.description.trim();
      if (!hasAny) continue;
      if (!q.name.trim()) return "Each filled question needs a name.";
      if (!q.answer.trim()) return "Each filled question needs an answer.";
    }
  }
  return null;
}

export function ChallengeCreateModal({
  open,
  onClose,
  onSaved,
  hackathonId,
  challengeId,
}: ChallengeCreateModalProps) {
  const isEdit = Boolean(challengeId);

  const [step, setStep] = useState<StepId>("basics");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [types, setTypes] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [sources, setSources] = useState<CatalogItem[]>([]);
  const [difficulties, setDifficulties] = useState<CatalogItem[]>([]);
  const [skills, setSkills] = useState<CatalogItem[]>([]);
  const [techniques, setTechniques] = useState<CatalogItem[]>([]);

  const [challengeType, setChallengeType] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [dockerType, setDockerType] = useState("docker");
  const [dockerOs, setDockerOs] = useState("Linux");
  const [dockerImageName, setDockerImageName] = useState("");
  const [dockerImageTag, setDockerImageTag] = useState("latest");
  const [dockerMachineName, setDockerMachineName] = useState("");
  const [dockerMachineDescription, setDockerMachineDescription] = useState("");
  const [dockerPort, setDockerPort] = useState("80");
  const [dockerFlagNum, setDockerFlagNum] = useState("1");
  const [dockerTimeLimit, setDockerTimeLimit] = useState("120");
  const [staticFile, setStaticFile] = useState<File | null>(null);
  const [dockerMedia, setDockerMedia] = useState<File | null>(null);

  const [skillId, setSkillId] = useState("");
  const [techniqueIds, setTechniqueIds] = useState<string[]>([]);

  const [isDynamic, setIsDynamic] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { name: "", description: "", score: "100", answer: "" },
  ]);

  const visibleSteps = useMemo(() => {
    if (isDynamic || isEdit) {
      return STEPS.filter((s) => s.id !== "questions");
    }
    return [...STEPS];
  }, [isDynamic, isEdit]);

  const stepIndex = visibleSteps.findIndex((s) => s.id === step);

  const validationValues = useMemo(
    () => ({ name, isDynamic, questions, isEdit }),
    [name, isDynamic, questions, isEdit],
  );

  const stepError = useMemo(
    () => validateStep(step, validationValues),
    [step, validationValues],
  );

  const canProceedCurrent = !stepError;

  const loadCatalogs = useCallback(async () => {
    const [t, c, s, d, sk] = await Promise.all([
      listCatalog("challenge-types"),
      listCatalog("categories"),
      listCatalog("sources"),
      listCatalog("difficulties"),
      listCatalog("skills"),
    ]);
    setTypes(t);
    setCategories(c);
    setSources(s);
    setDifficulties(d);
    setSkills(sk);
  }, []);

  function reset() {
    setStep("basics");
    setError(null);
    setBusy(false);
    setLoadingEdit(false);
    setChallengeType("");
    setCategory("");
    setSource("");
    setDifficulty("");
    setName("");
    setDescription("");
    setDockerType("docker");
    setDockerOs("Linux");
    setDockerImageName("");
    setDockerImageTag("latest");
    setDockerMachineName("");
    setDockerMachineDescription("");
    setDockerPort("80");
    setDockerFlagNum("1");
    setDockerTimeLimit("120");
    setStaticFile(null);
    setDockerMedia(null);
    setSkillId("");
    setTechniqueIds([]);
    setIsDynamic(false);
    setIsActive(true);
    setQuestions([{ name: "", description: "", score: "100", answer: "" }]);
  }

  useEffect(() => {
    if (!open) return;
    void loadCatalogs().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load catalogs");
    });
  }, [open, loadCatalogs]);

  useEffect(() => {
    if (!open || !skillId) {
      setTechniques([]);
      return;
    }
    void listCatalog("techniques", { skill: skillId })
      .then(setTechniques)
      .catch(() => setTechniques([]));
  }, [open, skillId]);

  useEffect(() => {
    if (!open) return;
    if ((isDynamic || isEdit) && step === "questions") {
      setStep("status");
    }
  }, [isDynamic, isEdit, open, step]);

  useEffect(() => {
    if (!open) return;
    if (!challengeId) {
      reset();
      return;
    }

    let cancelled = false;
    setLoadingEdit(true);
    setError(null);
    void getChallenge(challengeId, hackathonId || null)
      .then((challenge) => {
        if (cancelled) return;
        setName(challenge.name || "");
        setDescription(challenge.description || "");
        setChallengeType(asId(challenge.challenge_type));
        setCategory(asId(challenge.category));
        setSource(asId(challenge.challenge_source));
        setDifficulty(asId(challenge.difficulty_level));
        setIsDynamic(Boolean(challenge.is_dynamic));
        setIsActive(challenge.is_active !== false);
        setTechniqueIds(
          (challenge.techniques || []).map((id) => String(id)).filter(Boolean),
        );
        const parent =
          challenge.technique_details?.find((t) => t.parent_tag)?.parent_tag ||
          "";
        setSkillId(parent ? String(parent) : "");

        const docker = challenge.docker;
        if (docker) {
          setDockerType(docker.docker_type || "docker");
          setDockerOs(docker.os || "Linux");
          setDockerImageName(docker.image_name || "");
          setDockerImageTag(docker.image_tag || "latest");
          setDockerMachineName(docker.machine_name || "");
          setDockerMachineDescription(docker.machine_description || "");
          setDockerPort(String(docker.port ?? 80));
          setDockerFlagNum(String(docker.flag_num ?? 1));
          setDockerTimeLimit(String(docker.time_limit ?? 120));
        }
        setStep("basics");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load challenge",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });

    return () => {
      cancelled = true;
    };
    // Only reload when opening a different challenge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, challengeId, hackathonId]);

  function handleClose() {
    reset();
    onClose();
  }

  function canJumpTo(targetIndex: number): boolean {
    if (targetIndex <= stepIndex) return true;
    for (let i = 0; i < targetIndex; i += 1) {
      const s = visibleSteps[i];
      if (!s) return false;
      if (validateStep(s.id, validationValues)) return false;
    }
    return true;
  }

  function goNext() {
    const message = validateStep(step, validationValues);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    const next = visibleSteps[stepIndex + 1];
    if (next) setStep(next.id);
  }

  function goBack() {
    setError(null);
    const prev = visibleSteps[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  async function submit() {
    for (const s of visibleSteps) {
      const message = validateStep(s.id, validationValues);
      if (message) {
        setStep(s.id);
        setError(message);
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("description", description.trim());
      if (challengeType) form.set("challenge_type", challengeType);
      if (category) form.set("category", category);
      if (difficulty) form.set("difficulty_level", difficulty);
      if (source) form.set("challenge_source", source);
      form.set("is_dynamic", String(isDynamic));
      form.set("challenge_for", "hackathon");
      form.set("is_active", String(isActive));

      if (hackathonId) {
        form.set("hackathon", hackathonId);
      }

      for (const techId of techniqueIds) {
        form.append("techniques", techId);
      }

      const hasDocker =
        Boolean(dockerImageName.trim() || dockerMachineName.trim()) ||
        Boolean(dockerMedia);

      if (hasDocker) {
        form.set(
          "docker",
          JSON.stringify({
            image_name:
              dockerImageName.trim() ||
              name.trim().toLowerCase().replace(/\s+/g, "-"),
            image_tag: dockerImageTag.trim() || "latest",
            machine_name: dockerMachineName.trim() || name.trim(),
            machine_description: dockerMachineDescription.trim(),
            docker_type: dockerType,
            os: dockerOs,
            port: Number(dockerPort) || 80,
            flag_num: Number(dockerFlagNum) || 1,
            time_limit: Number(dockerTimeLimit) || 120,
            use_hackathon_end_time: false,
            kind: "Pod",
          }),
        );
      }

      if (staticFile) form.set("file", staticFile);
      if (dockerMedia) form.set("docker_media", dockerMedia);

      if (isEdit && challengeId) {
        await updateChallengeMultipart(
          challengeId,
          form,
          hackathonId || null,
        );
      } else {
        const challenge = await createChallengeMultipart(
          form,
          hackathonId || null,
        );

        if (!isDynamic) {
          const toCreate = questions.filter(
            (q) => q.name.trim() && q.answer.trim(),
          );
          for (const q of toCreate) {
            const createdQ = await createChallengeQuestion(
              challenge.id,
              {
                name: q.name.trim(),
                description: q.description.trim() || undefined,
                score: Number(q.score) || 0,
                is_active: true,
              },
              hackathonId || null,
            );
            await createChallengeAnswer(
              challenge.id,
              {
                challenge_question: createdQ.id,
                answer: q.answer.trim(),
                team: null,
              },
              hackathonId || null,
            );
          }
        }
      }

      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update challenge"
            : "Failed to create challenge",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {isEdit ? "Edit challenge" : "Add challenge"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">
                {isEdit ? "Edit challenge" : "Create challenge"}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {hackathonId
                  ? "Scoped to the selected hackathon."
                  : "Platform catalog (Root / system.admin)."}
                {" "}
                Required by API: name
                {!isDynamic && !isEdit ? "; static needs question name + answer" : ""}.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>

          <ol className="mt-4 flex flex-wrap gap-2">
            {visibleSteps.map((s, index) => {
              const active = s.id === step;
              const done = index < stepIndex;
              const jumpOk = canJumpTo(index);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!jumpOk || busy || loadingEdit}
                    onClick={() => {
                      if (!jumpOk) return;
                      setError(null);
                      setStep(s.id);
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? "bg-[var(--accent)] text-[var(--accent-contrast,white)]"
                        : done
                          ? "bg-[var(--accent-muted)] text-[var(--text)]"
                          : "bg-[var(--bg)] text-[var(--text-muted)]"
                    }`}
                  >
                    {index + 1}. {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="mb-3">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}

          {loadingEdit ? (
            <p className="text-sm text-[var(--text-muted)]">Loading challenge…</p>
          ) : null}

          {!loadingEdit && step === "basics" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Challenge type"
                value={challengeType}
                onChange={setChallengeType}
              >
                <option value="">Select type…</option>
                {types.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </SelectField>
              <div>
                <SelectField
                  label="Category"
                  value={category}
                  onChange={setCategory}
                >
                  <option value="">Select category…</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.id}
                    </option>
                  ))}
                </SelectField>
                <InlineCreate
                  label="category"
                  placeholder="e.g. Web"
                  busy={busy}
                  onCreate={async (newName) => {
                    const created = await createCatalogItem("categories", {
                      name: newName,
                      description: "",
                    });
                    setCategories((prev) => [...prev, created]);
                    setCategory(created.id);
                  }}
                />
              </div>
              <SelectField
                label="Challenge source"
                value={source}
                onChange={setSource}
              >
                <option value="">Select source…</option>
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.source_type || item.name || item.id}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Difficulty level"
                value={difficulty}
                onChange={setDifficulty}
              >
                <option value="">Select difficulty…</option>
                {difficulties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </SelectField>
              <div className="sm:col-span-2">
                <TextField
                  label="Name *"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">
                    Description
                  </span>
                  <textarea
                    className="min-h-[100px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {!loadingEdit && step === "config" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Docker type"
                  value={dockerType}
                  onChange={setDockerType}
                >
                  <option value="docker">docker</option>
                  <option value="vm">vm</option>
                </SelectField>
                <SelectField label="OS" value={dockerOs} onChange={setDockerOs}>
                  <option value="Linux">Linux</option>
                  <option value="Window">Window</option>
                </SelectField>
                <TextField
                  label="Image name"
                  name="docker_image_name"
                  value={dockerImageName}
                  onChange={(e) => setDockerImageName(e.target.value)}
                  placeholder="web101"
                />
                <TextField
                  label="Image tag"
                  name="docker_image_tag"
                  value={dockerImageTag}
                  onChange={(e) => setDockerImageTag(e.target.value)}
                />
                <TextField
                  label="Machine name"
                  name="docker_machine_name"
                  value={dockerMachineName}
                  onChange={(e) => setDockerMachineName(e.target.value)}
                />
                <TextField
                  label="Port"
                  name="docker_port"
                  type="number"
                  value={dockerPort}
                  onChange={(e) => setDockerPort(e.target.value)}
                />
                <TextField
                  label="Flag count"
                  name="docker_flag_num"
                  type="number"
                  value={dockerFlagNum}
                  onChange={(e) => setDockerFlagNum(e.target.value)}
                />
                <TextField
                  label="Time limit (min)"
                  name="docker_time_limit"
                  type="number"
                  value={dockerTimeLimit}
                  onChange={(e) => setDockerTimeLimit(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Machine description"
                    name="docker_machine_description"
                    value={dockerMachineDescription}
                    onChange={(e) => setDockerMachineDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">
                    Static challenge file
                  </span>
                  <input
                    type="file"
                    className="text-sm text-[var(--text)]"
                    onChange={(e) =>
                      setStaticFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <span className="text-[10px]">
                    Optional zip/pdf/asset for players
                    {isEdit ? " (upload to replace)" : ""}
                  </span>
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">
                    Docker / K8s media
                  </span>
                  <input
                    type="file"
                    className="text-sm text-[var(--text)]"
                    onChange={(e) =>
                      setDockerMedia(e.target.files?.[0] ?? null)
                    }
                  />
                  <span className="text-[10px]">
                    Optional Dockerfile or manifest YAML
                  </span>
                </label>
              </div>
            </div>
          ) : null}

          {!loadingEdit && step === "skills" ? (
            <div className="space-y-3">
              <div>
                <SelectField
                  label="Skill"
                  value={skillId}
                  onChange={(v) => {
                    setSkillId(v);
                    setTechniqueIds([]);
                  }}
                >
                  <option value="">Select skill…</option>
                  {skills.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name || item.id}
                    </option>
                  ))}
                </SelectField>
                <InlineCreate
                  label="skill"
                  placeholder="e.g. Web Exploitation"
                  busy={busy}
                  onCreate={async (newName) => {
                    const created = await createCatalogItem("skills", {
                      name: newName,
                      description: "",
                    });
                    setSkills((prev) => [...prev, created]);
                    setSkillId(created.id);
                  }}
                />
              </div>
              <div>
                <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                  <span className="font-medium text-[var(--text)]">
                    Sub skills / techniques
                  </span>
                  <select
                    multiple
                    className="min-h-[140px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
                    value={techniqueIds}
                    disabled={!skillId}
                    onChange={(e) =>
                      setTechniqueIds(
                        Array.from(e.target.selectedOptions).map((o) => o.value),
                      )
                    }
                  >
                    {techniques.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.id}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px]">
                    Hold Ctrl/Cmd to select multiple. Filtered by skill.
                  </span>
                </label>
                <InlineCreate
                  label="sub skill"
                  placeholder="e.g. SQLi"
                  busy={busy}
                  onCreate={async (newName) => {
                    if (!skillId) {
                      setError("Select a skill before adding a sub skill.");
                      return;
                    }
                    const created = await createCatalogItem("techniques", {
                      name: newName,
                      description: "",
                      parent_tag: skillId,
                    });
                    setTechniques((prev) => [...prev, created]);
                    setTechniqueIds((prev) => [...prev, created.id]);
                  }}
                />
              </div>
            </div>
          ) : null}

          {!loadingEdit && step === "status" ? (
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>
                  <strong>Active</strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    New challenges are active by default. You can also toggle
                    this later from the challenges table.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={isDynamic}
                  onChange={(e) => setIsDynamic(e.target.checked)}
                />
                <span>
                  <strong>Dynamic challenge</strong>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Dynamic challenges use docker/VM delivery and skip static
                    question/answer setup. Static challenges require questions
                    and answers in the next step.
                  </span>
                </span>
              </label>
              {isEdit ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Existing questions/answers are unchanged here. Re-open create
                  flow or use question APIs to manage them separately.
                </p>
              ) : null}
            </div>
          ) : null}

          {!loadingEdit && step === "questions" && !isDynamic ? (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3 sm:grid-cols-2"
                >
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--text)]">
                      Question {index + 1}
                    </p>
                    {questions.length > 1 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setQuestions((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <TextField
                    label="Question name *"
                    name={`q_name_${index}`}
                    value={q.name}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <TextField
                    label="Score"
                    name={`q_score_${index}`}
                    type="number"
                    value={q.score}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, score: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <div className="sm:col-span-2">
                    <TextField
                      label="Description"
                      name={`q_desc_${index}`}
                      value={q.description}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, description: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextField
                      label="Answer *"
                      name={`q_answer_${index}`}
                      value={q.answer}
                      onChange={(e) =>
                        setQuestions((prev) =>
                          prev.map((row, i) =>
                            i === index
                              ? { ...row, answer: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setQuestions((prev) => [
                    ...prev,
                    { name: "", description: "", score: "100", answer: "" },
                  ])
                }
              >
                Add another question
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button
            variant="secondary"
            disabled={stepIndex <= 0 || busy || loadingEdit}
            onClick={goBack}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {stepIndex < visibleSteps.length - 1 ? (
              <Button
                disabled={busy || loadingEdit || !canProceedCurrent}
                onClick={goNext}
              >
                Next
              </Button>
            ) : (
              <Button
                disabled={busy || loadingEdit || !canProceedCurrent}
                onClick={() => void submit()}
              >
                {busy
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save changes"
                    : "Create challenge"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
