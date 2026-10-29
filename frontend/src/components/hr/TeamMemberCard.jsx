import { describeDay } from "../../lib/domain/dayStatus.js";
import { formatDuration, formatTime, minutesBetween } from "../../lib/domain/time.js";
import { HALF_LABELS } from "../../lib/domain/requests.js";
import { StatusChip } from "../attendance/StatusChip.jsx";
import { Avatar } from "../ui/Avatar.jsx";

const MODE = { OFFICE: "Office", WFH: "From home", HYBRID: "Half from home" };

/** One person in "Team today": status (Late included), times and work mode (TeamMemberDay). */
export function TeamMemberCard({ member, now, isToday }) {
  const { category, label } = describeDay(member);

  let times = null;
  if (member.in_time) {
    const out = member.out_time ? formatTime(member.out_time) : isToday ? "still in" : "no check-out";
    const worked = member.out_time ? minutesBetween(member.in_time, member.out_time) : isToday ? minutesBetween(member.in_time, now) : null;
    times = `In ${formatTime(member.in_time)} · Out ${out}${worked != null ? ` · ${formatDuration(worked)}` : ""}`;
  }
  const detail = [
    member.leave_half && `${HALF_LABELS[member.leave_half]} leave`,
    member.in_time && MODE[member.work_mode],
    !member.in_time && member.work_mode === "WFH" && "WFH approved",
  ].filter(Boolean);

  return (
    <li className="flex items-center gap-3 rounded-[18px] surface-tile p-3.5">
      <Avatar name={member.name} className="size-10 text-[13px]" />
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-bold">{member.name}</p>
        <p className="m-0 truncate text-xs text-ink-muted tabular-nums">{times ?? (detail.length ? detail.join(" · ") : "No check-in")}</p>
        {times && detail.length > 0 && <p className="m-0 truncate text-xs text-ink-muted">{detail.join(" · ")}</p>}
      </div>
      {/* describeDay already labels late check-ins "Late" */}
      <StatusChip category={category} className="shrink-0">
        {label === "Not checked in yet" ? "Not in yet" : label}
      </StatusChip>
    </li>
  );
}
