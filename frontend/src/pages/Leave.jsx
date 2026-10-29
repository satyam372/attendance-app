import { useEffect } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { LeaveForm } from "../components/leave/LeaveForm.jsx";
import { MyRequests } from "../components/leave/MyRequests.jsx";
import { UpcomingHolidays } from "../components/leave/UpcomingHolidays.jsx";
import { Role } from "../lib/domain/enums.js";

/**
 * Leave screen (Leave + Desktop Leave artboards): apply for leave or WFH, my requests with
 * HR's decision, upcoming holidays. Leave balances wait for a backend endpoint.
 */
export default function Leave() {
  const { user } = useAuth();
  useEffect(() => {
    document.title = "Leave · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header>
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.02em] lg:text-[28px]">Leave</h1>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          Apply for leave or work from home. {user.role === Role.EMPLOYEE ? "Your manager approves your requests." : "HR approves your requests."}
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(340px,1fr)_minmax(320px,1fr)] lg:items-start xl:grid-cols-[minmax(380px,1.1fr)_minmax(340px,1fr)]">
        <section aria-labelledby="apply-heading" className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-5 lg:p-6">
          <h2 id="apply-heading" className="m-0 text-base font-bold">
            Apply for leave or WFH
          </h2>
          <LeaveForm />
        </section>

        <div className="flex flex-col gap-5">
          <MyRequests />
          <UpcomingHolidays />
        </div>
      </div>
    </div>
  );
}
