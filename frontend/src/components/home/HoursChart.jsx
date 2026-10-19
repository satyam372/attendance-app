import clsx from "clsx";
import { Link } from "react-router-dom";

import { useHistoryForDays } from "../../hooks/useAttendance.js";
import { addDays, formatDuration, minutesBetween, shortWeekday, weekOf } from "../../lib/domain/time.js";
import { Skeleton } from "../ui/Skeleton.jsx";

const BAR_HEIGHT = 96; // px, also the SVG viewBox height
const FULL_DAY_MINUTES = 600; // a 10-hour day fills the bar

const STATUS_TEXT = {
  LEAVE: "Leave",
  HALF_DAY_LEAVE: "Half-day leave",
  HOLIDAY: "Holiday",
  ABSENT: "Absent",
  AWAITING_APPROVAL: "Awaiting approval",
  REJECTED: "Rejected",
};

/** Days 1..today of the current month (for the PC "Hours this month" chart). */
function monthSoFar(todayKey) {
  const days = [];
  for (let day = `${todayKey.slice(0, 7)}-01`; day <= todayKey; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Hours worked per day; today's bar grows while checked in.
 * range "week": Monday to Sunday (phone Home artboard). "month": this month so far, the days the
 * attendance history covers (Desktop Dashboard artboard).
 */
export function HoursChart({ range = "week", todayKey, attendance, now, className }) {
  const candidates = range === "month" ? monthSoFar(todayKey) : weekOf(todayKey);
  const { byDate, isLoading } = useHistoryForDays(candidates);
  // Month: only days the history returns (it skips days before the employee joined and
  // unworked weekends), plus today. Week: all seven days, so upcoming days show as empty.
  const days = range === "month" ? candidates.filter((day) => byDate.has(day) || day === todayKey) : candidates;
  const title = range === "month" ? "Hours this month" : "This week";
  const headingId = `hours-${range}-heading`;

  const bars = days.map((day) => {
    const entry = byDate.get(day);
    const isToday = day === todayKey;
    let minutes = entry?.worked_minutes ?? 0;
    if (isToday && attendance?.in_time) minutes = minutesBetween(attendance.in_time, attendance.out_time ?? now);
    const height = minutes > 0 ? Math.max(8, Math.min(BAR_HEIGHT, (minutes / FULL_DAY_MINUTES) * BAR_HEIGHT)) : 6;
    const note = day > todayKey ? "upcoming" : minutes > 0 ? formatDuration(minutes) : STATUS_TEXT[entry?.status] ?? "no hours";
    const short = range === "month" ? String(Number(day.slice(8))) : shortWeekday(day).charAt(0);
    return { day, isToday, minutes, height, short, label: `${shortWeekday(day)} ${Number(day.slice(8))}: ${note}` };
  });

  return (
    <section aria-labelledby={headingId} className={clsx("flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-4.5 lg:p-5.5", className)}>
      <div className="flex items-baseline justify-between">
        <h2 id={headingId} className="m-0 text-[15px] font-bold lg:text-base">
          {title}
        </h2>
        <Link to="/attendance" className="text-[13px] font-semibold text-accent-ink no-underline hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-30 w-full" />
      ) : (
        <ul className="m-0 flex list-none gap-1.5 p-0 sm:gap-2" aria-label={`Hours worked, ${title.toLowerCase()}`}>
          {bars.map(({ day, isToday, minutes, height, short, label }) => (
            <li key={day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" aria-label={label} title={label}>
              <span aria-hidden="true" className="h-4 text-[10px] font-semibold text-ink-muted tabular-nums">
                {minutes > 0 && range === "week" ? `${(minutes / 60).toFixed(1)}h` : ""}
              </span>
              <svg aria-hidden="true" viewBox={`0 0 26 ${BAR_HEIGHT}`} preserveAspectRatio="none" className="h-24 w-full max-w-6.5 lg:h-36 lg:max-w-8">
                <rect
                  x="0"
                  y={BAR_HEIGHT - height}
                  width="26"
                  height={height}
                  rx="8"
                  className={isToday ? "fill-accent" : minutes > 0 ? "fill-bar" : "fill-bar-empty"}
                />
              </svg>
              <span aria-hidden="true" className={clsx("text-[11px] font-semibold", isToday ? "text-accent-ink" : "text-ink-muted")}>
                {short}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
