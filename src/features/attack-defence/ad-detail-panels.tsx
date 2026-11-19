"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FORM_CONTROL_CLASS } from "@/components/ui/form-control";
import { FormSelect } from "@/components/ui/form-fields";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Loader } from "@/components/ui/loader";
import { ModalShell } from "@/components/ui/modal-shell";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { TextField } from "@/components/ui/text-field";
import {
  createAdChallenge,
  createAdNamespace,
  createAdService,
  deleteAdService,
  listAdFlags,
  listAdServices,
  spawnAdChallenge,
  spawnAdMachine,
  stopAdChallenge,
  stopAdMachine,
  updateAdChallenge,
  updateAdMachine,
  updateAdService,
  updateAdServiceCategory,
  uploadAdChallengeYaml,
  type AdChallenge,
  type AdFlag,
  type AdMachine,
  type AdPause,
  type AdPlayingTeam,
  type AdService,
  type AdServiceCategory,
} from "@/features/attack-defence/attack-defence-api";
import { formatDate } from "@/lib/format";
import { sanitizeMarkdown, sanitizePlainText } from "@/lib/sanitize-text";

type DescriptionFormat = "plain" | "markdown";

const SERVICE_SLOTS = ["S01", "S02", "S03", "S04", "S05", "S06", "S07", "S08"] as const;
const SERVICE_STATUSES = ["up", "compromised", "down"] as const;
const SERVICE_PROTOCOLS = ["tcp", "udp"] as const;

type ServiceDraft = {
  key: string;
  id?: string;
  slot: string;
  name: string;
  category: string;
  port: string;
  probe_script: string;
  service_status: string;
};

function emptyServiceDraft(slot: string, categoryId = ""): ServiceDraft {
  return {
    key: `new-${slot}-${Math.random().toString(36).slice(2, 8)}`,
    slot,
    name: "",
    category: categoryId,
    port: "",
    probe_script: "",
    service_status: "up",
  };
}

export function NamespacePicker({
  value,
  options,
  disabled,
  onChange,
  label = "Namespace",
  allowCreate = false,
  onCreated,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
  label?: string;
  /** Show Add to create a namespace via API without submitting the parent form. */
  allowCreate?: boolean;
  /** Called after a namespace is created successfully (name is already selected). */
  onCreated?: (name: string) => void;
}) {
  const known = options.filter(Boolean);
  const knownKey = known.join("\0");
  const inList = value !== "" && known.includes(value);
  const [customMode, setCustomMode] = useState(
    () => value !== "" && !options.filter(Boolean).includes(value),
  );
  const [draftName, setDraftName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const list = knownKey ? knownKey.split("\0") : [];
    if (value !== "" && !list.includes(value)) {
      setCustomMode(true);
      if (allowCreate) setDraftName(value);
    } else if (value !== "" && list.includes(value)) {
      setCustomMode(false);
      setDraftName("");
    }
  }, [value, knownKey, allowCreate]);

  const selectValue = customMode
    ? "__custom__"
    : value === ""
      ? ""
      : inList
        ? value
        : "__custom__";

  const createNamespace = async () => {
    const name = draftName.trim();
    if (!name) {
      setCreateError("Enter a namespace name.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createAdNamespace({ name, is_active: true });
      const createdName = (created.name || name).trim();
      setCustomMode(false);
      setDraftName("");
      onChange(createdName);
      onCreated?.(createdName);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create namespace",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <FormSelect
        label={label}
        value={selectValue}
        disabled={disabled || creating}
        onChange={(v) => {
          setCreateError(null);
          if (v === "__custom__") {
            setCustomMode(true);
            setDraftName("");
            if (inList) onChange("");
            return;
          }
          setCustomMode(false);
          setDraftName("");
          onChange(v);
        }}
      >
        <option value="">— none —</option>
        {known.map((ns) => (
          <option key={ns} value={ns}>
            {ns}
          </option>
        ))}
        <option value="__custom__">
          {allowCreate ? "Add new…" : "Custom…"}
        </option>
      </FormSelect>
      {customMode ? (
        allowCreate ? (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  label="New namespace name"
                  value={draftName}
                  disabled={disabled || creating}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. ad-staging-ns"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!creating && !disabled) void createNamespace();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mb-0.5 shrink-0"
                disabled={disabled || creating || !draftName.trim()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void createNamespace();
                }}
              >
                {creating ? "Adding…" : "Add"}
              </Button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Creates the namespace now — does not submit the event.
            </p>
            {createError ? <Alert variant="error">{createError}</Alert> : null}
          </div>
        ) : (
          <TextField
            label="Custom namespace"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type namespace name"
          />
        )
      ) : null}
    </div>
  );
}

