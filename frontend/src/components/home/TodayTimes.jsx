import clsx from "clsx";
import { Clock3, LogIn, LogOut } from "lucide-react";

import { formatDuration, formatTime, minutesBetween } from "../../lib/domain/time.js";

/** Check-in time, check-out time and time worked (live while checked in). */
export function TodayTimes({ attendance, now, variant = "cards", className }) {
  const inTime = attendance?.in_time;
  const outTime = attendance?.out_time;
  const worked = inTime ? minutesBetween(inTime, outTime ?? now) : 0;

  const items = [
    { label: "Check in", value: inTime ? formatTime(inTime) : "--:--", icon: LogIn, tone: "text-success" },
    { label: "Check out", value: outTime ? formatTime(outTime) : "--:--", icon: LogOut, tone: "text-checkout" },
    { label: "Worked", value: formatDuration(worked), icon: Clock3, tone: "text-accent-ink" },
  ];

  if (variant === "inline") {
    return (
      <dl className={clsx("m-0 w-full grid-cols-3 gap-2 text-center", className)}>
        {items.map(({ label, value }) => (
          <div key={label} className="flex flex-col-reverse gap-0.5">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="m-0 text-base font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={clsx("m-0 grid grid-cols-3 gap-2.5", className)}>
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="flex flex-col gap-1.5 rounded-[18px] surface-tile px-3 py-3.5">
          <Icon className={clsx("size-5", tone)} strokeWidth={2} aria-hidden="true" />
          {/* dt before dd for screen readers; order-* shows the value above the label */}
          <dt className="order-3 text-xs text-ink-muted">{label}</dt>
          <dd className="order-2 m-0 text-base font-extrabold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
