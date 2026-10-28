import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { ChangePasswordForm } from "../components/ChangePasswordForm.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Wordmark } from "../components/ui/Wordmark.jsx";

/**
 * First sign-in with a temporary password (must_change_password): the user sets their own
 * password before using the app. ProtectedRoute sends them here; once the change succeeds
 * AuthContext has must_change_password false and this page forwards to where they were going.
 */
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    document.title = "Set your password · SpeedIn";
  }, []);

  if (!user.must_change_password) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

  return (
    <main className="bg-login flex min-h-dvh flex-col items-center gap-6 px-4 pt-[max(32px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))] text-ink sm:justify-center sm:px-5 sm:py-10">
      <Wordmark className="text-[26px] sm:text-[30px]" />

      <section
        aria-labelledby="change-password-heading"
        className="flex w-full max-w-[440px] flex-col gap-6 rounded-sheet border border-line bg-surface px-6 pt-7 pb-8 shadow-[0_30px_80px_rgb(46_29_92/0.14)] sm:px-9 sm:pt-8 sm:pb-9 dark:shadow-[0_30px_80px_rgb(0_0_0/0.45)]"
      >
        <div className="flex flex-col gap-1.5">
          <h1 id="change-password-heading" className="m-0 text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[30px]">
            Set your password
          </h1>
          <p className="m-0 text-[15px] leading-normal text-ink-muted">
            Hi {user.name.split(" ")[0]}, you signed in with a temporary password. Choose your own to continue.
          </p>
        </div>

        <ChangePasswordForm size="lg" submitLabel="Save and continue" />
      </section>

      <Button
        variant="ghost"
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await logout();
        }}
      >
        {!signingOut && <LogOut className="size-4" aria-hidden="true" />}
        Sign out
      </Button>
    </main>
  );
}
