import { useEffect } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { Card } from "../components/ui/Card.jsx";
import { formatLongDate, minutesInOfficeTz } from "../lib/domain/time.js";

function greeting() {
  const hour = Math.floor(minutesInOfficeTz(new Date()) / 60);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Placeholder until the employee screens land (check-in, requests, history).
export default function EmployeeHome() {
  const { user } = useAuth();
  const firstName = user.name.split(" ")[0];

  useEffect(() => {
    document.title = "Home · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="m-0 text-sm text-ink-muted">{formatLongDate()}</p>
        <h1 className="m-0 mt-1 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
          {greeting()}, {firstName}
        </h1>
      </div>
      <Card>
        <h2 className="m-0 text-lg font-semibold">Your attendance home is on its way</h2>
        <p className="m-0 mt-2 max-w-prose text-[15px] text-ink-muted">
          Check in and out, leave and work from home requests, and your monthly summary will appear here.
        </p>
      </Card>
    </div>
  );
}
