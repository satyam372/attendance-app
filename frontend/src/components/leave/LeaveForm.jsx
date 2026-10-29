import { CircleCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useToday } from "../../hooks/useAttendance.js";
import { useCreateRequest, useHolidays } from "../../hooks/useRequests.js";
import { LeaveCategory, LeaveHalf } from "../../lib/domain/enums.js";
import {
  buildRequest,
  CATEGORY_LABELS,
  Duration,
  HALF_LABELS,
  REQUEST_TYPE_LABELS,
  requestDays,
  RequestKind,
  validateRequest,
} from "../../lib/domain/requests.js";
import { isWorkingDay } from "../../lib/domain/rules.js";
import { addDays, toDateKey } from "../../lib/domain/time.js";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Button } from "../ui/Button.jsx";
import { DateField, Segmented, SelectField, TextAreaField } from "../ui/Fields.jsx";

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const dayWord = (n) => `${fmtDays(n)} ${n === 1 ? "day" : "days"}`;

function shortDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function nextWorkingDay(from, closed) {
  let day = addDays(from, 1);
  while (!isWorkingDay(day, closed)) day = addDays(day, 1);
  return day;
}

/** Apply for leave or WFH (Leave / Desktop Leave artboards) → POST /api/requests. */
export function LeaveForm() {
  const holidays = useHolidays();
  const today = useToday();
  const createRequest = useCreateRequest();
  const todayKey = today.data?.work_date ?? toDateKey();

  const closed = useMemo(
    () => new Set((holidays.data ?? []).filter((h) => !h.is_optional).map((h) => h.holiday_date)),
    [holidays.data],
  );
  const optionalHolidays = (holidays.data ?? []).filter((h) => h.is_optional && h.holiday_date >= todayKey);
  const defaultDay = nextWorkingDay(todayKey, closed);

  const [form, setForm] = useState(() => ({
    kind: RequestKind.LEAVE,
    duration: Duration.FULL,
    category: LeaveCategory.CASUAL,
    fromDate: "",
    toDate: "",
    leaveHalf: LeaveHalf.FIRST_HALF,
    holidayId: null,
    reason: "",
  }));
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(null);

  // Dates default to the next working day until the user picks one
  const values = { ...form, fromDate: form.fromDate || defaultDay, toDate: form.toDate || form.fromDate || defaultDay };
  const body = buildRequest(values, holidays.data ?? []);
  const isOptionalHoliday = form.kind === RequestKind.LEAVE && form.category === LeaveCategory.OPTIONAL_HOLIDAY;
  const singleDay = isOptionalHoliday || form.duration !== Duration.FULL;
  const days = requestDays(body, closed);

  const update = (changes) => {
    setForm((current) => ({ ...current, ...changes }));
    setErrors({});
    createRequest.reset();
  };

  function handleSubmit(event) {
    event.preventDefault();
    const found = validateRequest(body, { closedHolidays: closed });
    setErrors(found);
    if (Object.keys(found).length) return;
    createRequest.mutate(body, { onSuccess: (request) => setSent({ request, days }) });
  }

  if (sent) {
    const { request } = sent;
    const what = request.leave_category ? CATEGORY_LABELS[request.leave_category] : REQUEST_TYPE_LABELS[request.request_type];
    const dates = request.from_date === request.to_date ? shortDate(request.from_date) : `${shortDate(request.from_date)} – ${shortDate(request.to_date)}`;
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheck className="size-12 text-success" strokeWidth={1.6} aria-hidden="true" />
        <h3 className="m-0 text-lg font-bold">Request sent</h3>
        <p className="m-0 max-w-sm text-sm text-ink-soft">
          {what} · {dates} · {dayWord(sent.days)}. It&rsquo;s waiting for {sent.request.approver_name ?? "approval"}
          {sent.request.approver_name && sent.request.approver_name !== "HR" ? " (your manager)" : ""}.
        </p>
        <p className="m-0 max-w-sm text-xs text-ink-muted">
          Until approved, the days show as &ldquo;Awaiting approval&rdquo; on your{" "}
          <Link to="/attendance" className="font-semibold text-accent-ink">
            attendance calendar
          </Link>
          .
        </p>
        <Button variant="secondary" onClick={() => setSent(null)} className="mt-2">
          Raise another request
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4.5">
      <Segmented
        legend="What do you need?"
        name="request-kind"
        value={form.kind}
        onChange={(kind) => update({ kind, duration: Duration.FULL })}
        options={[
          { value: RequestKind.LEAVE, label: "Leave" },
          { value: RequestKind.WFH, label: "Work from home" },
        ]}
      />

      {form.kind === RequestKind.LEAVE && (
        <SelectField label="Leave type" value={form.category} onChange={(e) => update({ category: e.target.value, holidayId: null })} error={errors.category}>
          {[LeaveCategory.CASUAL, LeaveCategory.SICK, LeaveCategory.EARNED].map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
          {optionalHolidays.length > 0 && <option value={LeaveCategory.OPTIONAL_HOLIDAY}>{CATEGORY_LABELS[LeaveCategory.OPTIONAL_HOLIDAY]}</option>}
        </SelectField>
      )}

      {!isOptionalHoliday && (
        <Segmented
          legend="How long?"
          name="request-duration"
          value={form.duration}
          onChange={(duration) => update({ duration })}
          options={
            form.kind === RequestKind.LEAVE
              ? [
                  { value: Duration.FULL, label: "Full day(s)" },
                  { value: Duration.HALF, label: "Half day" },
                  { value: Duration.HALF_WFH, label: "Half leave + half WFH" },
                ]
              : [
                  { value: Duration.FULL, label: "Full day(s)" },
                  { value: Duration.HALF, label: "Half day" },
                ]
          }
        />
      )}

      {isOptionalHoliday ? (
        <SelectField
          label="Optional holiday"
          value={form.holidayId ?? ""}
          onChange={(e) => update({ holidayId: e.target.value || null })}
          error={errors.holiday}
        >
          <option value="">Choose a holiday</option>
          {optionalHolidays.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} · {shortDate(h.holiday_date)}
            </option>
          ))}
        </SelectField>
      ) : singleDay ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateField label="Date" min={todayKey} value={values.fromDate} onChange={(e) => update({ fromDate: e.target.value, toDate: "" })} error={errors.from} />
          {form.kind === RequestKind.LEAVE && (
            <SelectField label="Leave for" value={form.leaveHalf} onChange={(e) => update({ leaveHalf: e.target.value })} error={errors.half}>
              {Object.entries(HALF_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <DateField label="From" min={todayKey} value={values.fromDate} onChange={(e) => update({ fromDate: e.target.value })} error={errors.from} />
          <DateField label="To" min={values.fromDate} value={values.toDate} onChange={(e) => update({ toDate: e.target.value })} error={errors.to} />
        </div>
      )}

      <p className="m-0 rounded-xl bg-field px-3.5 py-2.5 text-[13px] text-ink-soft" aria-live="polite">
        {isOptionalHoliday
          ? "One day off on the holiday you choose."
          : days > 0
            ? `${dayWord(days)}${singleDay ? "" : " · weekends and holidays are skipped"}.`
            : "No working days in these dates."}
        {form.kind === RequestKind.WFH && today.data && ` ${fmtDays(today.data.wfh_used)} of ${today.data.wfh_free} free WFH days used this month.`}
        {form.kind === RequestKind.LEAVE && " Apply at least 1 day in advance."}
      </p>

      <TextAreaField
        label="Reason (optional)"
        placeholder="Add a short note for HR"
        maxLength={500}
        value={form.reason}
        onChange={(e) => update({ reason: e.target.value })}
        error={errors.reason}
      />

      <ErrorAlert>{createRequest.error?.message}</ErrorAlert>

      <Button type="submit" size="lg" loading={createRequest.isPending} className="w-full">
        {createRequest.isPending ? "Sending" : "Submit request"}
      </Button>
    </form>
  );
}
