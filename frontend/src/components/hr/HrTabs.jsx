import clsx from "clsx";
import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext.jsx";
import { useEmployees } from "../../hooks/useEmployees.js";
import { useRequestList } from "../../hooks/useRequests.js";
import { splitForHr } from "../../lib/domain/approvals.js";

/**
 * Tabs across the HR pages. The bottom tab bar's "Team" tab covers all of them on phones,
 * where this bar scrolls sideways and keeps the current tab in view.
 */
export function HrTabs() {
  const { user } = useAuth();
  const pending = useRequestList(["PENDING"]);
  const employees = useEmployees();
  // Badge: only what HR decides (managers decide their teams' requests)
  const byId = new Map((employees.data ?? []).map((e) => [e.id, e]));
  const count = splitForHr(pending.data ?? [], user, byId).forYou.filter((item) => item.mode === "decide").length;
  const navRef = useRef(null);
  const { pathname } = useLocation();
  const tabs = [
    { to: "/hr", label: "Team today", short: "Today", end: true },
    { to: "/hr/sheet", label: "Sheet" },
    { to: "/hr/approvals", label: "Requests", badge: count },
    { to: "/hr/team", label: "People" },
    { to: "/hr/holidays", label: "Holidays" },
  ];

  // Scroll only the bar (not the page) so the current tab is fully visible. Runs again when the
  // Approvals badge appears, because it widens the tabs before it.
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector("[aria-current=page]");
    if (!active) return;
    const tab = active.getBoundingClientRect();
    const bar = nav.getBoundingClientRect();
    if (tab.right > bar.right) nav.scrollLeft += tab.right - bar.right + 4;
    else if (tab.left < bar.left) nav.scrollLeft -= bar.left - tab.left + 4;
  }, [pathname, count]);

  return (
    <nav
      ref={navRef}
      aria-label="HR"
      className="-mb-1 flex gap-1 self-start overflow-x-auto rounded-2xl surface-control p-1 [scrollbar-width:none] max-sm:max-w-full"
    >
      {tabs.map(({ to, label, short, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx(
              "flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap transition sm:px-4 sm:text-sm",
              isActive ? "surface-pill text-accent-ink" : "text-ink-muted hover:text-ink",
            )
          }
        >
          {short ? (
            <>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
          {badge > 0 && (
            <span className="min-w-5 rounded-full bg-checkout px-1.5 text-center text-[11px] leading-5 font-bold text-on-accent" aria-label={`${badge} waiting`}>
              {badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
