import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggleButton } from "@/components/shell/theme-toggle-button";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-full w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggleButton />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          HAS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Credentials go to this app only. The BFF talks to Django using a
          server-only backend URL.
        </p>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <LoginForm />
      </div>
    </main>
  );
}
