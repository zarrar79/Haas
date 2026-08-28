"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BiRightArrow, BiEnvelope, BiShield } from "react-icons/bi";

import { ApiRequestError, callAppApi } from "@/lib/client-api";
import type { ApiResult } from "@/types";

type LoginSuccessData = {
  user: unknown;
  message: string;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await callAppApi<ApiResult<LoginSuccessData>>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      router.push("/home");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      method="post"
      action="/api/auth/login"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[var(--text)]">
          Email Address
        </span>
        <span className="relative">
          <BiEnvelope className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--text-muted)]" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-11 pr-4 text-sm font-medium text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--brand-forest-medium)]/30 focus:shadow-md"
          />
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-[var(--text)]">
          Password
        </span>
        <span className="relative">
          <BiShield className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-[var(--text-muted)]" />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-11 pr-4 text-sm font-medium text-[var(--text)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--brand-forest-medium)]/30 focus:shadow-md"
          />
        </span>
      </label>

      {errorMessage ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger-muted)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[var(--accent-fg)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        <span>{isSubmitting ? "Signing in…" : "Sign In to Dashboard"}</span>
        {!isSubmitting ? <BiRightArrow className="text-lg" /> : null}
      </button>
    </form>
  );
}
