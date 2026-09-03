import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { AppBrandMark } from "@/components/shell/app-brand-mark";
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
          className="mb-6 flex items-center justify-center gap-3 text-xl font-extrabold text-[var(--brand-forest-dark)] sm:text-2xl"
        >
          <AppBrandMark size={40} />
          <span>
            <span className="text-[var(--brand-forest-medium)]">Cyber Range</span>
            <span> Digiinn360</span>
          </span>
        </Link>

        <p className="mb-8 text-center text-sm font-medium text-[var(--text-muted)]">
          Please sign in to access your dashboard
        </p>

        <LoginForm />

     
      </div>
    </div>
  );
}
