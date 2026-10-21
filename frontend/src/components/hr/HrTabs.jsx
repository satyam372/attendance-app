import clsx from "clsx";
import { NavLink } from "react-router-dom";

import { useRequestList } from "../../hooks/useRequests.js";

/** Tabs across the HR pages. The bottom tab bar's "Team" tab covers all of them on phones. */
export function HrTabs() {
  const pending = useRequestList(["PENDING"]);
  const count = pending.data?.length ?? 0;
  const tabs = [
    { to: "/hr", label: "Team today", short: "Today", end: true },
    { to: "/hr/approvals", label: "Approvals", badge: count },
    { to: "/hr/team", label: "People" },
    { to: "/hr/holidays", label: "Holidays" },
  ];

  return (
    <nav aria-label="HR" className="-mb-1 grid grid-cols-4 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line sm:flex sm:self-start">
      {tabs.map(({ to, label, short, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx(
              "flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-[13px] font-semibold whitespace-nowrap transition sm:px-4 sm:text-sm",
              isActive ? "bg-accent-soft text-accent-ink" : "text-ink-muted hover:text-ink",
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
