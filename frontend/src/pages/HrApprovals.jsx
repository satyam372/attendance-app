import { useEffect, useMemo, useState } from "react";

import { DecidedRequestRow, PendingRequestCard } from "../components/hr/RequestCard.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Segmented } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useHolidays, useRequestList } from "../hooks/useRequests.js";

/** HR Approvals: pending leave/WFH requests to approve or reject, and recent decisions. */
export default function HrApprovals() {
  const [tab, setTab] = useState("waiting");
  const pending = useRequestList(["PENDING"]);
  const decided = useRequestList(["APPROVED", "REJECTED"], { enabled: tab === "decided" });
  const holidays = useHolidays();
  const closed = useMemo(() => new Set((holidays.data ?? []).filter((h) => !h.is_optional).map((h) => h.holiday_date)), [holidays.data]);
  const list = tab === "waiting" ? pending : decided;

  useEffect(() => {
    document.title = "Approvals · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <HrTabs />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">Approvals</h1>
          <p className="m-0 mt-1 text-sm text-ink-muted">Leave and work from home requests. Approving updates the person&rsquo;s attendance.</p>
        </div>
        <Segmented
          legend="Show"
          name="approval-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: "waiting", label: `Waiting${pending.data ? ` (${pending.data.length})` : ""}` },
            { value: "decided", label: "Decided" },
          ]}
          className="w-full sm:w-72 [&_legend]:sr-only"
        />
      </header>

      {list.isError ? (
        <div className="flex flex-col gap-3">
          <ErrorAlert>{list.error?.message ?? "Couldn't load requests."}</ErrorAlert>
          <Button variant="secondary" className="self-start" onClick={() => list.refetch()}>
            Try again
          </Button>
        </div>
      ) : list.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : tab === "waiting" ? (
        pending.data.length === 0 ? (
          <p className="m-0 rounded-3xl border border-line bg-surface py-10 text-center text-sm text-ink-muted">
            Nothing is waiting. New leave and WFH requests show up here.
          </p>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 2xl:grid-cols-3">
            {pending.data.map((request) => (
              <PendingRequestCard key={request.id} request={request} closedHolidays={closed} />
            ))}
          </ul>
        )
      ) : decided.data.length === 0 ? (
        <p className="m-0 rounded-3xl border border-line bg-surface py-10 text-center text-sm text-ink-muted">Nothing decided yet.</p>
      ) : (
        <section aria-label="Decided requests" className="rounded-3xl border border-line bg-surface px-5 py-1.5">
          <ul className="m-0 list-none p-0">
            {decided.data.map((request) => (
              <DecidedRequestRow key={request.id} request={request} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
