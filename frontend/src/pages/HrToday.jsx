import clsx from "clsx";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { StatusDot } from "../components/attendance/StatusChip.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { TeamMemberCard } from "../components/hr/TeamMemberCard.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Segmented } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useToday } from "../hooks/useAttendance.js";
import { useDaySummary, useTeamDay } from "../hooks/useDashboard.js";
import { useNow } from "../hooks/useNow.js";
import { useHolidays } from "../hooks/useRequests.js";
import { Category } from "../lib/domain/dayStatus.js";
import { Punctuality } from "../lib/domain/rules.js";
import { addDays, formatLongDate, toDateKey } from "../lib/domain/time.js";

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "missing", label: "Not in" },
  { value: "late", label: "Late" },
  { value: "leave", label: "On leave" },
];

const matches = (filter, member) =>
  filter === "all" ||
  (filter === "missing" && (member.status === "NOT_CHECKED_IN" || member.status === "ABSENT")) ||
  (filter === "late" && member.punctuality === Punctuality.LATE) ||
  (filter === "leave" && (member.status === "LEAVE" || member.status === "HALF_DAY_LEAVE"));

/** HR "Team today": counts and one card per employee for a day (GET /dashboard/today + /today/team). */
export default function HrToday() {
  const now = useNow(30_000);
  const me = useToday();
  const todayKey = me.data?.work_date ?? toDateKey(now);
  const [day, setDay] = useState(null); // null = today, decided by the server
  const [filter, setFilter] = useState("all");
  const isToday = day === null || day === todayKey;
  const shownDay = day ?? todayKey;

  const summary = useDaySummary(isToday ? null : day, { isToday });
  const team = useTeamDay(isToday ? null : day, { isToday });
  const holidays = useHolidays();

  useEffect(() => {
    document.title = "Team today · SpeedIn";
  }, []);

  const s = summary.data;
  const members = team.data ?? [];
  const holiday = (holidays.data ?? []).find((h) => h.holiday_date === shownDay && !h.is_optional);
  const go = (delta) => {
    const next = addDays(shownDay, delta);
    setDay(next >= todayKey ? null : next);
  };

  const cards = s
    ? [
        { label: "In office", value: s.in_office, category: Category.PRESENT },
        { label: "Work from home", value: s.wfh + s.hybrid, note: s.hybrid ? `${s.hybrid} half day` : null, category: Category.TODAY },
        { label: "On leave", value: s.on_leave + s.half_day_leave, note: s.half_day_leave ? `${s.half_day_leave} half day` : null, category: Category.LEAVE },
        { label: isToday ? "Not checked in" : "Absent", value: s.not_checked_in, category: Category.ABSENT },
        { label: "Late", value: s.late, category: Category.LATE },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HrTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">{isToday ? "Team today" : "Team on this day"}</h1>
          <p className="m-0 mt-1 text-sm text-ink-muted">
            {formatLongDate(new Date(`${shownDay}T12:00:00+05:30`))}
            {s ? ` · ${s.team_size} ${s.team_size === 1 ? "person" : "people"}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl surface-control p-1">
          <button type="button" onClick={() => go(-1)} aria-label="Previous day" className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-field">
            <ChevronLeft className="size-4.5" aria-hidden="true" />
          </button>
          <label className="sr-only" htmlFor="hr-day">
            Day
          </label>
          <input
            id="hr-day"
            type="date"
            max={todayKey}
            value={shownDay}
            onChange={(e) => e.target.value && setDay(e.target.value >= todayKey ? null : e.target.value)}
            className="h-10 rounded-lg bg-transparent px-2 text-sm font-semibold text-ink focus:outline-none"
          />
          <button
            type="button"
            onClick={() => go(1)}
            disabled={isToday}
            aria-label="Next day"
            className="grid size-10 cursor-pointer place-items-center rounded-lg hover:bg-field disabled:cursor-default disabled:opacity-35"
          >
            <ChevronRight className="size-4.5" aria-hidden="true" />
          </button>
          {!isToday && (
            <Button variant="ghost" onClick={() => setDay(null)} className="h-10 px-3">
              Today
            </Button>
          )}
        </div>
      </header>

      {s && !s.is_working_day && (
        <p className="m-0 flex items-center gap-2.5 rounded-2xl surface-card px-4 py-3 text-sm text-ink-soft">
          <CalendarClock className="size-5 text-accent-ink" aria-hidden="true" />
          {holiday ? `${holiday.name}: a company holiday.` : "Weekend."} No one is expected in; check-ins on this day don&rsquo;t count as late.
        </p>
      )}

      {summary.isError || team.isError ? (
        <div className="flex flex-col gap-3">
          <ErrorAlert>{(summary.error ?? team.error)?.message ?? "Couldn't load the team's attendance."}</ErrorAlert>
          <Button variant="secondary" className="self-start" onClick={() => (summary.refetch(), team.refetch())}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Counts">
            {summary.isLoading
              ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-22" />)
              : cards.map(({ label, value, note, category }) => (
                  <div key={label} className="flex flex-col gap-1 rounded-[18px] surface-card px-4 py-3.5">
                    <dt className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
                      <StatusDot category={category} />
                      {label}
                    </dt>
                    <dd className="m-0 text-[26px] leading-tight font-extrabold tabular-nums">
                      {value}
                      <span className="text-sm font-semibold text-ink-muted"> / {s.team_size}</span>
                    </dd>
                    {note && <p className="m-0 text-xs text-ink-muted">{note}</p>}
                  </div>
                ))}
          </dl>

          <section aria-labelledby="team-heading" className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="team-heading" className="m-0 text-base font-bold">
                Team
              </h2>
              <Segmented legend="Show" name="team-filter" value={filter} onChange={setFilter} options={FILTERS} className="w-full sm:w-auto sm:min-w-[420px] [&_legend]:sr-only" />
            </div>
            {team.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              (() => {
                const shown = members.filter((m) => matches(filter, m));
                return shown.length === 0 ? (
                  <p className="m-0 rounded-2xl surface-card py-8 text-center text-sm text-ink-muted">Nobody here.</p>
                ) : (
                  <ul className={clsx("m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3")}>
                    {shown.map((member) => (
                      <TeamMemberCard key={member.employee_id} member={member} now={now} isToday={isToday} />
                    ))}
                  </ul>
                );
              })()
            )}
          </section>
        </>
      )}
    </div>
  );
}
