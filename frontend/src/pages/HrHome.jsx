import { useEffect } from "react";

import { Card } from "../components/ui/Card.jsx";

// Placeholder until the HR screens land (today, attendance sheet, approvals, holidays, team).
export default function HrHome() {
  useEffect(() => {
    document.title = "HR · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">HR workspace</h1>
      <Card>
        <h2 className="m-0 text-lg font-semibold">Team tools are on their way</h2>
        <p className="m-0 mt-2 max-w-prose text-[15px] text-ink-muted">
          Today&rsquo;s attendance, the weekly sheet, approvals, holidays and team management will appear here.
        </p>
      </Card>
    </div>
  );
}
