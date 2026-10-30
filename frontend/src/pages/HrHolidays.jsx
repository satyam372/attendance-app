import clsx from "clsx";
import { CircleCheck, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { DateField } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { TextField } from "../components/ui/TextField.jsx";
import { useCreateHoliday, useSetHolidayActive } from "../hooks/useEmployees.js";
import { useHolidays } from "../hooks/useRequests.js";
import { isWeekend, shortWeekday, toDateKey } from "../lib/domain/time.js";

function HolidayRow({ holiday, past, confirming, removing, onAskRemove, onConfirmRemove, onCancelRemove }) {
  const [y, m, d] = holiday.holiday_date.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
  const cancelRef = useRef(null);

  // Move focus into the confirm step so keyboard users land on it (Cancel is the safe default)
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-line/70 py-3 last:border-b-0">
      <span className={clsx("flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5", past ? "bg-field text-ink-muted" : "bg-accent-soft text-accent-ink")}>
        <span className="text-lg leading-none font-extrabold tabular-nums">{d}</span>
        <span className="text-[11px] font-semibold">{month}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block truncate text-sm font-semibold", past && "text-ink-soft")}>{holiday.name}</span>
        <span className="block text-xs text-ink-muted">
          {shortWeekday(holiday.holiday_date)} {y}
          {isWeekend(holiday.holiday_date) ? " · falls on a weekend" : ""}
        </span>
      </span>
      {holiday.is_optional && <span className="shrink-0 rounded-full bg-leave-soft px-2.5 py-1 text-xs font-bold text-leave-ink">Optional</span>}
      {onAskRemove && !confirming && (
        <Button variant="ghost" size="icon" aria-label={`Remove ${holiday.name}`} onClick={() => onAskRemove(holiday)} className="-mr-2 shrink-0">
          <Trash2 className="size-4.5" aria-hidden="true" />
        </Button>
      )}
      {confirming && (
        <div role="group" aria-label={`Remove ${holiday.name}?`} className="motion-safe:animate-pop-in flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl surface-inset px-3.5 py-2.5">
          <p className="m-0 min-w-0 flex-1 basis-48 text-sm text-ink-soft">
            Remove <strong className="text-ink">{holiday.name}</strong>?{" "}
            {holiday.is_optional ? "Employees can no longer request it." : "It becomes a working day again."}
          </p>
          <div className="flex gap-2">
            <Button ref={cancelRef} variant="ghost" onClick={onCancelRemove} disabled={removing}>
              Cancel
            </Button>
            <Button variant="danger" loading={removing} onClick={() => onConfirmRemove(holiday)}>
              {removing ? "Removing" : "Remove"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * HR company holidays: upcoming and past (GET /api/holidays), adding one (POST /api/holidays) and
 * removing an upcoming one with Undo (PATCH /api/holidays/{id}). Past holidays stay read-only:
 * removing one would turn those days into absences after the fact.
 */
export default function HrHolidays() {
  const holidays = useHolidays();
  const createHoliday = useCreateHoliday();
  const todayKey = toDateKey();
  const [form, setForm] = useState({ name: "", holiday_date: "", is_optional: false });
  const [errors, setErrors] = useState({});
  const [added, setAdded] = useState(null);
  const setActive = useSetHolidayActive();
  const [confirmingId, setConfirmingId] = useState(null);
  const [removed, setRemoved] = useState(null); // last removed holiday, for Undo
  const undoRef = useRef(null);

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

  function askRemove(holiday) {
    setActive.reset();
    setRemoved(null);
    setConfirmingId(holiday.id);
  }

  function confirmRemove(holiday) {
    setActive.mutate(
      { id: holiday.id, isActive: false },
      {
        onSuccess: () => {
          setConfirmingId(null);
          setRemoved(holiday);
        },
      },
    );
  }

  function undoRemove() {
    setActive.mutate({ id: removed.id, isActive: true }, { onSuccess: () => setRemoved(null) });
  }

  // The removed row disappears, so focus goes to Undo instead of being lost
  useEffect(() => {
    if (removed) undoRef.current?.focus();
  }, [removed]);

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
          setRemoved(null); // adding on a removed date restores it, so Undo no longer applies
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
              <section aria-labelledby="upcoming-heading" className="rounded-3xl surface-card px-5 pt-4 pb-1.5">
                <h2 id="upcoming-heading" className="m-0 mb-1 text-base font-bold">
                  Upcoming ({upcoming.length})
                </h2>
                <ErrorAlert className="my-2">{setActive.error?.message}</ErrorAlert>
                {removed && (
                  <div role="status" className="motion-safe:animate-pop-in my-2 flex flex-wrap items-center justify-between gap-2 rounded-xl surface-inset py-1.5 pr-1.5 pl-3.5 text-sm">
                    <span className="min-w-0">
                      Removed <strong>{removed.name}</strong>.
                    </span>
                    <Button ref={undoRef} variant="secondary" loading={setActive.isPending} onClick={undoRemove}>
                      Undo
                    </Button>
                  </div>
                )}
                {upcoming.length === 0 ? (
                  <p className="m-0 py-6 text-sm text-ink-muted">No upcoming holidays. Add the next one.</p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {upcoming.map((h) => (
                      <HolidayRow
                        key={h.id}
                        holiday={h}
                        confirming={confirmingId === h.id}
                        removing={confirmingId === h.id && setActive.isPending}
                        onAskRemove={askRemove}
                        onConfirmRemove={confirmRemove}
                        onCancelRemove={() => setConfirmingId(null)}
                      />
                    ))}
                  </ul>
                )}
              </section>
              {past.length > 0 && (
                <section aria-labelledby="past-heading" className="rounded-3xl surface-card px-5 pt-4 pb-1.5">
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

        <section aria-labelledby="add-holiday-heading" className="flex flex-col gap-4 rounded-3xl surface-card p-5">
          <h2 id="add-holiday-heading" className="m-0 text-base font-bold">
            Add holiday
          </h2>
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField label="Holiday name" placeholder="e.g. Diwali (Lakshmi Puja)" value={form.name} onChange={(e) => update({ name: e.target.value })} error={errors.name} />
            <DateField label="Date" value={form.holiday_date} onChange={(e) => update({ holiday_date: e.target.value })} error={errors.date} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl surface-inset px-3.5 py-3 text-sm">
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
              <p role="status" className="motion-safe:animate-pop-in m-0 flex items-center gap-2 text-sm font-semibold text-success">
                <CircleCheck className="size-4.5" aria-hidden="true" />
                Added {added.name}.
              </p>
            )}
            <Button type="submit" size="lg" loading={createHoliday.isPending}>
              {createHoliday.isPending ? "Adding" : "Add holiday"}
            </Button>
          </form>
          <p className="m-0 text-xs text-ink-muted">To change a holiday, remove it and add it again. Adding one on a removed date restores it.</p>
        </section>
      </div>
    </div>
  );
}
