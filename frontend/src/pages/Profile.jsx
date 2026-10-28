import clsx from "clsx";
import { CircleCheck, KeyRound, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { ChangePasswordForm } from "../components/ChangePasswordForm.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Card } from "../components/ui/Card.jsx";
import { ROLE_LABELS } from "../lib/domain/enums.js";
import { useTheme } from "../theme/ThemeContext.jsx";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  // "closed" → "open" (form showing) → "changed" (confirmation until opened again)
  const [passwordPanel, setPasswordPanel] = useState("closed");

  useEffect(() => {
    document.title = "Profile · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Profile</h1>

      <Card className="flex items-center gap-4">
        <Avatar name={user.name} className="size-14 text-lg" />
        <div className="min-w-0">
          <p className="m-0 text-lg font-bold">{user.name}</p>
          <p className="m-0 truncate text-sm text-ink-muted">{user.email}</p>
          <p className="m-0 mt-1 text-xs font-semibold text-accent-ink">{ROLE_LABELS[user.role]}</p>
        </div>
      </Card>

      <Card>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 text-base font-bold">Appearance</legend>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-field p-1">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={clsx(
                  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
                  preference === value ? "bg-surface text-accent-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => setPreference(value)}
                  className="sr-only"
                />
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card aria-labelledby="password-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="password-heading" className="m-0 text-base font-bold">
              Password
            </h2>
            <p className="m-0 mt-1 text-sm text-ink-muted">The password you sign in with.</p>
          </div>
          {passwordPanel !== "open" && (
            <Button variant="secondary" onClick={() => setPasswordPanel("open")}>
              <KeyRound className="size-4" aria-hidden="true" />
              Change password
            </Button>
          )}
        </div>
        {passwordPanel === "changed" && (
          <p role="status" className="m-0 flex items-center gap-2 text-sm font-semibold text-success">
            <CircleCheck className="size-4" aria-hidden="true" />
            Password changed. Use the new one next time you sign in.
          </p>
        )}
        {passwordPanel === "open" && (
          <ChangePasswordForm
            onSuccess={() => setPasswordPanel("changed")}
            actions={
              <Button variant="ghost" onClick={() => setPasswordPanel("closed")}>
                Cancel
              </Button>
            }
          />
        )}
      </Card>

      <Button
        variant="danger"
        size="lg"
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await logout();
        }}
        className="w-full sm:w-auto sm:self-start"
      >
        {!signingOut && <LogOut className="size-5" aria-hidden="true" />}
        Sign out
      </Button>
    </div>
  );
}
