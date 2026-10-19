import clsx from "clsx";

import { Category, describeDay } from "../../lib/domain/dayStatus.js";
import { addDays, formatDuration, isWeekend, shortWeekday, weekdayOf } from "../../lib/domain/time.js";
import { CATEGORY_STYLES, LEGEND } from "./statusStyles.js";
import { StatusDot } from "./StatusChip.jsx";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Short text for the PC day cells; the full label stays in the aria-label, detail card and table.
const SHORT_LABEL = {
  [Category.LEAVE]: "Leave",
  [Category.HOLIDAY]: "Holiday",
  [Category.ABSENT]: "Absent",
  [Category.PENDING]: "Pending",
  [Category.TODAY]: "Today",
};

function daysOfMonth({ year, month }) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const days = [];
  for (let day = first; day.startsWith(first.slice(0, 8)); day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Month grid (Monday first). Each day shows a status dot; on PC it also shows hours or a short
 * status, as in the Desktop Attendance artboard. Future days are disabled.
 */
export function MonthCalendar({ value, byDate, todayKey, selected, onSelect }) {
  const days = daysOfMonth(value);
  const leading = (weekdayOf(days[0]) + 6) % 7; // blanks before the 1st (Monday = 0)
  const monthName = new Date(Date.UTC(value.year, value.month - 1, 1)).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-muted lg:gap-1.5">
        {WEEKDAYS.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>

      <ul className="m-0 grid list-none grid-cols-7 gap-1 p-0 lg:gap-1.5" aria-label={`Attendance, ${monthName}`}>
        {Array.from({ length: leading }, (_, i) => (
          <li key={`blank-${i}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const entry = byDate.get(day);
          const future = day > todayKey;
          const { category, label } = future ? { category: Category.NONE, label: "Upcoming" } : describeDay(entry);
          const muted = future || (!entry && isWeekend(day)) || category === Category.NONE;
          const isSelected = day === selected;
          const isToday = day === todayKey;
          const hours = entry?.worked_minutes ? formatDuration(entry.worked_minutes) : null;
          const shortHours = entry?.worked_minutes ? `${(entry.worked_minutes / 60).toFixed(1)}h` : null;
          const dayNumber = Number(day.slice(8));
          const description = !entry && isWeekend(day) && !future ? "Weekend" : label;

          return (
            <li key={day}>
              <button
                type="button"
                disabled={future}
                onClick={() => onSelect(day)}
                aria-pressed={isSelected}
                aria-label={`${shortWeekday(day)} ${dayNumber} ${monthName}: ${description}${hours ? `, ${hours}` : ""}${isToday ? ", today" : ""}`}
                className={clsx(
                  "flex h-11 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border text-sm font-semibold tabular-nums transition",
                  "lg:h-16 lg:items-start lg:justify-between lg:p-2",
                  "disabled:cursor-default",
                  isSelected
                    ? "border-accent bg-accent text-on-accent"
                    : isToday
                      ? "border-transparent bg-accent-soft text-accent-ink lg:border-accent-soft"
                      : clsx("border-transparent hover:bg-field lg:border-line", muted ? "text-ink-muted lg:bg-field/50" : "text-ink lg:bg-surface"),
                )}
              >
                <span className="lg:text-sm lg:font-bold">{dayNumber}</span>
                <span className="flex w-full min-w-0 items-center justify-center gap-1 text-[11px] font-semibold lg:justify-start">
                  <StatusDot
                    category={category}
                    color={isSelected && category === Category.TODAY ? "bg-on-accent" : undefined}
                    size="size-1.5"
                    className={clsx(isSelected && category !== Category.NONE && category !== Category.TODAY && "ring-2 ring-on-accent/70")}
                  />
                  {!muted && <span className="hidden min-w-0 truncate lg:inline">{shortHours ?? SHORT_LABEL[category] ?? label}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 pt-1 text-xs text-ink-soft" aria-label="Legend">
        {LEGEND.map(({ category, label }) => (
          <li key={category} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx("size-2 rounded-full", CATEGORY_STYLES[category].dot)} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
