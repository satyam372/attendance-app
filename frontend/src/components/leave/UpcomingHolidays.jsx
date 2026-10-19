import { useHolidays } from "../../hooks/useRequests.js";
import { shortWeekday, toDateKey } from "../../lib/domain/time.js";
import { Skeleton } from "../ui/Skeleton.jsx";

/** The next company holidays from GET /api/holidays. Optional ones are marked. */
export function UpcomingHolidays({ limit = 5 }) {
  const { data, isLoading, isError } = useHolidays();
  const todayKey = toDateKey();
  const upcoming = (data ?? []).filter((h) => h.holiday_date >= todayKey).slice(0, limit);

  return (
    <section aria-labelledby="holidays-heading" className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-5">
      <h2 id="holidays-heading" className="m-0 text-base font-bold">
        Upcoming holidays
      </h2>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <p className="m-0 text-sm text-ink-muted">Couldn&rsquo;t load holidays.</p>
      ) : upcoming.length === 0 ? (
        <p className="m-0 text-sm text-ink-muted">No more holidays this year.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {upcoming.map((holiday) => {
            const [y, m, d] = holiday.holiday_date.split("-").map(Number);
            const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
            return (
              <li key={holiday.id} className="flex items-center gap-3.5 border-b border-line/70 py-3 last:border-b-0">
                <span className="flex w-11 shrink-0 flex-col items-center rounded-xl bg-accent-soft py-1.5 text-accent-ink">
                  <span className="text-lg leading-none font-extrabold tabular-nums">{d}</span>
                  <span className="text-[11px] font-semibold">{month}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{holiday.name}</span>
                  <span className="block text-xs text-ink-muted">{shortWeekday(holiday.holiday_date)}{holiday.is_optional ? " · optional (request it as leave)" : ""}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
