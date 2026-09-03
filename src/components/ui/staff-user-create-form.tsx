"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  createSystemUser,
  type SystemUser,
  type SystemUserCreateInput,
} from "@/features/system/system-api";

type Props = {
  disabled?: boolean;
  onCreated: (user: SystemUser) => void;
};

export function StaffUserCreateForm({ disabled = false, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState("Student");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: SystemUserCreateInput = {
        username: username.trim(),
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        last_name: lastName.trim() || undefined,
        user_type: userType,
        is_verified: true,
        email_verified: true,
      };
      const created = await createSystemUser(body);
      onCreated(created);
      setUsername("");
      setEmail("");
      setPassword("");
      setName("");
      setLastName("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Create user</p>
          <p className="text-xs text-[var(--text-muted)]">
            New accounts are attributed to you as the creating staff member.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide form" : "New user"}
        </Button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextField
            label="Username"
            name="new_username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={disabled || busy}
          />
          <TextField
            label="Email"
            name="new_email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || busy}
          />
          <TextField
            label="Password"
            name="new_password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled || busy}
          />
          <label className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">User type</span>
            <select
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text)]"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              disabled={disabled || busy}
            >
              <option value="Student">Student</option>
              <option value="Instructor">Instructor</option>
            </select>
          </label>
          <TextField
            label="First name"
            name="new_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || busy}
          />
          <TextField
            label="Last name"
            name="new_last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={disabled || busy}
          />
          {error ? (
            <div className="sm:col-span-2">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={disabled || busy}>
              {busy ? "Creating…" : "Create user"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
