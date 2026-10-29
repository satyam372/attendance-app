import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusChip } from "../components/attendance/StatusChip.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useTeamWeek } from "../hooks/useDashboard.js";
import { useHolidays } from "../hooks/useRequests.js";
import { describeDay } from "../lib/domain/dayStatus.js";
import { addDays, formatTime, shortWeekday, toDateKey, weekOf } from "../lib/domain/time.js";

const MODE_SHORT = { OFFICE: "Office", WFH: "WFH", HYBRID: "Half WFH" };

/** "19 Oct" for a "YYYY-MM-DD" key. */
function dayMonth(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "19 – 23 Oct 2026" (or "28 Sept – 2 Oct 2026") for Monday..Friday. */
function weekLabel(monday, friday) {
  const year = friday.slice(0, 4);
  return monday.slice(5, 7) === friday.slice(5, 7)
    ? `${Number(monday.slice(8))} – ${dayMonth(friday)} ${year}`
    : `${dayMonth(monday)} – ${dayMonth(friday)} ${year}`;
}

function SheetCell({ member, future, isToday, holiday }) {
  if (future) return <span className="text-xs text-ink-muted">Upcoming</span>;
  if (!member) return <span className="text-xs text-ink-muted" title="Not on the team yet">—</span>;

  const { category, label } = describeDay(member);
  const mode = member.status === "HALF_DAY_LEAVE" ? null : MODE_SHORT[member.work_mode];
  // No check-out yet today means still working; on a past day it was never recorded
  const out = member.out_time ? `– ${formatTime(member.out_time)}` : isToday ? "– …" : "(no check-out)";
  const times = member.in_time ? `${formatTime(member.in_time)} ${out}` : null;
  const shownLabel = member.status === "HOLIDAY" ? (holiday?.name ?? label) : member.status === "NOT_CHECKED_IN" ? "Not in yet" : label;
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusChip category={category} className="max-w-full truncate">
        {shownLabel}
      </StatusChip>
      {(mode || times) && (
        <span className="text-xs leading-snug text-ink-muted tabular-nums">
          {[mode, times].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}

/**
 * HR attendance sheet: everyone × Monday to Friday of a week, status and in/out times per cell.
 * Read-only: the backend has no correction route yet. Built from GET /dashboard/today/team per day.
 */
export default function HrSheet() {
  const todayKey = toDateKey();
  const thisMonday = weekOf(todayKey)[0];
  const [monday, setMonday] = useState(thisMonday);
  const days = weekOf(monday).slice(0, 5);
  const queries = useTeamWeek(days, todayKey);
  const holidays = useHolidays();

  useEffect(() => {
    document.title = "Attendance sheet · SpeedIn";
  }, []);

  const isThisWeek = monday === thisMonday;
  const holidayOn = new Map((holidays.data ?? []).filter((h) => !h.is_optional).map((h) => [h.holiday_date, h]));
  const failed = queries.find((q) => q.isError);
  const loading = queries.some((q) => q.isLoading);

  // Rows: everyone who appears on any day this week (someone who joined mid-week has empty earlier cells)
  const byDay = days.map((_, i) => new Map((queries[i].data ?? []).map((m) => [m.employee_id, m])));
  const people = new Map();
  for (const dayMembers of byDay) for (const m of dayMembers.values()) people.set(m.employee_id, m.name);
  const rows = [...people].sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HrTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">Attendance sheet</h1>
          <p className="m-0 mt-1 text-sm text-ink-muted">
            {weekLabel(days[0], days[4])}
            {rows.length ? ` · ${rows.length} ${rows.length === 1 ? "person" : "people"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl surface-control p-1">
          <button type="button" onClick={() => setMonday(addDays(monday, -7))} aria-label="Previous week" className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-field">
            <ChevronLeft className="size-4.5" aria-hidden="true" />
          </button>
          <span className="px-2 text-sm font-semibold" aria-live="polite">
            {isThisWeek ? "This week" : `Week of ${dayMonth(monday)}`}
          </span>
          <button
            type="button"
            onClick={() => setMonday(addDays(monday, 7))}
            disabled={isThisWeek}
            aria-label="Next week"
            className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-field disabled:cursor-default disabled:opacity-35"
          >
            <ChevronRight className="size-4.5" aria-hidden="true" />
          </button>
          {!isThisWeek && (
            <Button variant="ghost" onClick={() => setMonday(thisMonday)} className="h-10 px-3">
              This week
            </Button>
          )}
        </div>
      </header>

      {failed ? (
        <div className="flex flex-col gap-3">
          <ErrorAlert>{failed.error?.message ?? "Couldn't load the sheet."}</ErrorAlert>
          <Button variant="secondary" className="self-start" onClick={() => queries.forEach((q) => q.isError && q.refetch())}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <Skeleton className="h-80 w-full" />
      ) : (
        <div className="overflow-hidden rounded-3xl surface-card">
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-labelledby="sheet-caption">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
              <caption id="sheet-caption" className="sr-only">
                Attendance from {dayMonth(days[0])} to {dayMonth(days[4])}
              </caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="sticky left-0 z-10 w-32 bg-surface px-4 py-3 text-xs font-semibold text-ink-muted sm:w-48 sm:px-5">
                    Name
                  </th>
                  {days.map((day) => {
                    const holiday = holidayOn.get(day);
                    return (
                      <th key={day} scope="col" className={clsx("px-3 py-3 align-bottom", day === todayKey && "bg-accent-soft/50")}>
                        <span className={clsx("block text-xs font-semibold", day === todayKey ? "text-accent-ink" : "text-ink-muted")}>
                          {shortWeekday(day)} {dayMonth(day)}
                          {day === todayKey && " · today"}
                        </span>
                        {holiday && <span className="mt-0.5 block truncate text-xs font-semibold text-ink-soft">{holiday.name}</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-muted">
                      No one on the team this week.
                    </td>
                  </tr>
                ) : (
                  rows.map(([id, name]) => (
                    <tr key={id} className="border-b border-line/70 last:border-b-0">
                      <th scope="row" className="sticky left-0 z-10 w-32 bg-surface px-4 py-3 font-semibold sm:w-48 sm:px-5">
                        <span className="block leading-snug break-words">{name}</span>
                      </th>
                      {days.map((day, i) => (
                        <td key={day} className={clsx("px-3 py-3 align-top", day === todayKey && "bg-accent-soft/50")}>
                          <SheetCell member={byDay[i].get(id)} future={day > todayKey} isToday={day === todayKey} holiday={holidayOn.get(day)} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="m-0 text-xs text-ink-muted">
        Times are in India time. Correcting an entry isn&rsquo;t available yet; it needs a backend route for HR edits.
      </p>
    </div>
  );
}
