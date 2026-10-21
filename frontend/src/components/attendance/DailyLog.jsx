import clsx from "clsx";

import { describeDay } from "../../lib/domain/dayStatus.js";
import { formatDuration, formatTime } from "../../lib/domain/time.js";
import { dayTitle } from "./DayDetail.jsx";
import { StatusChip } from "./StatusChip.jsx";

/** PC "Daily log" table, newest first. Rows select the day on the calendar. */
export function DailyLog({ days, selected, onSelect }) {
  return (
    <section aria-labelledby="daily-log-heading" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="daily-log-heading" className="m-0 text-base font-bold">
        Daily log
      </h2>
      {days.length === 0 ? (
        <p className="m-0 py-6 text-center text-sm text-ink-muted">Nothing recorded for this month.</p>
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[440px] border-collapse text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-xs text-ink-muted">
                {["Date", "Status", "Check in", "Check out", "Hours"].map((heading) => (
                  <th key={heading} scope="col" className="border-b border-line px-2 py-2.5 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const { category, label } = describeDay(day);
                const isSelected = day.work_date === selected;
                return (
                  <tr key={day.work_date} className={clsx(isSelected && "bg-accent-soft")}>
                    <th scope="row" className="border-b border-line/60 p-0 text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => onSelect(day.work_date)}
                        aria-pressed={isSelected}
                        className="w-full cursor-pointer px-2 py-3 text-left font-semibold text-ink hover:text-accent-ink"
                      >
                        {dayTitle(day.work_date)}
                      </button>
                    </th>
                    <td className="border-b border-line/60 px-2 py-3">
                      <StatusChip category={category}>{label}</StatusChip>
                    </td>
                    <td className="border-b border-line/60 px-2 py-3 tabular-nums">{day.in_time ? formatTime(day.in_time) : "—"}</td>
                    <td className="border-b border-line/60 px-2 py-3 tabular-nums">{day.out_time ? formatTime(day.out_time) : "—"}</td>
                    <td className="border-b border-line/60 px-2 py-3 tabular-nums">{day.worked_minutes ? formatDuration(day.worked_minutes) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
