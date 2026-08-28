import type { EventUser, EventUserUpdateInput } from "@/features/users/users-api";
import {
  getCertificationNames,
  getEducationEntries,
  getExpertiseEntries,
  type EducationEntry,
  type ExpertiseEntry,
} from "@/features/users/profile-fields-display";
import { parseTeamTypeLabel } from "@/features/users/team-type-display";

export const EDUCATION_LEVELS = [
  "High School",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate (PhD)",
  "Professional Certification",
  "Diploma",
  "Other",
] as const;

export const DEGREE_OPTIONS = [
  "BS Computer Science",
  "BS Software Engineering",
  "BS Cyber Security",
  "MS Computer Science",
  "PhD Computer Science",
] as const;

export const EXPERTISE_CATEGORIES = [
  "Web Security",
  "Network Security",
  "Cryptography",
  "Reverse Engineering",
  "Forensics",
  "Mobile Security",
  "Cloud Security",
  "DevSecOps",
  "Penetration Testing",
  "Security Analysis",
  "Incident Response",
  "Security Architecture",
] as const;

export const TEAM_TYPE_OPTIONS = ["Red", "Blue", "Purple", "Mix"] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Not Provided"] as const;

export type UserProfileEditState = {
  email: string;
  username: string;
  password: string;
  name: string;
  last_name: string;
  phone_number: string;
  gender: string;
  teamType: string;
  education: EducationEntry[];
  certifications: string[];
  expertise: ExpertiseEntry[];
};

export function emptyUserProfileEditState(): UserProfileEditState {
  return {
    email: "",
    username: "",
    password: "",
    name: "",
    last_name: "",
    phone_number: "",
    gender: "",
    teamType: "",
    education: [],
    certifications: [],
    expertise: [],
  };
}

export function userProfileToEditState(user: EventUser): UserProfileEditState {
  const education = getEducationEntries(user.education);
  const certifications = getCertificationNames(user.certifications);
  const expertise = getExpertiseEntries(user.expertise);

  return {
    email: user.email || "",
    username: user.username || "",
    password: "",
    name: user.name || "",
    last_name: user.last_name || "",
    phone_number: user.phone_number || "",
    gender: user.gender || "",
    teamType: parseTeamTypeLabel(user.team_type) || "",
    education: education.length > 0 ? education : [],
    certifications,
    expertise,
  };
}

function hasEducationContent(entry: EducationEntry): boolean {
  return getEducationEntries([entry]).length > 0;
}

function hasExpertiseContent(entry: ExpertiseEntry): boolean {
  return getExpertiseEntries([entry]).length > 0;
}

function educationEntryToPayload(entry: EducationEntry) {
  const institution = entry.schoolName?.trim() || "";
  const isHighSchool = entry.level === "High School";
  return {
    level: entry.level?.trim() || undefined,
    degree: entry.degree?.trim() || undefined,
    schoolName: institution || undefined,
    ...(isHighSchool || !institution ? {} : { university: institution }),
    sessionStart: entry.sessionStart?.toString().trim() || undefined,
    sessionEnd: entry.sessionEnd?.toString().trim() || undefined,
  };
}

export function educationToPayload(entries: EducationEntry[]): unknown {
  const cleaned = entries
    .filter(hasEducationContent)
    .map(educationEntryToPayload);
  if (cleaned.length === 0) return {};
  if (cleaned.length === 1) return cleaned[0];
  return cleaned;
}

export function certificationsToPayload(names: string[]) {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

export function expertiseToPayload(entries: ExpertiseEntry[]) {
  return entries
    .filter(hasExpertiseContent)
    .map((entry) => ({
      category: entry.category?.trim() || undefined,
      level: entry.level?.trim() || undefined,
      techStack: entry.techStack?.map((tech) => tech.trim()).filter(Boolean) ?? [],
    }));
}

export function buildTeamTypePayload(
  existing: unknown,
  typeLabel: string,
): Record<string, unknown> | undefined {
  const type = typeLabel.trim();
  if (!type) return undefined;

  const base =
    typeof existing === "object" && existing !== null
      ? { ...(existing as Record<string, unknown>) }
      : {};

  return { ...base, type };
}

export function editStateToUpdatePayload(
  state: UserProfileEditState,
  existingTeamType?: unknown,
  newPassword?: string,
): EventUserUpdateInput {
  return {
    username: state.username.trim() || undefined,
    name: state.name.trim() || undefined,
    last_name: state.last_name.trim() || undefined,
    phone_number: state.phone_number.trim() || undefined,
    gender: state.gender.trim() || undefined,
    password: newPassword || undefined,
    education: educationToPayload(state.education),
    certifications: certificationsToPayload(state.certifications),
    expertise: expertiseToPayload(state.expertise),
    team_type: buildTeamTypePayload(existingTeamType, state.teamType),
  };
}
