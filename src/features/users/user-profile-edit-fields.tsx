"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { TextField } from "@/components/ui/text-field";
import type {
  EducationEntry,
  ExpertiseEntry,
} from "@/features/users/profile-fields-display";
import {
  DEGREE_OPTIONS,
  EDUCATION_LEVELS,
  EXPERTISE_CATEGORIES,
  GENDER_OPTIONS,
  TEAM_TYPE_OPTIONS,
  type UserProfileEditState,
} from "@/features/users/user-profile-edit-state";

const INPUT_CLASS =
  "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]";

type Props = {
  state: UserProfileEditState;
  onChange: (next: UserProfileEditState) => void;
  mode: "create" | "edit";
  password?: string;
  onPasswordChange?: (value: string) => void;
  mediaUrl?: string | null;
  imageFile?: File | null;
  clearImage?: boolean;
  onImageFileChange?: (file: File | null) => void;
  onClearImageChange?: (clear: boolean) => void;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </h3>
  );
}

export function UserProfileEditFields({
  state,
  onChange,
  mode,
  password = "",
  onPasswordChange,
  mediaUrl = null,
  imageFile = null,
  clearImage = false,
  onImageFileChange,
  onClearImageChange,
}: Props) {
  function patch(partial: Partial<UserProfileEditState>) {
    onChange({ ...state, ...partial });
  }

  function updateEducation(index: number, field: keyof EducationEntry, value: string) {
    const education = [...state.education];
    education[index] = { ...education[index], [field]: value };
    patch({ education });
  }

  function addEducation() {
    patch({
      education: [
        ...state.education,
        { level: "", degree: "", schoolName: "", sessionStart: "", sessionEnd: "" },
      ],
    });
  }

  function removeEducation(index: number) {
    patch({ education: state.education.filter((_, i) => i !== index) });
  }

  function updateCertification(index: number, value: string) {
    const certifications = [...state.certifications];
    certifications[index] = value;
    patch({ certifications });
  }

  function addCertification() {
    patch({ certifications: [...state.certifications, ""] });
  }

  function removeCertification(index: number) {
    patch({
      certifications: state.certifications.filter((_, i) => i !== index),
    });
  }

  function updateExpertise(
    index: number,
    field: keyof ExpertiseEntry,
    value: string | string[],
  ) {
    const expertise = [...state.expertise];
    expertise[index] = { ...expertise[index], [field]: value };
    patch({ expertise });
  }

  function addExpertise() {
    patch({
      expertise: [
        ...state.expertise,
        { category: "", level: "", techStack: [] },
      ],
    });
  }

  function removeExpertise(index: number) {
    patch({ expertise: state.expertise.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      {onImageFileChange && onClearImageChange ? (
        <section className="space-y-3">
          <SectionTitle>Profile image</SectionTitle>
          <ImageUploadField
            label="Photo"
            currentUrl={mediaUrl}
            name={[state.name, state.last_name].filter(Boolean).join(" ") || state.username}
            file={imageFile}
            clearRequested={clearImage}
            onFileChange={onImageFileChange}
            onClearChange={onClearImageChange}
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionTitle>Account</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Email"
            name="email"
            type="email"
            value={state.email}
            disabled={mode === "edit"}
            onChange={(e) => patch({ email: e.target.value })}
          />
          <TextField
            label="Username"
            name="username"
            value={state.username}
            onChange={(e) => patch({ username: e.target.value })}
          />
          {mode === "create" ? (
            <TextField
              label="Password"
              name="password"
              type="password"
              className="sm:col-span-2"
              value={state.password}
              onChange={(e) => patch({ password: e.target.value })}
            />
          ) : (
            <TextField
              label="New password (optional)"
              name="new_password"
              type="password"
              className="sm:col-span-2"
              value={password}
              onChange={(e) => onPasswordChange?.(e.target.value)}
            />
          )}
          <TextField
            label="First name"
            name="name"
            value={state.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <TextField
            label="Last name"
            name="last_name"
            value={state.last_name}
            onChange={(e) => patch({ last_name: e.target.value })}
          />
          <TextField
            label="Phone number"
            name="phone_number"
            value={state.phone_number}
            onChange={(e) => patch({ phone_number: e.target.value })}
            placeholder="+92XXXXXXXXXX"
          />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Gender</span>
            <select
              className={INPUT_CLASS}
              value={state.gender}
              onChange={(e) => patch({ gender: e.target.value })}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)] sm:col-span-2">
            <span className="font-medium text-[var(--text)]">Team type</span>
            <select
              className={INPUT_CLASS}
              value={state.teamType}
              onChange={(e) => patch({ teamType: e.target.value })}
            >
              <option value="">Not set</option>
              {TEAM_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Education</SectionTitle>
          <Button type="button" size="sm" variant="secondary" onClick={addEducation}>
            Add education
          </Button>
        </div>
        {state.education.length === 0 ? (
          <p className="text-sm italic text-[var(--text-muted)]">
            No education entries yet. Click &quot;Add education&quot; to add one.
          </p>
        ) : (
          <ul className="space-y-3">
            {state.education.map((entry, index) => (
              <li
                key={index}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">Level</span>
                    <select
                      className={INPUT_CLASS}
                      value={entry.level || ""}
                      onChange={(e) =>
                        updateEducation(index, "level", e.target.value)
                      }
                    >
                      <option value="">Select level</option>
                      {EDUCATION_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">Degree</span>
                    <select
                      className={INPUT_CLASS}
                      value={entry.degree || ""}
                      onChange={(e) =>
                        updateEducation(index, "degree", e.target.value)
                      }
                    >
                      <option value="">Select degree</option>
                      {DEGREE_OPTIONS.map((degree) => (
                        <option key={degree} value={degree}>
                          {degree}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField
                    label="School / college"
                    name={`school_${index}`}
                    value={entry.schoolName || ""}
                    onChange={(e) =>
                      updateEducation(index, "schoolName", e.target.value)
                    }
                  />
                  <TextField
                    label="Session start"
                    name={`session_start_${index}`}
                    value={String(entry.sessionStart ?? "")}
                    onChange={(e) =>
                      updateEducation(index, "sessionStart", e.target.value)
                    }
                    placeholder="YYYY"
                  />
                  <TextField
                    label="Session end"
                    name={`session_end_${index}`}
                    value={String(entry.sessionEnd ?? "")}
                    onChange={(e) =>
                      updateEducation(index, "sessionEnd", e.target.value)
                    }
                    placeholder="YYYY"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => removeEducation(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Certifications</SectionTitle>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={addCertification}
          >
            Add certification
          </Button>
        </div>
        {state.certifications.length === 0 ? (
          <p className="text-sm italic text-[var(--text-muted)]">
            No certifications yet. Click &quot;Add certification&quot; to add one.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.certifications.map((cert, index) => (
              <li key={index} className="flex gap-2">
                <TextField
                  label={`Certification ${index + 1}`}
                  name={`cert_${index}`}
                  value={cert}
                  className="flex-1"
                  onChange={(e) => updateCertification(index, e.target.value)}
                />
                <div className="flex items-end pb-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeCertification(index)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Expertise</SectionTitle>
          <Button type="button" size="sm" variant="secondary" onClick={addExpertise}>
            Add expertise
          </Button>
        </div>
        {state.expertise.length === 0 ? (
          <p className="text-sm italic text-[var(--text-muted)]">
            No expertise entries yet. Click &quot;Add expertise&quot; to add one.
          </p>
        ) : (
          <ul className="space-y-3">
            {state.expertise.map((entry, index) => (
              <li
                key={index}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">Category</span>
                    <select
                      className={INPUT_CLASS}
                      value={entry.category || ""}
                      onChange={(e) =>
                        updateExpertise(index, "category", e.target.value)
                      }
                    >
                      <option value="">Select category</option>
                      {EXPERTISE_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField
                    label="Level"
                    name={`expertise_level_${index}`}
                    value={entry.level || ""}
                    onChange={(e) =>
                      updateExpertise(index, "level", e.target.value)
                    }
                    placeholder="Beginner, Intermediate, Advanced…"
                  />
                  <TextField
                    label="Skills (comma-separated)"
                    name={`expertise_skills_${index}`}
                    className="sm:col-span-2"
                    value={(entry.techStack || []).join(", ")}
                    onChange={(e) =>
                      updateExpertise(
                        index,
                        "techStack",
                        e.target.value
                          .split(",")
                          .map((part) => part.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Python, Wireshark, Burp Suite…"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => removeExpertise(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
