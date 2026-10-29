import clsx from "clsx";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import { itemsFor, PROFILE_ITEM } from "./navItems.js";

/** Phone and tablet navigation (below lg): a floating glass capsule above the content, like iOS. */
export function BottomNav() {
  const { user } = useAuth();
  const items = [...itemsFor(user.role), PROFILE_ITEM];

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className={clsx("glass-chrome pointer-events-auto mx-auto grid max-w-lg list-none gap-1 rounded-[26px] p-1.5", items.length > 4 ? "grid-cols-5" : "grid-cols-4")}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "flex min-h-13 flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] transition",
                  isActive ? "surface-pill font-bold text-accent-ink" : "font-semibold text-ink-muted hover:text-ink",
                )
              }
            >
              <Icon className="size-5.5" strokeWidth={2} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
