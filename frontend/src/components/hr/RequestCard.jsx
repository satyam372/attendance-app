import { CalendarDays, Check, Hourglass, X } from "lucide-react";
import { useState } from "react";

import { useDecideRequest } from "../../hooks/useRequests.js";
import { CATEGORY_LABELS, HALF_LABELS, REQUEST_TYPE_LABELS, requestDays } from "../../lib/domain/requests.js";
import { formatTime, minutesBetween, toDateKey } from "../../lib/domain/time.js";
import { Category } from "../../lib/domain/dayStatus.js";
import { StatusChip } from "../attendance/StatusChip.jsx";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function shortDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

const LEAVE_SUFFIX = { HALF_DAY_LEAVE: " · half day", HALF_LEAVE_HALF_WFH: " · half day + half WFH" };

/** "Casual leave", "Sick leave · half day", "Full day WFH". */
export function requestTitle(request) {
  if (request.leave_category) return `${CATEGORY_LABELS[request.leave_category]}${LEAVE_SUFFIX[request.request_type] ?? ""}`;
  return REQUEST_TYPE_LABELS[request.request_type];
}

export function requestDates(request) {
  return request.from_date === request.to_date ? shortDate(request.from_date) : `${shortDate(request.from_date)} – ${shortDate(request.to_date)}`;
}

/** "Applied 3 h ago", "Applied yesterday", "Applied 4 days ago", "Applied on 12 Oct" (calendar days in Pune). */
function appliedText(createdAt) {
  const appliedDay = toDateKey(createdAt);
  const days = Math.round((Date.parse(`${toDateKey()}T00:00:00Z`) - Date.parse(`${appliedDay}T00:00:00Z`)) / 86_400_000);
  if (days === 0) {
    const minutes = minutesBetween(createdAt, new Date());
    return minutes < 60 ? "Applied just now" : `Applied ${Math.floor(minutes / 60)} h ago`;
  }
  if (days === 1) return "Applied yesterday";
  if (days < 7) return `Applied ${days} days ago`;
  const [y, m, d] = toDateKey(createdAt).split("-").map(Number);
  return `Applied on ${new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
}

/**
 * A pending request. `mode`:
 * - "decide": you are the approver (the manager, or HR for managers' and HR's requests): Approve / Reject
 * - "override": HR viewing an employee's request that their manager (`approverName`) decides; HR can
 *   still step in after a second click, and the decision is recorded as HR's
 * - "own": your own request, which someone else decides; no buttons
 */
export function PendingRequestCard({ request, closedHolidays, mode = "decide", approverName }) {
  const decide = useDecideRequest();
  const [overriding, setOverriding] = useState(false);
  const days = requestDays(request, closedHolidays);
  const appliedLate = toDateKey(request.created_at) >= request.from_date; // "apply 1 day in advance" (not enforced)
  const choice = decide.variables?.status;

  return (
    <li className="flex flex-col gap-3.5 rounded-[20px] surface-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={request.employee_name} className="size-10 text-[13px]" />
        <div className="min-w-0 flex-1">
          <p className="m-0 font-bold">{request.employee_name}</p>
          <p className="m-0 text-sm text-ink-soft">
            {requestTitle(request)}
            {request.leave_half ? ` · ${HALF_LABELS[request.leave_half].toLowerCase()}` : ""}
          </p>
        </div>
        <StatusChip category={request.leave_category ? Category.LEAVE : Category.TODAY} className="shrink-0">
          {request.leave_category ? "Leave" : "WFH"}
        </StatusChip>
      </div>

      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
        <CalendarDays className="size-4 text-ink-muted" aria-hidden="true" />
        <span className="font-semibold text-ink">{requestDates(request)}</span>
        <span>· {fmtDays(days)} {days === 1 ? "working day" : "working days"}</span>
      </p>
      {request.reason && <p className="m-0 rounded-xl surface-inset px-3.5 py-2.5 text-sm text-ink-soft">&ldquo;{request.reason}&rdquo;</p>}
      <p className="m-0 text-xs text-ink-muted">
        {appliedText(request.created_at)}
        {appliedLate && " · less than a day in advance"}
      </p>

      <ErrorAlert>{decide.error?.message}</ErrorAlert>
      {mode === "own" && <p className="m-0 rounded-xl surface-inset px-3.5 py-2.5 text-sm text-ink-soft">Your own request: another HR person decides it.</p>}
      {mode === "override" && (
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <Hourglass className="size-4 text-pending" aria-hidden="true" />
          Waiting for {approverName}
        </p>
      )}
      {mode === "override" && !overriding && (
        <Button variant="ghost" onClick={() => setOverriding(true)} className="self-start">
          Decide as HR…
        </Button>
      )}
      {mode === "override" && overriding && (
        <p className="m-0 rounded-xl surface-inset px-3.5 py-2.5 text-sm text-ink-soft">
          Normally {approverName} decides. Your decision is recorded as an HR override.
        </p>
      )}

      {(mode === "decide" || overriding) && (
        <div className="flex gap-2.5">
          <Button
            variant="danger"
            className="flex-1"
            loading={decide.isPending && choice === "REJECTED"}
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: request.id, status: "REJECTED" })}
            aria-label={`Reject ${request.employee_name}'s request for ${requestDates(request)}`}
          >
            {!(decide.isPending && choice === "REJECTED") && <X className="size-4" aria-hidden="true" />}
            Reject
          </Button>
          <Button
            className="flex-1"
            loading={decide.isPending && choice === "APPROVED"}
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: request.id, status: "APPROVED" })}
            aria-label={`Approve ${request.employee_name}'s request for ${requestDates(request)}`}
          >
            {!(decide.isPending && choice === "APPROVED") && <Check className="size-4" aria-hidden="true" />}
            Approve
          </Button>
        </div>
      )}
    </li>
  );
}

/** One decided request (HR Approvals, "Decided" tab). */
export function DecidedRequestRow({ request }) {
  const approved = request.status === "APPROVED";
  return (
    <li className="flex items-center gap-3 border-b border-line/70 py-3.5 last:border-b-0">
      <Avatar name={request.employee_name} className="size-9 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold">
          {request.employee_name} <span className="font-normal text-ink-muted">· {requestTitle(request)}</span>
        </p>
        <p className="m-0 truncate text-xs text-ink-muted">
          {requestDates(request)}
          {request.decided_at ? ` · decided ${shortDate(toDateKey(request.decided_at))}, ${formatTime(request.decided_at)}` : ""}
          {request.decided_by_name ? ` by ${request.decided_by_name}` : ""}
        </p>
      </div>
      <StatusChip category={approved ? Category.PRESENT : Category.ABSENT} className="shrink-0">
        {approved ? "Approved" : "Rejected"}
      </StatusChip>
    </li>
  );
}