function ChallengeYamlUploadField({
  canWrite,
  hasYaml,
  yamlText,
  fileName,
  onFile,
}: {
  canWrite: boolean;
  hasYaml: boolean;
  yamlText?: string;
  fileName: string | null;
  onFile: (file: File | null) => void;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const content = (yamlText || "").trim();

  return (
    <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
      <p className="text-sm font-medium text-[var(--text)]">Challenge deploy YAML</p>
      <p className="text-xs text-[var(--text-muted)]">
        Upload YAML here, then Deploy. A machine row is created only after the
        VM deploys successfully — do not add machines manually.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".yaml,.yml,text/yaml,application/x-yaml,text/plain"
          disabled={!canWrite}
          onChange={(e) => onFile(e.target.files?.[0] || null)}
          className="block w-full max-w-md text-sm text-[var(--text)] file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-[var(--surface-raised)] file:px-3 file:py-1.5 file:text-sm"
        />
        <Badge>{hasYaml || content ? "YAML uploaded" : "No YAML yet"}</Badge>
        {fileName ? (
          <span className="text-xs text-[var(--text-muted)]">Selected: {fileName}</span>
        ) : null}
        {content ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setViewOpen(true)}
          >
            View YAML
          </Button>
        ) : null}
      </div>
      <ModalShell
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        panelClassName="max-w-3xl"
        zIndexClass="z-[60]"
        ariaLabel="Challenge YAML"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Challenge YAML
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setViewOpen(false)}>
            Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          <pre className="overflow-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs leading-relaxed text-[var(--text)] whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </ModalShell>
    </div>
  );
}

function PanelChrome({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <ModalShell open onClose={onClose} panelClassName="max-w-4xl" ariaLabel={title}>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">{children}</div>
      {footer ? (
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3">
          {footer}
        </div>
      ) : null}
    </ModalShell>
  );
}

