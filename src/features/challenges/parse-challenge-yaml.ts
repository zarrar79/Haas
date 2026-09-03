import { loadAll } from "js-yaml";

export type ParsedChallengeYaml = {
  dockerType: "docker" | "vm";
  kind: string;
  imageName: string;
  imageTag: string;
  machineName: string;
  os: "Linux" | "Window";
  flagNum: string;
};

type YamlDoc = {
  kind?: string;
  metadata?: { name?: string };
  spec?: {
    containers?: Array<{
      image?: string;
    }>;
    template?: {
      spec?: {
        containers?: Array<{
          image?: string;
        }>;
      };
    };
  };
};

/** Matches machine_spawn._is_secondary_vm — skip vm2/vm3 when picking primary VM. */
function isSecondaryVm(name: string): boolean {
  const value = name || "";
  if (/[-_]vm[2-9]\d*$/i.test(value)) return true;
  if (/vm[2-9]\d*$/i.test(value)) return true;
  return false;
}

function parseContainerImage(image: string): { name: string; tag: string } {
  const trimmed = image.trim();
  if (!trimmed) return { name: "", tag: "latest" };
  const slashParts = trimmed.split("/");
  const last = slashParts[slashParts.length - 1] ?? trimmed;
  const colonIdx = last.lastIndexOf(":");
  if (colonIdx > 0) {
    return {
      name: last.slice(0, colonIdx),
      tag: last.slice(colonIdx + 1) || "latest",
    };
  }
  return { name: last, tag: "latest" };
}

function inferFlagCount(content: string): number {
  const hasUser = content.includes("TEAM_USER_FLAG");
  const hasRoot = content.includes("TEAM_ROOT_FLAG");
  if (hasUser && hasRoot) return 2;
  if (hasUser || hasRoot) return 1;
  return 1;
}

function inferOs(content: string, docs: YamlDoc[]): "Linux" | "Window" {
  const lower = content.toLowerCase();
  if (
    lower.includes("ps1_sysnative") ||
    lower.includes("windows") ||
    lower.includes("cloudbase-init") ||
    lower.includes("rdp")
  ) {
    return "Window";
  }
  for (const doc of docs) {
    if (doc.kind !== "VirtualMachine") continue;
    const labels = (doc as { metadata?: { labels?: Record<string, string> } })
      .metadata?.labels;
    if (labels?.os?.toLowerCase().includes("windows")) return "Window";
  }
  return "Linux";
}

function firstContainerImage(doc: YamlDoc): string {
  return (
    doc.spec?.containers?.[0]?.image ||
    doc.spec?.template?.spec?.containers?.[0]?.image ||
    ""
  );
}

function formatYamlParseError(err: unknown): string {
  if (!(err instanceof Error)) return "Invalid YAML file.";

  const yamlErr = err as Error & {
    mark?: { line: number; column: number; snippet?: string };
  };
  const line = yamlErr.mark ? yamlErr.mark.line + 1 : null;
  const column = yamlErr.mark ? yamlErr.mark.column + 1 : null;
  const headline = err.message.split("\n")[0] ?? err.message;

  if (line != null && column != null) {
    return `Invalid YAML at line ${line}, column ${column}: ${headline}`;
  }
  return headline;
}

export function parseChallengeYaml(
  content: string,
): { ok: true; data: ParsedChallengeYaml } | { ok: false; error: string } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: "YAML file is empty." };
  }

  let docs: YamlDoc[];
  try {
    docs = loadAll(trimmed).filter(Boolean) as YamlDoc[];
  } catch (err) {
    return {
      ok: false,
      error: formatYamlParseError(err),
    };
  }

  if (docs.length === 0) {
    return { ok: false, error: "No Kubernetes resources found in YAML." };
  }

  const vms = docs.filter((d) => d.kind === "VirtualMachine");
  const pods = docs.filter((d) => d.kind === "Pod");
  const deployments = docs.filter((d) => d.kind === "Deployment");
  const secrets = docs.filter((d) => d.kind === "Secret");

  const dockerType: "docker" | "vm" = vms.length > 0 ? "vm" : "docker";
  const os = inferOs(trimmed, docs);
  const flagNum = inferFlagCount(trimmed);

  let kind = "Pod";
  let machineName = "";
  let imageName = "";
  let imageTag = "latest";

  if (vms.length > 0) {
    kind = "VirtualMachine";
    const primary =
      vms.find((vm) => !isSecondaryVm(vm.metadata?.name || "")) ?? vms[0];
    machineName = primary.metadata?.name || "";
    imageName = machineName;
    const secret = secrets[0];
    if (secret?.metadata?.name) {
      imageTag = secret.metadata.name;
    }
  } else if (pods.length > 0) {
    kind = "Pod";
    const pod = pods[0];
    machineName = pod.metadata?.name || "";
    imageName = machineName;
    const containerImage = firstContainerImage(pod);
    if (containerImage) {
      imageTag = parseContainerImage(containerImage).tag;
    }
  } else if (deployments.length > 0) {
    kind = "Deployment";
    const deployment = deployments[0];
    machineName = deployment.metadata?.name || "";
    imageName = machineName;
    const containerImage = firstContainerImage(deployment);
    if (containerImage) {
      imageTag = parseContainerImage(containerImage).tag;
    }
  } else {
    const workload = docs.find(
      (d) =>
        d.kind &&
        !["Secret", "NetworkPolicy", "NetworkAttachmentDefinition", "DataVolume"].includes(
          d.kind,
        ),
    );
    if (workload?.kind && workload.metadata?.name) {
      kind = workload.kind;
      machineName = workload.metadata.name;
      imageName = machineName;
    } else {
      return {
        ok: false,
        error:
          "YAML must include a Pod, Deployment, or VirtualMachine resource.",
      };
    }
  }

  if (!machineName) {
    return {
      ok: false,
      error: "Could not determine machine name from YAML metadata.",
    };
  }

  return {
    ok: true,
    data: {
      dockerType,
      kind,
      imageName,
      imageTag,
      machineName,
      os,
      flagNum: String(flagNum),
    },
  };
}

export async function parseChallengeYamlFile(
  file: File,
): Promise<{ ok: true; data: ParsedChallengeYaml } | { ok: false; error: string }> {
  try {
    const content = await file.text();
    return parseChallengeYaml(content);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to read YAML file.",
    };
  }
}
