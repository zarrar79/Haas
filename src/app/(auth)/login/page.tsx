import Link from "next/link";
import { BiStar } from "react-icons/bi";

import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggleButton } from "@/components/shell/theme-toggle-button";

export default function LoginPage() {
  return (
    <div className="login-wrapper">
      <div className="login-bg-shape login-bg-shape-1" aria-hidden />
      <div className="login-bg-shape login-bg-shape-2" aria-hidden />

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggleButton />
      </div>

      <div className="login-card">
        <Link
          href="/login"
          className="mb-6 flex items-center justify-center gap-3 text-2xl font-extrabold text-[var(--brand-forest-dark)]"
        >
          <BiStar className="text-[1.75rem] text-[var(--brand-forest-medium)]" />
          <span>HAS Admin</span>
        </Link>

        <p className="mb-8 text-center text-sm font-medium text-[var(--text-muted)]">
          Please sign in to access your dashboard
        </p>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Credentials stay on this app. The BFF talks to Django using a
          server-only backend URL.
        </p>
      </div>
    </div>
  );
}
