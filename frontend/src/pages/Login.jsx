import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { LoginIllustration } from "../components/LoginIllustration.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { PasswordField, TextField } from "../components/ui/TextField.jsx";
import { Wordmark } from "../components/ui/Wordmark.jsx";
import { USE_MOCK_API } from "../lib/api.js";
import { DEMO_PASSWORD } from "../lib/mock/db.js";

// The intro animation plays once per browser session; after that the form shows instantly.
// Users who prefer reduced motion never see it (motion-safe: variants).
const INTRO_KEY = "speedin-login-intro-played";

function introAlreadyPlayed() {
  try {
    return sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your work email.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email, like name@speedinnovations.in.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

const DEMO_ACCOUNTS = [
  { label: "HR", email: "hr@speedinnovations.in" },
  { label: "Employee", email: "sandip@speedinnovations.in" },
  { label: "Employee", email: "ankur@speedinnovations.in" },
];

export default function Login() {
  const { login } = useAuth();
  const [playIntro] = useState(() => !introAlreadyPlayed());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.title = "Sign in · SpeedIn";
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      // Without storage the intro simply plays again next time.
    }
  }, []);

  // Only add intro animation classes on the first visit of the session.
  const intro = (classes) => (playIntro ? classes : "");

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate(email, password);
    setFieldErrors(errors);
    setFormError("");
    if (errors.email) return emailRef.current?.focus();
    if (errors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      // On success AuthContext switches to "authenticated" and the router leaves this page.
      await login(email, password);
    } catch (error) {
      setFormError(error.message || "Sign in failed. Please try again.");
      setSubmitting(false);
    }
  }

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setFormError("");
    passwordRef.current?.focus();
  }

  return (
    <main
      className={clsx(
        "bg-login relative flex min-h-dvh flex-col overflow-hidden text-ink",
        "sm:items-center sm:justify-center sm:px-5 sm:py-10",
        // Intro offsets: smaller lift and a full-height sheet slide on phones.
        "[--lift-scale:1.12] [--lift-y:64px] [--sheet-y:105%] sm:[--lift-scale:1.35] sm:[--lift-y:118px] sm:[--sheet-y:48px]",
      )}
    >
      <div className="flex w-full flex-1 flex-col sm:max-w-[460px] sm:flex-none sm:gap-5">
        {/* Brand and illustration. Phones: illustration on top, brand at the bottom, in normal flow so they
            never overlap. From sm up: fixed-height stage with the illustration behind the brand, as designed. */}
        <div className="relative flex flex-1 flex-col items-center justify-between gap-6 px-6 pt-[max(48px,env(safe-area-inset-top))] pb-8 sm:h-[330px] sm:flex-none sm:justify-end sm:gap-0 sm:px-0 sm:pt-0 sm:pb-[22px]">
          <div
            className={clsx(
              "flex w-full justify-center sm:absolute sm:inset-x-0 sm:top-0",
              intro("motion-safe:animate-intro-art"),
            )}
          >
            <LoginIllustration className="max-w-[340px] sm:max-w-[380px]" />
          </div>
          <div className={clsx("relative flex flex-col items-center gap-1.5", intro("motion-safe:animate-intro-lift"))}>
            <h1 className={clsx("m-0 leading-[1.15]", intro("motion-safe:animate-intro-appear"))}>
              <Wordmark intro={playIntro} className="text-[34px] sm:text-[40px]" />
            </h1>
            <p className={clsx("m-0 text-[13px] tracking-[0.02em] text-ink-soft", intro("motion-safe:animate-intro-rise-0"))}>
              Attendance by Speed Innovations
            </p>
          </div>
        </div>

        {/* Sign-in card: a bottom sheet on phones, a floating card from sm up */}
        <section
          aria-labelledby="login-heading"
          className={clsx(
            "rounded-t-sheet border-t border-line bg-surface px-6 pt-[30px] pb-[calc(34px+env(safe-area-inset-bottom))]",
            "shadow-[0_-24px_60px_rgb(46_29_92/0.1)] dark:shadow-[0_-24px_60px_rgb(0_0_0/0.35)]",
            "sm:rounded-sheet sm:border sm:px-9 sm:pt-8 sm:pb-9",
            "sm:shadow-[0_30px_80px_rgb(46_29_92/0.14)] sm:dark:shadow-[0_30px_80px_rgb(0_0_0/0.45)]",
            intro("motion-safe:animate-intro-sheet"),
          )}
        >
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className={clsx("flex flex-col gap-1.5", intro("motion-safe:animate-intro-rise-1"))}>
              <h2 id="login-heading" className="m-0 text-[30px] leading-[1.15] font-semibold tracking-[-0.02em]">
                Welcome
              </h2>
              <p className="m-0 text-[15px] leading-normal text-ink-muted">Sign in with your work email and password.</p>
            </div>

            <ErrorAlert>{formError}</ErrorAlert>

            <div className="flex flex-col gap-4">
              <TextField
                ref={emailRef}
                className={intro("motion-safe:animate-intro-rise-2")}
                label="Work email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@speedinnovations.in"
                value={email}
                error={fieldErrors.email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (fieldErrors.email) setFieldErrors((errors) => ({ ...errors, email: undefined }));
                }}
              />
              {/* TODO: add a "Forgot password?" link once the backend has a reset flow. Until then HR resets passwords. */}
              <PasswordField
                ref={passwordRef}
                className={intro("motion-safe:animate-intro-rise-3")}
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                error={fieldErrors.password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) setFieldErrors((errors) => ({ ...errors, password: undefined }));
                }}
              />
            </div>

            <Button type="submit" size="lg" loading={submitting} className={clsx("w-full", intro("motion-safe:animate-intro-rise-4"))}>
              {submitting ? "Signing in" : "Sign in"}
            </Button>
          </form>

          {USE_MOCK_API && (
            <div className={clsx("mt-6 border-t border-line pt-5", intro("motion-safe:animate-intro-rise-4"))}>
              <p className="m-0 mb-3 text-[13px] text-ink-muted">Demo accounts (mock API). Tap one to fill the form.</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account)}
                    aria-label={`Use the ${account.label} demo account, ${account.email}`}
                    className="min-h-11 cursor-pointer rounded-xl border border-line-strong bg-field px-3 py-2 text-left transition hover:border-focus"
                  >
                    <span className="block text-[13px] font-semibold text-ink">{account.label}</span>
                    <span className="block truncate text-xs text-ink-muted">{account.email.split("@")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
