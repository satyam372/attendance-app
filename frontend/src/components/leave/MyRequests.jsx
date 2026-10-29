import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { useHolidays, useMyRequests } from "../../hooks/useRequests.js";
import { Category } from "../../lib/domain/dayStatus.js";
import { HALF_LABELS, requestDays } from "../../lib/domain/requests.js";
import { toDateKey } from "../../lib/domain/time.js";
import { StatusChip } from "../attendance/StatusChip.jsx";
import { requestDates, requestTitle, shortDate } from "../hr/RequestCard.jsx";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Button } from "../ui/Button.jsx";
import { Segmented } from "../ui/Fields.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";

const STATUS = {
  PENDING: { label: "Awaiting approval", category: Category.PENDING },
  APPROVED: { label: "Approved", category: Category.PRESENT },
  REJECTED: { label: "Rejected", category: Category.ABSENT },
};

const FIRST_PAGE = 6;
const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function MyRequestItem({ request, closedHolidays }) {
  const days = requestDays(request, closedHolidays);
  const status = STATUS[request.status];
  return (
    <li className="flex flex-col gap-2 border-b border-line/70 py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 min-w-0 text-sm font-semibold">
          {requestTitle(request)}
          {request.leave_half && <span className="font-normal text-ink-muted"> · {HALF_LABELS[request.leave_half].toLowerCase()}</span>}
        </p>
        <StatusChip category={status.category} className="shrink-0">
          {status.label}
        </StatusChip>
      </div>
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-soft">
        <CalendarDays className="size-4 text-ink-muted" aria-hidden="true" />
        <span className="font-medium text-ink">{requestDates(request)}</span>
        <span>
          · {fmtDays(days)} {days === 1 ? "day" : "days"}
        </span>
      </p>
      {request.reason && <p className="m-0 text-sm text-ink-muted">&ldquo;{request.reason}&rdquo;</p>}
      <p className="m-0 text-xs text-ink-muted">
        Applied {shortDate(toDateKey(request.created_at))}
        {request.status === "PENDING" && request.approver_name && ` · waiting for ${request.approver_name}`}
        {request.decided_at && ` · ${request.status === "APPROVED" ? "approved" : "rejected"} ${shortDate(toDateKey(request.decided_at))}`}
        {request.decided_by_name && ` by ${request.decided_by_name}`}
      </p>
    </li>
  );
}

/** The employee's own leave and WFH requests (GET /api/requests/me), filterable by status. */
export function MyRequests() {
  const requests = useMyRequests();
  const holidays = useHolidays();
  const [filter, setFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);

  const all = requests.data ?? [];
  const count = (status) => all.filter((r) => r.status === status).length;
  const options = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: `Pending (${count("PENDING")})` },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];
  const shown = filter === "ALL" ? all : all.filter((r) => r.status === filter);
  const visible = showAll ? shown : shown.slice(0, FIRST_PAGE);
  const closedHolidays = new Set((holidays.data ?? []).filter((h) => !h.is_optional).map((h) => h.holiday_date));

  return (
    <section aria-labelledby="my-requests-heading" className="flex flex-col gap-3 rounded-3xl surface-card p-5">
      <h2 id="my-requests-heading" className="m-0 text-base font-bold">
        My requests
      </h2>
      {requests.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : requests.isError ? (
        <ErrorAlert>{requests.error?.message ?? "Couldn't load your requests."}</ErrorAlert>
      ) : all.length === 0 ? (
        <p className="m-0 text-sm text-ink-muted">You haven&rsquo;t raised any requests yet. Ones you apply for appear here with HR&rsquo;s decision.</p>
      ) : (
        <>
          <Segmented
            legend="Show"
            name="my-requests-filter"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setShowAll(false);
            }}
            options={options}
            className="[&_legend]:sr-only"
          />
          {shown.length === 0 ? (
            <p className="m-0 py-4 text-center text-sm text-ink-muted">Nothing here.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {visible.map((request) => (
                <MyRequestItem key={request.id} request={request} closedHolidays={closedHolidays} />
              ))}
            </ul>
          )}
          {shown.length > visible.length && (
            <Button variant="ghost" onClick={() => setShowAll(true)} className="self-start">
              Show all {shown.length}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
