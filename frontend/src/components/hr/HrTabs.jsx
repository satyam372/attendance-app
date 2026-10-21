import clsx from "clsx";
import { NavLink } from "react-router-dom";

import { useRequestList } from "../../hooks/useRequests.js";

/** Tabs across the HR pages. The bottom tab bar's "Team" tab covers all of them on phones. */
export function HrTabs() {
  const pending = useRequestList(["PENDING"]);
  const count = pending.data?.length ?? 0;
  const tabs = [
    { to: "/hr", label: "Team today", end: true },
    { to: "/hr/approvals", label: "Approvals", badge: count },
  ];

  return (
    <nav aria-label="HR" className="-mb-1 flex gap-1 overflow-x-auto rounded-2xl bg-surface p-1 ring-1 ring-line sm:self-start">
      {tabs.map(({ to, label, end, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            clsx(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition",
              isActive ? "bg-accent-soft text-accent-ink" : "text-ink-muted hover:text-ink",
            )
          }
        >
          {label}
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
