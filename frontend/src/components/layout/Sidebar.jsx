import clsx from "clsx";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import { ROLE_LABELS } from "../../lib/domain/enums.js";
import { ThemeToggle } from "../ThemeToggle.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { Wordmark } from "../ui/Wordmark.jsx";
import { itemsFor } from "./navItems.js";
import { photoUrl } from "../../lib/services/profile.js";

/** PC navigation (lg and up): a floating glass panel beside the content. */
export function Sidebar() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 p-3 lg:block">
      <div className="glass-chrome flex h-full flex-col gap-7 rounded-[28px] px-4 py-6">
      <Link to="/" aria-label="SpeedIn home" className="self-start rounded-lg px-2">
        <Wordmark className="text-lg" />
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {itemsFor(user.role).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition",
                isActive ? "surface-pill font-bold text-accent-ink" : "font-semibold text-ink-soft hover:bg-(--glass-hover) hover:text-ink",
              )
            }
          >
            <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-ink-muted">Theme</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl surface-inset p-3">
          <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg" aria-label={`Profile: ${user.name}`}>
            <Avatar name={user.name} src={photoUrl(user)} className="size-9.5 text-[13px]" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
              <span className="block text-xs text-ink-muted">{ROLE_LABELS[user.role]}</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            loading={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await logout();
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            {!signingOut && <LogOut className="size-4.5" strokeWidth={2} aria-hidden="true" />}
          </Button>
        </div>
      </div>
      </div>
    </aside>
  );
}
