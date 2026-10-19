import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { Role, ROLE_LABELS } from "../lib/domain/enums.js";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { Button } from "./ui/Button.jsx";
import { Wordmark } from "./ui/Wordmark.jsx";

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const navLinkClasses = ({ isActive }) =>
  clsx(
    "inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium transition sm:px-3.5",
    isActive ? "bg-field text-ink" : "text-ink-muted hover:text-ink",
  );

export function AppHeader() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <NavLink to="/" aria-label="SpeedIn home" className="rounded-lg">
          <Wordmark className="text-base sm:text-lg" />
        </NavLink>

        <nav aria-label="Main" className="flex items-center gap-1 sm:ml-6">
          <NavLink to="/" end className={navLinkClasses}>
            Home
          </NavLink>
          {user.role === Role.HR && (
            <NavLink to="/hr" className={navLinkClasses}>
              HR
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-1 sm:gap-3 sm:border-l sm:border-line sm:pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="m-0 text-sm font-medium text-ink">{user.name}</p>
              <p className="m-0 text-xs text-ink-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <span
              aria-hidden="true"
              className="hidden size-9 place-items-center rounded-full bg-accent text-[13px] font-semibold text-white sm:grid"
            >
              {initials(user.name)}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} loading={signingOut} aria-label="Sign out" title="Sign out">
              {!signingOut && <LogOut className="size-5" strokeWidth={1.8} aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
