import clsx from "clsx";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
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

      <Button
        variant="secondary"
        size="lg"
        loading={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await logout();
        }}
        className="w-full text-checkout sm:w-auto sm:self-start"
      >
        {!signingOut && <LogOut className="size-5" aria-hidden="true" />}
        Sign out
      </Button>
    </div>
  );
}
