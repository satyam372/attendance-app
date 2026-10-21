import clsx from "clsx";
import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { DateField } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { useCreateHoliday } from "../hooks/useEmployees.js";
import { useHolidays } from "../hooks/useRequests.js";
import { isWeekend, shortWeekday, toDateKey } from "../lib/domain/time.js";

function HolidayRow({ holiday, past }) {
  const [y, m, d] = holiday.holiday_date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
  return (
    <li className={clsx("flex items-center gap-3.5 border-b border-line/70 py-3 last:border-b-0", past && "opacity-55")}>
      <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-accent-soft py-1.5 text-accent-ink">
        <span className="text-lg leading-none font-extrabold tabular-nums">{d}</span>
        <span className="text-[11px] font-semibold">{month}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{holiday.name}</span>
        <span className="block text-xs text-ink-muted">
          {shortWeekday(holiday.holiday_date)} {y}
          {isWeekend(holiday.holiday_date) ? " · falls on a weekend" : ""}
        </span>
      </span>
      {holiday.is_optional && <span className="shrink-0 rounded-full bg-leave-soft px-2.5 py-1 text-xs font-bold text-leave-ink">Optional</span>}
    </li>
  );
}

/** HR company holidays: upcoming and past (GET /api/holidays) and adding one (POST /api/holidays). */
export default function HrHolidays() {
  const holidays = useHolidays();
  const createHoliday = useCreateHoliday();
  const todayKey = toDateKey();
  const [form, setForm] = useState({ name: "", holiday_date: "", is_optional: false });
  const [errors, setErrors] = useState({});
  const [added, setAdded] = useState(null);

  useEffect(() => {
    document.title = "Holidays · SpeedIn";
  }, []);

  const all = holidays.data ?? [];
  const upcoming = all.filter((h) => h.holiday_date >= todayKey);
  const past = all.filter((h) => h.holiday_date < todayKey).reverse();

  const update = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setErrors({});
    setAdded(null);
    createHoliday.reset();
  };

  function handleSubmit(event) {
    event.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = "Give the holiday a name.";
    if (!form.holiday_date) found.date = "Pick a date.";
    setErrors(found);
    if (Object.keys(found).length) return;
    createHoliday.mutate(
      { name: form.name.trim(), holiday_date: form.holiday_date, is_optional: form.is_optional },
      {
        onSuccess: (holiday) => {
          setAdded(holiday);
          setForm({ name: "", holiday_date: "", is_optional: false });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HrTabs />
      <header>
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">Holidays</h1>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          Company holidays are skipped in leave requests and never count as absent or late. Optional holidays are taken as leave.
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_minmax(320px,380px)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {holidays.isError ? (
            <ErrorAlert>{holidays.error?.message ?? "Couldn't load holidays."}</ErrorAlert>
          ) : holidays.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <section aria-labelledby="upcoming-heading" className="rounded-3xl border border-line bg-surface px-5 pt-4 pb-1.5">
                <h2 id="upcoming-heading" className="m-0 mb-1 text-base font-bold">
                  Upcoming ({upcoming.length})
                </h2>
                {upcoming.length === 0 ? (
                  <p className="m-0 py-6 text-sm text-ink-muted">No upcoming holidays. Add the next one.</p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {upcoming.map((h) => (
                      <HolidayRow key={h.id} holiday={h} />
                    ))}
                  </ul>
                )}
              </section>
              {past.length > 0 && (
                <section aria-labelledby="past-heading" className="rounded-3xl border border-line bg-surface px-5 pt-4 pb-1.5">
                  <h2 id="past-heading" className="m-0 mb-1 text-base font-bold">
                    Already passed ({past.length})
                  </h2>
                  <ul className="m-0 list-none p-0">
                    {past.map((h) => (
                      <HolidayRow key={h.id} holiday={h} past />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <section aria-labelledby="add-holiday-heading" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
          <h2 id="add-holiday-heading" className="m-0 text-base font-bold">
            Add holiday
          </h2>
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField label="Holiday name" placeholder="e.g. Diwali (Lakshmi Puja)" value={form.name} onChange={(e) => update({ name: e.target.value })} error={errors.name} />
            <DateField label="Date" value={form.holiday_date} onChange={(e) => update({ holiday_date: e.target.value })} error={errors.date} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-field px-3.5 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_optional}
                onChange={(e) => update({ is_optional: e.target.checked })}
                className="mt-0.5 size-4.5 shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold text-ink">Optional holiday</span>
                <span className="block text-xs text-ink-muted">The office stays open; employees can take the day as leave.</span>
              </span>
            </label>
            <ErrorAlert>{createHoliday.error?.message}</ErrorAlert>
            {added && (
              <p role="status" className="m-0 flex items-center gap-2 text-sm font-semibold text-success">
                <CircleCheck className="size-4.5" aria-hidden="true" />
                Added {added.name}.
              </p>
            )}
            <Button type="submit" size="lg" loading={createHoliday.isPending}>
              {createHoliday.isPending ? "Adding" : "Add holiday"}
            </Button>
          </form>
          <p className="m-0 text-xs text-ink-muted">Removing or editing a holiday isn&rsquo;t available yet.</p>
        </section>
      </div>
    </div>
  );
}
