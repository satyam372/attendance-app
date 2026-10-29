import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import { DailyLog } from "../components/attendance/DailyLog.jsx";
import { DayDetail } from "../components/attendance/DayDetail.jsx";
import { MonthCalendar } from "../components/attendance/MonthCalendar.jsx";
import { monthLabel, MonthSwitcher } from "../components/attendance/MonthSwitcher.jsx";
import { CATEGORY_STYLES } from "../components/attendance/statusStyles.js";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useMonthHistory, useToday } from "../hooks/useAttendance.js";
import { useNow } from "../hooks/useNow.js";
import { Category, summarizeMonth } from "../lib/domain/dayStatus.js";
import { formatDuration, monthOf, toDateKey } from "../lib/domain/time.js";

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The employee's monthly record: counts, calendar, selected day and (PC) daily log. */
export default function Attendance() {
  const now = useNow(30_000);
  const today = useToday();
  const todayKey = today.data?.work_date ?? toDateKey(now);
  const current = monthOf(todayKey);
  const [month, setMonth] = useState(current);
  const [selected, setSelected] = useState(todayKey);
  const history = useMonthHistory(month.year, month.month);
  const days = history.data ?? [];
  const byDate = useMemo(() => new Map(days.map((d) => [d.work_date, d])), [days]);
  const isCurrentMonth = month.year === current.year && month.month === current.month;

  useEffect(() => {
    document.title = "Attendance · SpeedIn";
  }, []);

  function changeMonth(next) {
    setMonth(next);
    const sameAsCurrent = next.year === current.year && next.month === current.month;
    // Today in the current month; otherwise the last day of the month (newest entries first)
    setSelected(sameAsCurrent ? todayKey : null);
  }
  // In a past month, select its most recent recorded day once it has loaded
  const selectedDay = selected ?? days[0]?.work_date ?? null;

  const totals = summarizeMonth(days);
  const cards = [
    { label: "Present", value: totals.present, category: Category.PRESENT, tone: "text-present" },
    { label: "Late", value: totals.late, category: Category.LATE, tone: "text-late" },
    { label: "Absent", value: totals.absent, category: Category.ABSENT, tone: "text-absent" },
    { label: "Leave", value: fmtDays(totals.leave), category: Category.LEAVE, tone: "text-leave-ink" },
    { label: "Total hours", value: formatDuration(totals.workedMinutes), category: Category.TODAY, tone: "text-ink", pcOnly: true },
  ];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">Attendance</h1>
          <p className="m-0 mt-1 hidden text-sm text-ink-muted lg:block">Your daily record, check-ins and working hours</p>
        </div>
        <div className="hidden lg:block">
          <MonthSwitcher value={month} onChange={changeMonth} canGoNext={!isCurrentMonth} variant="boxed" />
        </div>
      </header>

      {history.isError ? (
        <div className="flex flex-col gap-3">
          <ErrorAlert>Couldn&rsquo;t load attendance for {monthLabel(month)}.</ErrorAlert>
          <Button variant="secondary" onClick={() => history.refetch()} className="self-start">
            Try again
          </Button>
        </div>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-4 gap-2 lg:grid-cols-5 lg:gap-3.5" aria-label={`Summary for ${monthLabel(month)}`}>
            {cards.map(({ label, value, category, tone, pcOnly }) => (
              // Only dt + dd inside each group (valid definition list); value above the label on phones
              <div
                key={label}
                className={clsx(
                  "flex-col-reverse gap-0.5 rounded-2xl surface-tile px-2.5 py-3 lg:flex-col lg:gap-1 lg:rounded-[18px] lg:px-4.5 lg:py-4",
                  pcOnly ? "hidden lg:flex" : "flex",
                )}
              >
                <dt className="flex items-center gap-2 text-xs text-ink-soft lg:text-[13px] lg:font-semibold">
                  <span aria-hidden="true" className={clsx("hidden size-2.5 shrink-0 rounded-full lg:block", CATEGORY_STYLES[category].dot)} />
                  {label}
                </dt>
                <dd className={clsx("m-0 text-xl font-extrabold tabular-nums lg:text-[22px]", tone)}>{history.isLoading ? "–" : value}</dd>
              </div>
            ))}
          </dl>

          {/* Calendar and daily log side by side only on wide screens (the design is 1440px); stacked below that */}
          <div className="flex flex-col gap-5 min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[1400px]:items-start">
            <section aria-label="Calendar" className="flex flex-col gap-3 rounded-3xl surface-card p-4 lg:p-5">
              <div className="lg:hidden">
                <MonthSwitcher value={month} onChange={changeMonth} canGoNext={!isCurrentMonth} />
              </div>
              {history.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <MonthCalendar value={month} byDate={byDate} todayKey={todayKey} selected={selectedDay} onSelect={setSelected} />
              )}
              {!history.isLoading && days.length === 0 && (
                <p className="m-0 text-center text-sm text-ink-muted">Nothing recorded for {monthLabel(month)}.</p>
              )}
            </section>

            {selectedDay && (
              <div className="lg:hidden">
                <DayDetail dateKey={selectedDay} day={byDate.get(selectedDay)} now={now} isToday={selectedDay === todayKey} />
              </div>
            )}

            <div className="hidden lg:block">
              {history.isLoading ? <Skeleton className="h-96 w-full" /> : <DailyLog days={days} selected={selectedDay} onSelect={setSelected} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