type CommonProps = {
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export const CHALLENGE_TEAM_REQUIRED_MSG =
  "Challenge needs to be assigned to a team first.";

/** Blocking progress / validation dialog for challenge deploy or stop. */
export function ChallengeDeployProgressModal({
  open,
  challengeName,
  teamName,
  error,
  mode = "deploy",
}: {
  open: boolean;
  challengeName: string;
  teamName?: string | null;
  /** When set, show this instead of the spinner (e.g. team not assigned). */
  error?: string | null;
  mode?: "deploy" | "stop";
}) {
  const hasError = Boolean((error || "").trim());
  const isStop = mode === "stop";
  const title = hasError
    ? isStop
      ? "Stop blocked"
      : "Deploy blocked"
    : isStop
      ? "Stopping machine"
      : "Deploying machine";
  const loaderLabel = isStop ? "Stopping machine…" : "Deploying machine…";
  const waitHint = isStop
    ? "Please wait. The VM is being stopped."
    : "Please wait. The VM is being created. This can take a few minutes.";
  return (
    <ModalShell
      open={open}
      onClose={() => undefined}
      panelClassName="max-w-md"
      zIndexClass="z-[70]"
      ariaLabel={title}
    >
      <div className="space-y-5 px-6 py-8 text-center">
        {hasError ? (
          <Alert variant="error">{error}</Alert>
        ) : (
          <Loader size="lg" label={loaderLabel} />
        )}
        <div className="space-y-2 text-sm">
          <p className="text-[var(--text)]">
            <span className="text-[var(--text-muted)]">Challenge: </span>
            <span className="font-semibold">{challengeName || "—"}</span>
          </p>
          <p className="text-[var(--text)]">
            <span className="text-[var(--text-muted)]">Team: </span>
            <span className="font-semibold">
              {(teamName || "").trim() || "Unassigned"}
            </span>
          </p>
          {!hasError ? (
            <p className="text-xs text-[var(--text-muted)]">{waitHint}</p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Assign this challenge to a playing team, then try Deploy again.
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

export function ChallengeDetailPanel({
  challenge,
  categories,
  teamName,
  teamAssigned = false,
  canWrite,
  onClose,
  onSaved,
}: CommonProps & {
  challenge: AdChallenge | null;
  categories: AdServiceCategory[];
  /** Assigned playing-team display name, if known. */
  teamName?: string | null;
  /** True when a playing team is linked to this challenge. */
  teamAssigned?: boolean;
}) {
  const isCreate = challenge == null;
  const [name, setName] = useState(challenge?.name || "");
  const initialMd = (challenge?.description_markdown || "").trim();
  const [descriptionFormat, setDescriptionFormat] = useState<DescriptionFormat>(
    initialMd ? "markdown" : "plain",
  );
  const [descriptionBody, setDescriptionBody] = useState(
    initialMd || challenge?.description || "",
  );
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [basePoints, setBasePoints] = useState(String(challenge?.base_points ?? 0));
  const [isActive, setIsActive] = useState(challenge?.is_active !== false);
  const [hasYaml, setHasYaml] = useState(
    Boolean((challenge?.yaml_manifest || "").trim()),
  );
  const [yamlFile, setYamlFile] = useState<File | null>(null);
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [removedServiceIds, setRemovedServiceIds] = useState<string[]>([]);
  /** Port fields are view-only until toggled per service. */
  const [editingPortKeys, setEditingPortKeys] = useState<Set<string>>(new Set());
  const [expandedProbeKeys, setExpandedProbeKeys] = useState<Set<string>>(
    new Set(),
  );
  const [flagViewer, setFlagViewer] = useState<{
    serviceKey: string;
    label: string;
    flags: AdFlag[];
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [progressMode, setProgressMode] = useState<"deploy" | "stop">("deploy");
  const [deployError, setDeployError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(challenge?.name || "");
    const md = (challenge?.description_markdown || "").trim();
    setDescriptionFormat(md ? "markdown" : "plain");
    setDescriptionBody(md || challenge?.description || "");
    setDescriptionPreview(false);
    setBasePoints(String(challenge?.base_points ?? 0));
    setIsActive(challenge?.is_active !== false);
    setHasYaml(Boolean((challenge?.yaml_manifest || "").trim()));
    setYamlFile(null);
    setRemovedServiceIds([]);
    setEditingPortKeys(new Set());
    setExpandedProbeKeys(new Set());
    setFlagViewer(null);
    setError(null);
    setMessage(null);

    let cancelled = false;
    const load = async () => {
      if (!challenge) {
        setServices([]);
        return;
      }
      try {
        const rows = await listAdServices({ challenge: challenge.id });
        if (cancelled) return;
        setServices(
          rows
            .slice()
            .sort((a, b) => a.slot.localeCompare(b.slot))
            .map((existing) => ({
              key: existing.id,
              id: existing.id,
              slot: existing.slot,
              name: existing.name,
              category: existing.category,
              port: existing.port == null ? "" : String(existing.port),
              probe_script: existing.probe_script || "",
              service_status: existing.service_status || "up",
            })),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load services");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [challenge, categories]);

  const nextAvailableSlot = () => {
    const used = new Set(services.map((s) => s.slot));
    return SERVICE_SLOTS.find((slot) => !used.has(slot)) || null;
  };

  const addService = () => {
    if (!canWrite) return;
    const slot = nextAvailableSlot();
    if (!slot) {
      setError("A challenge can have at most 8 services (S01–S08).");
      return;
    }
    setError(null);
    const draft = emptyServiceDraft(slot, categories[0]?.id || "");
    setServices((prev) => [...prev, draft]);
    // New services start with port editable so it can be set on create.
    setEditingPortKeys((prev) => new Set(prev).add(draft.key));
  };

  const updateDraft = (key: string, patch: Partial<ServiceDraft>) => {
    setServices((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const togglePortEdit = (key: string) => {
    setEditingPortKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const viewFlagsForService = async (row: ServiceDraft) => {
    const label = `${row.slot} ${row.name || "service"}`.trim();
    if (!row.id) {
      setFlagViewer({
        serviceKey: row.key,
        label,
        flags: [],
        loading: false,
        error: "Save the challenge first to view flags for this service.",
      });
      return;
    }
    setFlagViewer({
      serviceKey: row.key,
      label,
      flags: [],
      loading: true,
      error: null,
    });
    try {
      const flags = await listAdFlags({ service: row.id });
      setFlagViewer({
        serviceKey: row.key,
        label,
        flags,
        loading: false,
        error: null,
      });
    } catch (err) {
      setFlagViewer({
        serviceKey: row.key,
        label,
        flags: [],
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load flags",
      });
    }
  };

  const removeDraft = (row: ServiceDraft) => {
    if (row.id) {
      setRemovedServiceIds((prev) =>
        prev.includes(row.id!) ? prev : [...prev, row.id!],
      );
    }
    setServices((prev) => prev.filter((s) => s.key !== row.key));
    setEditingPortKeys((prev) => {
      const next = new Set(prev);
      next.delete(row.key);
      return next;
    });
    setExpandedProbeKeys((prev) => {
      const next = new Set(prev);
      next.delete(row.key);
      return next;
    });
    setFlagViewer((prev) => (prev?.serviceKey === row.key ? null : prev));
  };

  const syncServices = async (challengeId: string) => {
    for (const id of removedServiceIds) {
      await deleteAdService(id);
    }
    for (const row of services) {
      if (!row.name.trim()) {
        throw new Error(`Service ${row.slot} needs a name.`);
      }
      if (!row.category) {
        throw new Error(`Service ${row.slot} needs a category.`);
      }
      const body = {
        challenge: challengeId,
        category: row.category,
        name: row.name.trim(),
        slot: row.slot,
        port: row.port === "" ? null : Number(row.port),
        probe_script: row.probe_script,
        service_status: row.service_status,
      };
      if (row.id) {
        await updateAdService(row.id, body);
      } else {
        await createAdService(body);
      }
    }
  };

  const save = async () => {
    if (!canWrite) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Challenge name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const cleaned =
        descriptionFormat === "markdown"
          ? sanitizeMarkdown(descriptionBody)
          : sanitizePlainText(descriptionBody);
      const payload = {
        name: trimmed,
        description: descriptionFormat === "plain" ? cleaned : "",
        description_markdown: descriptionFormat === "markdown" ? cleaned : "",
        base_points: Number(basePoints) || 0,
        is_active: isActive,
      };
      let saved: AdChallenge;
      if (isCreate) {
        saved = await createAdChallenge(payload);
      } else {
        saved = await updateAdChallenge(challenge.id, payload);
      }
      if (yamlFile) {
        await uploadAdChallengeYaml(saved.id, yamlFile);
        setHasYaml(true);
      }
      await syncServices(saved.id);
      setMessage(
        isCreate
          ? "Challenge created with services/YAML."
          : "Challenge saved.",
      );
      await onSaved();
      if (isCreate) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const challengeDeployed =
    challenge?.machine_status === "running" ||
    challenge?.machine_status === "deploying";

  const spawn = async () => {
    if (!canWrite || !challenge) return;
    if (!hasYaml && !yamlFile) {
      setError("Upload a YAML file before spawning.");
      return;
    }
    setBusy(true);
    setProgressMode("deploy");
    setDeploying(true);
    setDeployError(null);
    setError(null);
    setMessage(null);
    if (!teamAssigned) {
      setDeployError(CHALLENGE_TEAM_REQUIRED_MSG);
      await new Promise((r) => setTimeout(r, 2500));
      setDeploying(false);
      setDeployError(null);
      setBusy(false);
      return;
    }
    try {
      const result = await spawnAdChallenge(challenge.id, yamlFile);
      const failN = result.errors?.length || 0;
      setHasYaml(true);
      setMessage(
        result.spawned?.length
          ? `Deployed — machine created (${result.spawned.length}).`
          : "Deploy finished with no machine created." +
              (failN ? ` ${failN} failed.` : ""),
      );
      if (failN && result.errors?.[0]?.error) {
        const msg = result.errors.map((e) => e.error).join("; ");
        setError(msg);
        if (msg.toLowerCase().includes("assigned to a team")) {
          setDeployError(msg);
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      await onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spawn failed";
      setError(msg);
      if (msg.toLowerCase().includes("assigned to a team")) {
        setDeployError(msg);
        await new Promise((r) => setTimeout(r, 2500));
      }
    } finally {
      setDeploying(false);
      setDeployError(null);
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!canWrite || !challenge) return;
    setBusy(true);
    setProgressMode("stop");
    setDeploying(true);
    setDeployError(null);
    setError(null);
    setMessage(null);
    try {
      const result = await stopAdChallenge(challenge.id);
      const failN = result.errors?.length || 0;
      setMessage(
        `Stopped ${result.stopped?.length || 0} machine(s)` +
          (failN ? `, ${failN} failed` : ""),
      );
      if (failN && result.errors?.[0]?.error) {
        setError(result.errors.map((e) => e.error).join("; "));
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setDeploying(false);
      setBusy(false);
    }
  };

  const filledCount = services.length;
  const canAddService = canWrite && filledCount < SERVICE_SLOTS.length;

  return (
    <>
    <ChallengeDeployProgressModal
      open={deploying}
      challengeName={challenge?.name || name || "Challenge"}
      teamName={teamName}
      error={deployError}
      mode={progressMode}
    />
    <PanelChrome
      title={isCreate ? "Create challenge" : `Challenge · ${challenge.name}`}
      onClose={onClose}
      footer={
        canWrite ? (
          <>
            <Button disabled={busy} onClick={() => void save()}>
              {isCreate ? "Create challenge" : "Save challenge"}
            </Button>
            {!isCreate ? (
              challengeDeployed ? (
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() => void stop()}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  disabled={busy || (!hasYaml && !yamlFile)}
                  variant="secondary"
                  onClick={() => void spawn()}
                >
                  Deploy
                </Button>
              )
            ) : null}
          </>
        ) : null
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canWrite}
        />
        <TextField
          label="Base points"
          type="number"
          value={basePoints}
          onChange={(e) => setBasePoints(e.target.value)}
          disabled={!canWrite}
        />
        <FormSelect
          label="Active"
          value={isActive ? "true" : "false"}
          disabled={!canWrite}
          onChange={(v) => setIsActive(v === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </FormSelect>
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-[var(--text)]">Description</span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["plain", "Normal"],
                ["markdown", "Markdown"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                disabled={!canWrite}
                className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium ${
                  descriptionFormat === value
                    ? "bg-[var(--accent)]/15 text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                onClick={() => {
                  setDescriptionFormat(value);
                  setDescriptionPreview(false);
                }}
              >
                {label}
              </button>
            ))}
            {descriptionFormat === "markdown" ? (
              <>
                <button
                  type="button"
                  className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium ${
                    !descriptionPreview
                      ? "bg-[var(--accent)]/15 text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => setDescriptionPreview(false)}
                >
                  Write
                </button>
                <button
                  type="button"
                  className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium ${
                    descriptionPreview
                      ? "bg-[var(--accent)]/15 text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => setDescriptionPreview(true)}
                >
                  Preview
                </button>
              </>
            ) : null}
          </div>
        </div>
        {descriptionFormat === "markdown" && descriptionPreview ? (
          <div className={`${FORM_CONTROL_CLASS} min-h-[140px]`}>
            {descriptionBody.trim() ? (
              <MarkdownContent>
                {sanitizeMarkdown(descriptionBody)}
              </MarkdownContent>
            ) : (
              <span className="text-[var(--text-muted)]">Nothing to preview</span>
            )}
          </div>
        ) : (
          <textarea
            className={`${FORM_CONTROL_CLASS} min-h-[140px]`}
            value={descriptionBody}
            disabled={!canWrite}
            rows={6}
            placeholder={
              descriptionFormat === "markdown"
                ? "Markdown — **bold**, `code`, lists, links…"
                : "Plain-text description"
            }
            onChange={(e) => setDescriptionBody(e.target.value)}
          />
        )}
      </div>
      {!isCreate ? (
        <p className="text-xs text-[var(--text-muted)]">
          Machines linked: {challenge.machine_count ?? "—"} · Services:{" "}
          {challenge.service_count ?? filledCount}
          {challenge.attachment_url ? (
            <>
              {" · "}
              <a
                className="underline"
                href={challenge.attachment_url}
                target="_blank"
                rel="noreferrer"
              >
                Attachment
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <ChallengeYamlUploadField
        canWrite={canWrite}
        hasYaml={hasYaml}
        yamlText={challenge?.yaml_manifest || ""}
        fileName={yamlFile?.name || null}
        onFile={setYamlFile}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Services ({filledCount}/8)</p>
          <div className="flex items-center gap-2">
            {!categories.length ? (
              <span className="text-xs text-[var(--text-muted)]">
                Create a service category first
              </span>
            ) : null}
            {canWrite ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !canAddService || !categories.length}
                onClick={addService}
              >
                + Add
              </Button>
            ) : null}
          </div>
        </div>
        {services.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            No services yet. Add up to 8 (S01–S08).
          </p>
        ) : (
          <div className="max-h-64 overflow-auto rounded-[var(--radius)] border border-[var(--border)]">
            <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--surface-raised)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Slot</th>
                  <th className="px-2 py-1.5 font-medium">Name</th>
                  <th className="px-2 py-1.5 font-medium">Category</th>
                  <th className="px-2 py-1.5 font-medium">Port</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="w-10 px-2 py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {services.map((row) => {
                  const cat = categories.find((c) => c.id === row.category);
                  const portEditing = editingPortKeys.has(row.key);
                  const probeOpen = expandedProbeKeys.has(row.key);
                  return (
                    <tr
                      key={row.key}
                      className="border-t border-[var(--border)] align-middle"
                    >
                      <td className="px-2 py-1.5">
                        <select
                          className={`${FORM_CONTROL_CLASS} w-[4.5rem] py-1 text-xs`}
                          value={row.slot}
                          disabled={!canWrite}
                          onChange={(e) =>
                            updateDraft(row.key, { slot: e.target.value })
                          }
                        >
                          {SERVICE_SLOTS.filter(
                            (s) =>
                              s === row.slot ||
                              !services.some((other) => other.slot === s),
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          className={`${FORM_CONTROL_CLASS} min-w-[7rem] py-1 text-xs`}
                          value={row.name}
                          disabled={!canWrite}
                          placeholder="Name"
                          onChange={(e) =>
                            updateDraft(row.key, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className={`${FORM_CONTROL_CLASS} min-w-[8rem] py-1 text-xs`}
                          value={row.category}
                          disabled={!canWrite || !categories.length}
                          onChange={(e) =>
                            updateDraft(row.key, { category: e.target.value })
                          }
                        >
                          {!row.category ? (
                            <option value="">Select…</option>
                          ) : null}
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          className={`${FORM_CONTROL_CLASS} w-[5.5rem] py-1 text-xs`}
                          value={row.port}
                          disabled={!canWrite || !portEditing}
                          placeholder={
                            cat?.default_port != null
                              ? String(cat.default_port)
                              : "—"
                          }
                          title={
                            portEditing
                              ? "Editing port"
                              : "View only — use ⋮ → Edit port"
                          }
                          onChange={(e) =>
                            updateDraft(row.key, { port: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          className={`${FORM_CONTROL_CLASS} w-[5.5rem] py-1 text-xs`}
                          value={row.service_status}
                          disabled={!canWrite}
                          onChange={(e) =>
                            updateDraft(row.key, {
                              service_status: e.target.value,
                            })
                          }
                        >
                          {SERVICE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <RowActionsMenu
                          label={`Actions for ${row.slot}`}
                          items={[
                            {
                              id: "view-flag",
                              label: "View flag",
                              disabled: busy,
                              onClick: () => void viewFlagsForService(row),
                            },
                            {
                              id: "probe",
                              label: probeOpen ? "Hide probe" : "Probe",
                              onClick: () =>
                                setExpandedProbeKeys((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.key)) next.delete(row.key);
                                  else next.add(row.key);
                                  return next;
                                }),
                            },
                            {
                              id: "edit-port",
                              label: portEditing ? "Lock port" : "Edit port",
                              hidden: !canWrite,
                              disabled: busy,
                              onClick: () => togglePortEdit(row.key),
                            },
                            {
                              id: "remove",
                              label: "Remove",
                              hidden: !canWrite,
                              disabled: busy,
                              destructive: true,
                              onClick: () => removeDraft(row),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {services.some((row) => expandedProbeKeys.has(row.key)) ? (
              <div className="space-y-2 border-t border-[var(--border)] bg-[var(--surface)] p-2">
                {services.map((row) =>
                  expandedProbeKeys.has(row.key) ? (
                    <label key={`probe-${row.key}`} className="block space-y-1">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Probe · {row.slot}
                      </span>
                      <textarea
                        className="min-h-[48px] w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1.5 font-mono text-[11px]"
                        value={row.probe_script}
                        disabled={!canWrite}
                        onChange={(e) =>
                          updateDraft(row.key, {
                            probe_script: e.target.value,
                          })
                        }
                        spellCheck={false}
                      />
                    </label>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PanelChrome>
      <ModalShell
        open={flagViewer != null}
        onClose={() => setFlagViewer(null)}
        panelClassName="max-w-lg"
        zIndexClass="z-[60]"
        ariaLabel={
          flagViewer ? `Flags · ${flagViewer.label}` : "Service flags"
        }
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Flags · {flagViewer?.label || "Service"}
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setFlagViewer(null)}>
            Close
          </Button>
        </div>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
          {flagViewer?.loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading…</p>
          ) : null}
          {flagViewer?.error ? (
            <Alert variant="error">{flagViewer.error}</Alert>
          ) : null}
          {flagViewer &&
          !flagViewer.loading &&
          !flagViewer.error &&
          flagViewer.flags.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              No flags planted for this service yet.
            </p>
          ) : null}
          {flagViewer && flagViewer.flags.length > 0 ? (
            <ul className="space-y-2">
              {flagViewer.flags.map((f) => (
                <li
                  key={f.id}
                  className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2"
                >
                  <code className="break-all text-sm text-[var(--text)]">
                    {f.flag}
                  </code>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Round {f.round_number ?? "—"}
                    {" · "}
                    {f.is_active ? "active" : "inactive"}
                    {" · "}
                    {f.is_captured ? "captured" : "not captured"}
                    {f.machine_ip ? ` · VM IP ${f.machine_ip}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </ModalShell>
    </>
  );
}

export function CategoryDetailPanel({
  category,
  canWrite,
  onClose,
  onSaved,
}: CommonProps & { category: AdServiceCategory }) {
  const [name, setName] = useState(category.name);
  const [port, setPort] = useState(String(category.default_port));
  const [protocol, setProtocol] = useState(category.protocol || "tcp");
  const [tier, setTier] = useState(category.tier || "");
  const [offense, setOffense] = useState(String(category.offense_points ?? 0));
  const [defense, setDefense] = useState(String(category.defense_penalty ?? 0));
  const [description, setDescription] = useState(category.description || "");
  const [isActive, setIsActive] = useState(category.is_active !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(category.name);
    setPort(String(category.default_port));
    setProtocol(category.protocol || "tcp");
    setTier(category.tier || "");
    setOffense(String(category.offense_points ?? 0));
    setDefense(String(category.defense_penalty ?? 0));
    setDescription(category.description || "");
    setIsActive(category.is_active !== false);
  }, [category]);

  const save = async () => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      await updateAdServiceCategory(category.id, {
        name: name.trim() || category.name,
        default_port: Number(port) || category.default_port,
        protocol,
        tier,
        offense_points: Number(offense) || 0,
        defense_penalty: Number(defense) || 0,
        description,
        is_active: isActive,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelChrome
      title={`Category · ${category.name}`}
      onClose={onClose}
      footer={
        canWrite ? (
          <Button disabled={busy} onClick={() => void save()}>
            Save category
          </Button>
        ) : null
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} />
        <TextField label="Default port" type="number" value={port} onChange={(e) => setPort(e.target.value)} disabled={!canWrite} />
        <FormSelect
          label="Protocol"
          value={protocol}
          disabled={!canWrite}
          onChange={setProtocol}
        >
          {SERVICE_PROTOCOLS.map((p) => (
            <option key={p} value={p}>
              {p.toUpperCase()}
            </option>
          ))}
        </FormSelect>
        <TextField label="Tier" value={tier} onChange={(e) => setTier(e.target.value)} disabled={!canWrite} />
        <TextField label="Offense points" type="number" value={offense} onChange={(e) => setOffense(e.target.value)} disabled={!canWrite} />
        <TextField label="Defense penalty" type="number" value={defense} onChange={(e) => setDefense(e.target.value)} disabled={!canWrite} />
        <FormSelect
          label="Active"
          value={isActive ? "true" : "false"}
          disabled={!canWrite}
          onChange={(v) => setIsActive(v === "true")}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </FormSelect>
      </div>
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canWrite} />
    </PanelChrome>
  );
}

export function MachineDetailPanel({
  machine,
  challenges,
  eventNamespace,
  canWrite,
  onClose,
  onSaved,
}: CommonProps & {
  machine: AdMachine;
  challenges: AdChallenge[];
  /** Event global namespace — used on deploy and shown read-only. */
  eventNamespace?: string;
}) {
  const [vmName, setVmName] = useState(machine.vm_name || "");
  const [hostname, setHostname] = useState(machine.hostname || "");
  const [ip, setIp] = useState(machine.ip_address || "");
  const resolvedNamespace =
    (eventNamespace || "").trim() ||
    machine.namespace ||
    machine.k8s_namespace ||
    "";
  const [challengeId, setChallengeId] = useState(
    machine.challenge || challenges[0]?.id || "",
  );
  const [busy, setBusy] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMode, setProgressMode] = useState<"deploy" | "stop">("deploy");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    setVmName(machine.vm_name || "");
    setHostname(machine.hostname || "");
    setIp(machine.ip_address || "");
    setChallengeId(machine.challenge || challenges[0]?.id || "");
    setShowToken(false);
    setError(null);
    setMessage(null);
  }, [machine, challenges, eventNamespace]);

  const save = async () => {
    if (!canWrite) return;
    if (!challengeId) {
      setError("Select a challenge for this machine.");
      return;
    }
    const trimmed = vmName.trim();
    if (!trimmed) {
      setError("VM name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        challenge: challengeId,
        vm_name: trimmed,
        hostname,
        ip_address: ip || null,
        namespace: resolvedNamespace || null,
        k8s_namespace: resolvedNamespace,
        deploy_mode: "yaml" as const,
      };
      await updateAdMachine(machine.id, payload);
      setMessage("Machine saved.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const machineDeployed =
    machine.status === "running" || machine.status === "deploying";

  const progressChallengeName =
    machine.challenge_name ||
    challenges.find((c) => c.id === machine.challenge)?.name ||
    machine.vm_name ||
    machine.id.slice(0, 8);

  const spawn = async () => {
    if (!canWrite) return;
    setBusy(true);
    setProgressMode("deploy");
    setProgressOpen(true);
    setError(null);
    setMessage(null);
    try {
      await spawnAdMachine(machine.id);
      setMessage("VM deployed from challenge YAML.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setProgressOpen(false);
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!canWrite) return;
    setBusy(true);
    setProgressMode("stop");
    setProgressOpen(true);
    setError(null);
    setMessage(null);
    try {
      await stopAdMachine(machine.id);
      setMessage("VM stopped.");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setProgressOpen(false);
      setBusy(false);
    }
  };

  return (
    <>
    <ChallengeDeployProgressModal
      open={progressOpen}
      challengeName={progressChallengeName}
      teamName={machine.team_name}
      mode={progressMode}
    />
    <PanelChrome
      title={`Machine · ${machine.vm_name || machine.id.slice(0, 8)}`}
      onClose={onClose}
      footer={
        canWrite ? (
          <>
            <Button disabled={busy} onClick={() => void save()}>
              Save machine
            </Button>
            {machineDeployed ? (
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void stop()}
              >
                Stop
              </Button>
            ) : (
              <Button
                disabled={busy}
                variant="secondary"
                onClick={() => void spawn()}
              >
                Deploy
              </Button>
            )}
          </>
        ) : null
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge>{machine.status || "—"}</Badge>
        <span>Team: {machine.team_name || "unassigned"}</span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Machines are created by challenge Deploy (not manually). Redeploy
        applies the challenge YAML into the event global namespace.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="VM name"
          value={vmName}
          onChange={(e) => setVmName(e.target.value)}
          disabled={!canWrite}
        />
        <FormSelect
          label="Challenge"
          value={challengeId}
          disabled={!canWrite || !challenges.length}
          onChange={setChallengeId}
        >
          {!challengeId ? <option value="">Select challenge…</option> : null}
          {machine.challenge &&
          !challenges.some((c) => c.id === machine.challenge) ? (
            <option value={machine.challenge}>
              {machine.challenge_name || machine.challenge.slice(0, 8)}
            </option>
          ) : null}
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FormSelect>
        <TextField
          label="Hostname"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          disabled={!canWrite}
        />
        <TextField
          label="IP"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          disabled={!canWrite}
          placeholder="Filled on deploy"
        />
        <TextField
          label="Namespace (event)"
          value={resolvedNamespace}
          onChange={() => undefined}
          disabled
          title="Taken from the event global namespace on deploy"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--text)]">Auth token</p>
        {(machine.auth_token || "").trim() ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-[var(--surface-muted)] px-2 py-1 font-mono text-sm">
              {showToken
                ? machine.auth_token
                : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
            </code>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setShowToken((v) => !v)}
            >
              {showToken ? "Hide token" : "View token"}
            </Button>
            {showToken ? (
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(machine.auth_token || "");
                  setMessage("Token copied.");
                }}
              >
                Copy
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No token yet — created when the machine deploys successfully.
          </p>
        )}
      </div>
    </PanelChrome>
    </>
  );
}

export function ServiceDetailPanel({
  service,
  challenges,
  categories,
  canWrite,
  onClose,
  onSaved,
}: CommonProps & {
  service: AdService;
  challenges: AdChallenge[];
  categories: AdServiceCategory[];
}) {
  const [name, setName] = useState(service.name);
  const [port, setPort] = useState(String(service.port ?? ""));
  const [slot, setSlot] = useState(service.slot);
  const [challengeId, setChallengeId] = useState(service.challenge);
  const [categoryId, setCategoryId] = useState(service.category);
  const [status, setStatus] = useState(service.service_status || "up");
  const [probe, setProbe] = useState(service.probe_script || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(service.name);
    setPort(String(service.port ?? ""));
    setSlot(service.slot);
    setChallengeId(service.challenge);
    setCategoryId(service.category);
    setStatus(service.service_status || "up");
    setProbe(service.probe_script || "");
  }, [service]);

  const save = async () => {
    if (!canWrite) return;
    setBusy(true);
    setError(null);
    try {
      await updateAdService(service.id, {
        name: name.trim() || service.name,
        port: port === "" ? null : Number(port),
        slot: slot.trim().toUpperCase(),
        challenge: challengeId,
        category: categoryId,
        service_status: status,
        probe_script: probe,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelChrome
      title={`Service · ${service.slot} ${service.name}`}
      onClose={onClose}
      footer={
        canWrite ? (
          <Button disabled={busy} onClick={() => void save()}>
            Save service
          </Button>
        ) : null
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge>{status || "up"}</Badge>
        {service.last_up_status_updated ? (
          <span className="text-[var(--text-muted)]">
            Last status: {new Date(service.last_up_status_updated).toLocaleString()}
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} />
        <FormSelect
          label="Slot"
          value={slot}
          disabled={!canWrite}
          onChange={setSlot}
        >
          {SERVICE_SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Challenge"
          value={challengeId}
          disabled={!canWrite}
          onChange={setChallengeId}
        >
          {!challenges.some((c) => c.id === challengeId) ? (
            <option value={challengeId}>
              {service.challenge_name || challengeId.slice(0, 8)}
            </option>
          ) : null}
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          label="Category"
          value={categoryId}
          disabled={!canWrite}
          onChange={setCategoryId}
        >
          {!categories.some((c) => c.id === categoryId) ? (
            <option value={categoryId}>
              {service.category_name || categoryId.slice(0, 8)}
            </option>
          ) : null}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} (:{c.default_port})
            </option>
          ))}
        </FormSelect>
        <TextField
          label="Port override"
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          disabled={!canWrite}
          placeholder="Category default if empty"
        />
        <TextField
          label="Effective port"
          value={String(service.effective_port ?? "—")}
          disabled
        />
        <FormSelect
          label="Status"
          value={status}
          disabled={!canWrite}
          onChange={setStatus}
        >
          {SERVICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FormSelect>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-[var(--text-muted)]">Probe script</span>
        <textarea
          className="min-h-[140px] w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 font-mono text-xs"
          value={probe}
          onChange={(e) => setProbe(e.target.value)}
          disabled={!canWrite}
          spellCheck={false}
        />
      </label>
    </PanelChrome>
  );
}

export function PauseDetailPanel({
  pause,
  canWrite,
  onClose,
  onDelete,
}: {
  pause: AdPause;
  canWrite: boolean;
  onClose: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!canWrite || !onDelete) return;
    if (pause.type === "runtime") {
      setError("Runtime pauses are managed via event Pause/Resume.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelChrome
      title={`Pause · ${pause.type}`}
      onClose={onClose}
      footer={
        canWrite && pause.type !== "runtime" && onDelete ? (
          <Button
            disabled={busy}
            variant="ghost"
            onClick={() => void remove()}
          >
            Delete pause
          </Button>
        ) : null
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-[var(--text-muted)]">Type: </span>
          {pause.type}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Status: </span>
          {pause.status}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">After round: </span>
          {pause.after_round ?? "—"}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Duration (sec): </span>
          {pause.duration_seconds ?? "—"}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Start: </span>
          {pause.start_time ? formatDate(pause.start_time) : "—"}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">End: </span>
          {pause.end_time ? formatDate(pause.end_time) : "—"}
        </p>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Deleting a scheduled pause recalculates the event end time.
      </p>
    </PanelChrome>
  );
}

export function PlayingTeamDetailPanel({
  playingTeam,
  onClose,
}: {
  playingTeam: AdPlayingTeam;
  onClose: () => void;
}) {
  const members = playingTeam.members || [];
  return (
    <PanelChrome
      title={`Team · ${playingTeam.team_name || playingTeam.team.slice(0, 8)}`}
      onClose={onClose}
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-[var(--text-muted)]">Code: </span>
          {playingTeam.team_code || "—"}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Challenge: </span>
          {playingTeam.challenge_name || playingTeam.challenge.slice(0, 8)}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">VM: </span>
          {playingTeam.machine_name || "—"} ({playingTeam.machine_status || "none"})
        </p>
        <p>
          <span className="text-[var(--text-muted)]">IP: </span>
          {playingTeam.machine_ip || "—"}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Services: </span>
          {playingTeam.services_up ?? 0} up / {playingTeam.services_down ?? 0} down /{" "}
          {playingTeam.services_total ?? 0} total
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Flags: </span>
          {playingTeam.flags_captured ?? 0} captured / {playingTeam.flags_total ?? 0}{" "}
          total
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          Members ({playingTeam.member_count ?? members.length})
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No members listed.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap gap-2">
                <span>{m.username || m.email || m.user_id?.slice(0, 8)}</span>
                {m.is_captain ? <Badge>captain</Badge> : null}
                {m.is_approved ? <Badge>approved</Badge> : <Badge>pending</Badge>}
                {m.email ? (
                  <span className="text-[var(--text-muted)]">{m.email}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelChrome>
  );
}
