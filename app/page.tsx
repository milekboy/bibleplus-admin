"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-toastify";
import { safeDashboardReturnTo } from "@/lib/auth/return-to";

type LoginResponse = { success?: boolean; message?: string; data?: { user?: { role?: string }; expiresAt?: number } };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "We could not reach BiblePlus. Please try again shortly.";
}
export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminAccessToken");
    sessionStorage.removeItem("adminUser");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      const validationMessage = "Enter your email address and password."; setFormError(validationMessage); toast.error(validationMessage);
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = (await response.json().catch(() => ({}))) as LoginResponse;
      if (!response.ok) throw new Error(payload.message || "We could not sign you in. Check your details and try again.");
      toast.success(payload.message || "Welcome back. You are signed in.");
      const requested = new URLSearchParams(window.location.search).get("returnTo");
      const destination = safeDashboardReturnTo(requested);
      router.replace(destination);
    } catch (error) {
      const failure = getErrorMessage(error); setFormError(failure); toast.error(failure);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-page)] p-3 sm:p-5 lg:p-7">
      <section className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_70px_rgba(15,42,86,0.10)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[0.88fr_1.12fr]">
        <div className="flex min-h-[calc(100vh-1.5rem)] flex-col px-6 py-7 sm:min-h-[calc(100vh-2.5rem)] sm:px-10 sm:py-9 lg:min-h-0 lg:px-14 xl:px-20">
          <div className="flex items-center gap-3 text-[var(--color-navy)]">
            <Image
              src="/icon.png"
              alt="BiblePlus logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover"
              priority
            />
            <div>
              <p className="text-lg font-semibold tracking-[-0.02em]">BiblePlus</p>
              <p className="text-sm text-[var(--color-muted)]">Admin console</p>
            </div>
          </div>

          <div className="my-auto w-full max-w-md self-center py-14 lg:self-start">
            <div className="mb-9">

              <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--color-navy)]">
                Welcome back
              </h1>
              <p className="mt-4 max-w-sm text-base leading-7 text-[var(--color-muted)]">
                Sign in to manage BiblePlus content, users, and platform operations.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--color-navy)]">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setFormError(""); }}
                  placeholder="admin@example.com"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? "login-error" : undefined}
                  className="h-13 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-base text-[var(--color-navy)] outline-none transition placeholder:text-[var(--color-placeholder)] hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-soft)] disabled:bg-[var(--color-surface-muted)]"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[var(--color-navy)]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setFormError(""); }}
                    placeholder="Enter your password"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(formError)}
                    aria-describedby={formError ? "login-error" : undefined}
                    className="h-13 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 pr-12 text-base text-[var(--color-navy)] outline-none transition placeholder:text-[var(--color-placeholder)] hover:border-[var(--color-primary)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-soft)] disabled:bg-[var(--color-surface-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-xl text-gray-400  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                </div>
              </div>



              {formError && <p id="login-error" role="alert" className="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{formError}</p>}



              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-[var(--color-primary)] px-5 text-base font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-soft)] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          <p className="text-sm text-[var(--color-muted)]">Authorized BiblePlus administrators only.</p>
        </div>

        <aside className="relative hidden min-h-full overflow-hidden bg-[#0b214a] p-12 text-white lg:flex lg:flex-col xl:p-16">
          <div className="login-orbit login-orbit-one" aria-hidden="true" />
          <div className="login-orbit login-orbit-two" aria-hidden="true" />
          <div className="relative z-10 max-w-xl">

            <h2 className="text-[clamp(2.75rem,5vw,5.4rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
              Everything that powers the christian community.
            </h2>
          </div>

          <div className="relative z-10 mt-auto grid max-w-xl grid-cols-3 border-t border-white/20 pt-7 text-sm text-blue-100">
            <p>Content</p>
            <p>Community</p>
            <p>Operations</p>
          </div>
        </aside>
      </section>
</main>
  );
}
