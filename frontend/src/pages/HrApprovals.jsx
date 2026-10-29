import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { DecidedRequestRow, PendingRequestCard } from "../components/hr/RequestCard.jsx";
import { HrTabs } from "../components/hr/HrTabs.jsx";
import { ErrorAlert } from "../components/ui/Alert.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Segmented } from "../components/ui/Fields.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { useEmployees } from "../hooks/useEmployees.js";
import { useHolidays, useRequestList } from "../hooks/useRequests.js";
import { splitForHr } from "../lib/domain/approvals.js";
import { Role } from "../lib/domain/enums.js";

const EMPTY = {
  forYou: "Nothing is waiting for you. Requests from managers, HR staff and employees without a manager show up here.",
  withManagers: "No requests are waiting for a manager.",
  waiting: "Nothing is waiting. Leave and WFH requests from your team show up here.",
};

/**
 * Leave and WFH approvals. Managers (/approvals) decide their direct reports' requests.
 * HR (/hr/approvals) decides managers' and HR's requests, sees every other request with its
 * manager, and can step in as an override. The backend enforces who may decide.
 */
export default function HrApprovals() {
  const { user } = useAuth();
  const isHr = user.role === Role.HR;
  const [tab, setTab] = useState(isHr ? "forYou" : "waiting");
  const pending = useRequestList(["PENDING"]);
  const decided = useRequestList(["APPROVED", "REJECTED"], { enabled: tab === "decided" });
  const employees = useEmployees({ enabled: isHr });
  const holidays = useHolidays();
  const closed = useMemo(() => new Set((holidays.data ?? []).filter((h) => !h.is_optional).map((h) => h.holiday_date)), [holidays.data]);

  useEffect(() => {
    document.title = `${isHr ? "Requests" : "Approvals"} · SpeedIn`;
  }, [isHr]);

  const byId = new Map((employees.data ?? []).map((e) => [e.id, e]));
  const groups = isHr
    ? splitForHr(pending.data ?? [], user, byId)
    : { waiting: (pending.data ?? []).map((request) => ({ request, mode: "decide" })) };
  const count = (key) => (pending.data && (!isHr || employees.data) ? ` (${groups[key].length})` : "");
  const options = isHr
    ? [
        { value: "forYou", label: `For you${count("forYou")}` },
        { value: "withManagers", label: `With managers${count("withManagers")}` },
        { value: "decided", label: "Decided" },
      ]
    : [
        { value: "waiting", label: `Waiting${count("waiting")}` },
        { value: "decided", label: "Decided" },
      ];
  const list = tab === "decided" ? decided : pending;
  const loading = list.isLoading || (isHr && tab !== "decided" && employees.isLoading);
  const error = list.error ?? (isHr ? employees.error : null);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {isHr && <HrTabs />}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">{isHr ? "Requests" : "Team requests"}</h1>
          <p className="m-0 mt-1 max-w-xl text-sm text-ink-muted">
            {isHr
              ? "Managers approve their team's leave and WFH. You approve requests from managers, HR staff and anyone without a manager, and can step in when a manager can't."
              : "Leave and work from home requests from people who report to you. Approving updates their attendance."}
          </p>
        </div>
        <Segmented legend="Show" name="approval-tab" value={tab} onChange={setTab} options={options} className={isHr ? "w-full sm:w-[420px] [&_legend]:sr-only" : "w-full sm:w-72 [&_legend]:sr-only"} />
      </header>

      {error ? (
        <div className="flex flex-col gap-3">
          <ErrorAlert>{error.message ?? "Couldn't load requests."}</ErrorAlert>
          <Button variant="secondary" className="self-start" onClick={() => (list.refetch(), isHr && employees.refetch())}>
            Try again
          </Button>
        </div>
      ) : loading ? (
        <Skeleton className="h-56 w-full" />
      ) : tab !== "decided" ? (
        groups[tab].length === 0 ? (
          <p className="m-0 rounded-3xl surface-card py-10 text-center text-sm text-ink-muted">{EMPTY[tab]}</p>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 2xl:grid-cols-3">
            {groups[tab].map(({ request, mode, approver }) => (
              <PendingRequestCard key={request.id} request={request} closedHolidays={closed} mode={mode} approverName={approver} />
            ))}
          </ul>
        )
      ) : decided.data.length === 0 ? (
        <p className="m-0 rounded-3xl surface-card py-10 text-center text-sm text-ink-muted">Nothing decided yet.</p>
      ) : (
        <section aria-label="Decided requests" className="rounded-3xl surface-card px-5 py-1.5">
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
