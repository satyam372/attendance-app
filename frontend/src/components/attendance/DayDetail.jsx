import { Category, describeDay } from "../../lib/domain/dayStatus.js";
import { formatDuration, formatTime, isWeekend, minutesBetween, shortWeekday } from "../../lib/domain/time.js";
import { StatusChip } from "./StatusChip.jsx";

function dayTitle(dateKey) {
  const [, m, d] = dateKey.split("-").map(Number);
  const month = new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
  return `${shortWeekday(dateKey)}, ${d} ${month}`;
}

/** The selected day: status, check-in, check-out and hours (phone Attendance artboard). */
export function DayDetail({ dateKey, day, now, isToday }) {
  const weekend = !day && isWeekend(dateKey);
  const { category, label, mode } = weekend ? { category: Category.NONE, label: "Weekend", mode: null } : describeDay(day);
  const running = isToday && day?.in_time && !day?.out_time;
  const minutes = day?.worked_minutes ?? (running ? minutesBetween(day.in_time, now) : null);

  return (
    <section aria-label="Selected day" className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-bold">{dayTitle(dateKey)}</h2>
          {mode && <p className="m-0 mt-0.5 text-xs text-ink-muted">{mode}</p>}
        </div>
        <StatusChip category={running ? Category.TODAY : category}>{running ? "In progress" : label}</StatusChip>
      </div>
      <dl className="m-0 grid grid-cols-3 gap-2.5">
        {[
          ["Check in", day?.in_time ? formatTime(day.in_time) : "--:--"],
          ["Check out", day?.out_time ? formatTime(day.out_time) : "--:--"],
          ["Hours", minutes != null ? formatDuration(minutes) : "—"],
        ].map(([term, value]) => (
          <div key={term} className="flex flex-col gap-0.5">
            <dt className="text-xs text-ink-muted">{term}</dt>
            <dd className="m-0 text-base font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { dayTitle };
