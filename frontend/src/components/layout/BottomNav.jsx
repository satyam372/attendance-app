import clsx from "clsx";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import { MovingPill } from "../ui/MovingPill.jsx";
import { itemsFor, PROFILE_ITEM } from "./navItems.js";

/** Phone and tablet navigation (below lg): a floating glass capsule above the content, like iOS. */
export function BottomNav() {
  const { user } = useAuth();
  const items = [...itemsFor(user.role), PROFILE_ITEM];
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="glass-chrome pointer-events-auto relative mx-auto max-w-lg rounded-[26px] p-1.5">
        <MovingPill group="tab-bar" watch={pathname} className="rounded-[20px]" />
        <ul className={clsx("m-0 grid list-none gap-1 p-0", items.length > 4 ? "grid-cols-5" : "grid-cols-4")}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  "relative flex min-h-13 flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] transition duration-300 ease-spring active:scale-[0.94] motion-reduce:active:scale-100",
                  isActive ? "font-bold text-accent-ink" : "font-semibold text-ink-muted hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* The icon of the tab you just opened gives a small bounce */}
                  <Icon className={clsx("size-5.5", isActive && "motion-safe:animate-symbol-bounce")} strokeWidth={2} aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
        </ul>
      </div>
    </nav>
  );
}
