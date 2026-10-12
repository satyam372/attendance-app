import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { LoginIllustration } from "../components/LoginIllustration.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { PasswordField, TextField } from "../components/ui/TextField.jsx";
import { Wordmark } from "../components/ui/Wordmark.jsx";

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

  return (
    <main
      className={clsx(
        "bg-login relative flex h-dvh flex-col overflow-hidden text-ink sm:h-auto sm:min-h-dvh",
        "sm:items-center sm:justify-center sm:px-5 sm:py-10",
        // Intro offsets: smaller lift and a full-height sheet slide on phones.
        "[--lift-scale:1.08] [--lift-y:40px] [--sheet-y:105%] sm:[--lift-scale:1.25] sm:[--lift-y:118px] sm:[--sheet-y:48px]",
      )}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col sm:max-w-[460px] sm:flex-none sm:gap-5">
        {/* Brand and illustration. Phones: the top 40% of the screen, illustration scaled to fit above the
            brand. From sm up: fixed-height stage with the illustration behind the brand, as designed. */}
        <div className="relative flex h-[40dvh] shrink-0 flex-col items-center gap-4 px-6 pt-[max(20px,env(safe-area-inset-top))] pb-7 sm:h-[300px] sm:justify-end sm:gap-0 sm:px-0 sm:pt-0 sm:pb-6">
          <div
            className={clsx(
              "flex min-h-0 w-full flex-1 justify-center sm:absolute sm:inset-x-0 sm:top-0 sm:flex-none",
              intro("motion-safe:animate-intro-art"),
            )}
          >
            <LoginIllustration className="h-full w-auto max-w-full sm:h-auto sm:w-full sm:max-w-[380px]" />
          </div>
          <div className={clsx("relative flex justify-center", intro("motion-safe:animate-intro-lift"))}>
            <h1 className={clsx("m-0 flex leading-none", intro("motion-safe:animate-intro-appear"))}>
              <Wordmark intro={playIntro} className="text-[26px] sm:text-[34px]" />
            </h1>
          </div>
        </div>

        {/* Sign-in card: a bottom sheet filling the remaining 60% on phones, with the button anchored to the
            bottom in thumb reach (scrolls inside only if it must); a floating card from sm up */}
        <section
          aria-labelledby="login-heading"
          className={clsx(
            "flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-sheet border-t border-line bg-surface px-6 pt-[30px] pb-[max(28px,env(safe-area-inset-bottom))] short:pt-6 short:pb-[max(20px,env(safe-area-inset-bottom))]",
            "shadow-[0_-24px_60px_rgb(46_29_92/0.1)] dark:shadow-[0_-24px_60px_rgb(0_0_0/0.35)]",
            "sm:flex-none sm:overflow-visible sm:rounded-sheet sm:border sm:px-9 sm:pt-8 sm:pb-9",
            "sm:shadow-[0_30px_80px_rgb(46_29_92/0.14)] sm:dark:shadow-[0_30px_80px_rgb(0_0_0/0.45)]",
            intro("motion-safe:animate-intro-sheet"),
          )}
        >
          <form noValidate onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 short:gap-5 sm:flex-none">
            <div className={clsx("flex flex-col gap-1.5", intro("motion-safe:animate-intro-rise-1"))}>
              <h2 id="login-heading" className="m-0 text-[30px] leading-[1.15] font-semibold tracking-[-0.02em] short:text-[26px]">
                Welcome
              </h2>
              <p className="m-0 text-[15px] leading-normal text-ink-muted short:text-sm">Sign in with your work email and password.</p>
            </div>

            <ErrorAlert>{formError}</ErrorAlert>

            <div className="flex flex-col gap-4 short:gap-3.5">
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
                inputClassName="short:h-12"
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
                inputClassName="short:h-12"
                value={password}
                error={fieldErrors.password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (fieldErrors.password) setFieldErrors((errors) => ({ ...errors, password: undefined }));
                }}
              />
            </div>

            <Button type="submit" size="lg" loading={submitting} className={clsx("mt-auto w-full short:h-12 sm:mt-0", intro("motion-safe:animate-intro-rise-4"))}>
              {submitting ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
