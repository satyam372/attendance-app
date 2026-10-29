import clsx from "clsx";

import { useMonthHistory } from "../../hooks/useAttendance.js";
import { formatDuration, isWeekend, monthOf } from "../../lib/domain/time.js";
import { Skeleton } from "../ui/Skeleton.jsx";

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** This month so far: present days, average hours, late arrivals and WFH used. */
export function MonthStats({ today, className }) {
  const { year, month } = monthOf(today.work_date);
  const { data: days, isLoading } = useMonthHistory(year, month);

  if (isLoading || !days) {
    return (
      <div className={clsx("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Working days so far: weekdays that are not holidays, and not today until checked in
  const workingDays = days.filter((d) => !isWeekend(d.work_date) && d.status !== "HOLIDAY" && d.status !== "NOT_CHECKED_IN");
  const present = days.filter((d) => d.in_time).length;
  const worked = days.filter((d) => d.worked_minutes > 0);
  const avgMinutes = worked.length ? worked.reduce((sum, d) => sum + d.worked_minutes, 0) / worked.length : null;
  const late = days.filter((d) => d.punctuality === "LATE").length;

  const stats = [
    { label: "Present days", value: present, suffix: ` / ${workingDays.length}`, tone: "text-success" },
    { label: "Avg. hours / day", value: formatDuration(avgMinutes) },
    { label: "Late arrivals", value: late, tone: late ? "text-late" : undefined },
    { label: "WFH used", value: fmtDays(today.wfh_used), suffix: ` / ${today.wfh_free} free`, tone: "text-accent-ink" },
  ];

  return (
    <section aria-label="This month" className={className}>
      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, suffix, tone }) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-[20px] surface-tile p-4.5">
            <dt className="text-[13px] font-semibold text-ink-muted">{label}</dt>
            <dd className={clsx("m-0 text-[26px] leading-tight font-extrabold tabular-nums", tone)}>
              {value}
              {suffix && <span className="text-sm font-semibold text-ink-muted">{suffix}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
