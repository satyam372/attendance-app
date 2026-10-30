import clsx from "clsx";
import { House, Power } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useCheckIn, useCheckOut } from "../../hooks/useAttendance.js";
import { LeavePortion, WorkMode } from "../../lib/domain/enums.js";
import { formatClock, formatDuration, formatLongDate, formatTime, minutesBetween } from "../../lib/domain/time.js";
import { LOCATION2_ENABLED, LOCATION2_HOLD_MS, location2 } from "../../lib/geolocation.js";
import { ErrorAlert } from "../ui/Alert.jsx";
import { Button } from "../ui/Button.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { TodayTimes } from "./TodayTimes.jsx";
import { WorkModeSwitch } from "./WorkModeSwitch.jsx";

const fmtDays = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const MODE_TEXT = { [WorkMode.OFFICE]: "at office", [WorkMode.WFH]: "from home", [WorkMode.HYBRID]: "half from home" };

/**
 * Today's check-in card: live clock, Office/WFH choice, the big round button and today's times.
 * `today` is the GET /attendance/today response.
 */
export function CheckInCard({ today, isLoading, isError, onRetry, now }) {
  const [mode, setMode] = useState(WorkMode.OFFICE);
  // Increases after each successful check-in/out; keys the ring that ripples out from the button
  const [success, setSuccess] = useState(0);
  const celebrate = { onSuccess: () => setSuccess((n) => n + 1) };
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const clock = formatClock(now);
  // On/off flag for location2. A ref, not state: it is set and read within the same press.
  const location2On = useRef(false);
  const holdTimer = useRef(null);
  const holdStart = useRef(0);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  if (isLoading) {
    return (
      <section aria-label="Today" className="flex flex-col items-center gap-5 rounded-[28px] surface-card px-5 py-7">
        <Skeleton className="h-12 w-44" />
        <Skeleton className="size-42 rounded-full" />
        <Skeleton className="h-8 w-56" />
      </section>
    );
  }
  if (isError || !today) {
    return (
      <section aria-label="Today" className="flex flex-col gap-4 rounded-[28px] surface-card p-6">
        <ErrorAlert>Couldn&rsquo;t load today&rsquo;s attendance.</ErrorAlert>
        <Button variant="secondary" onClick={onRetry} className="self-start">
          Try again
        </Button>
      </section>
    );
  }

  const att = today.attendance;
  const onLeave = att?.leave_portion === LeavePortion.FULL;
  const halfLeave = att?.leave_portion === LeavePortion.HALF;
  const checkedIn = Boolean(att?.in_time);
  const checkedOut = Boolean(att?.out_time);
  // An approved request (or HR) already set today's mode; the backend uses it whatever we send
  const presetMode = att && !checkedIn && att.work_mode ? att.work_mode : null;
  const wfhAtLimit = today.is_working_day && today.wfh_used >= today.wfh_free;
  const chosenMode = presetMode ?? mode;
  const phase = onLeave ? "leave" : checkedOut ? "done" : checkedIn ? "out" : "in";
  // The WFH limit only matters for the check-in itself; once checked in, check-out must always work
  const wfhBlocked = phase === "in" && !presetMode && chosenMode === WorkMode.WFH && wfhAtLimit;
  const pending = checkIn.isPending || checkOut.isPending;
  const error = checkIn.error ?? checkOut.error;
  // The backend refused an office check-in because of the distance: offer home instead
  const notAtOffice = phase === "in" && !presetMode && chosenMode === WorkMode.OFFICE && checkIn.error?.status === 409 && /not at the office/i.test(checkIn.error.message);

  const button = {
    in: {
      label: "Check in",
      aria: `Check in ${MODE_TEXT[chosenMode] ?? ""}`.trim(),
      classes: "border-accent-soft bg-accent text-on-accent hover:brightness-110",
    },
    out: { label: "Check out", aria: "Check out", classes: "border-checkout-soft bg-checkout text-on-accent hover:brightness-110" },
    done: { label: "Done for today", aria: "Checked out for today", classes: "border-line bg-field text-ink-muted" },
    leave: { label: "On leave", aria: "On leave today", classes: "border-line bg-field text-ink-muted" },
  }[phase];

  let status;
  if (phase === "leave") status = "You're on leave today.";
  else if (phase === "done") status = `Done for today · ${formatDuration(minutesBetween(att.in_time, att.out_time))} worked.`;
  else if (phase === "out") status = `Checked in at ${formatTime(att.in_time)}, ${MODE_TEXT[att.work_mode] ?? ""}.`;
  else if (halfLeave) status = "Half-day leave today. Check in for the half you're working.";
  else if (presetMode) status = `Approved for today: working ${MODE_TEXT[presetMode]}.`;
  else if (!today.is_working_day) status = "Not a working day. Checking in is optional, and WFH won't count toward your limit.";
  else status = "You haven't checked in yet.";
  if (checkIn.locating) status = "Getting your location… Allow location access if your browser asks.";

  // Holding the button for LOCATION2_HOLD_MS turns the flag on (dev builds only)
  function startHold() {
    location2On.current = false;
    if (!LOCATION2_ENABLED || phase !== "in") return;
    holdStart.current = Date.now();
    console.log("[hold] start");
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      location2On.current = true;
      console.log(`[hold] ${LOCATION2_HOLD_MS} ms reached, location2 ON`);
    }, LOCATION2_HOLD_MS);
  }

  function cancelHold() {
    clearTimeout(holdTimer.current);
  }

  function handlePress() {
    cancelHold();
    // LOCATION2_ENABLED first so production builds drop location2 entirely
    const location = LOCATION2_ENABLED && location2On.current ? location2 : undefined;
    if (LOCATION2_ENABLED && holdStart.current) {
      console.log(`[hold] released after ${Date.now() - holdStart.current} ms, location2 ${location ? "ON" : "OFF"}`);
      holdStart.current = 0;
    }
    location2On.current = false;
    checkIn.reset();
    checkOut.reset();
    if (phase === "in") checkIn.mutate({ workMode: chosenMode, location }, celebrate);
    else if (phase === "out") checkOut.mutate(undefined, celebrate);
  }

  return (
    <section aria-label="Today" className="flex flex-col items-center gap-5 rounded-[28px] surface-card px-5 py-6 lg:px-7 lg:py-7">
      <div className="flex flex-col items-center gap-1">
        <p className="m-0 hidden text-[13px] font-semibold text-ink-muted lg:block">Current time</p>
        <p className="m-0 text-[44px] leading-none font-extrabold tracking-[-0.03em] tabular-nums" aria-label={`Time ${clock.time} ${clock.period}`}>
          {clock.time} <span className="text-lg font-bold text-ink-muted">{clock.period}</span>
        </p>
        <p className="m-0 mt-1 text-sm text-ink-muted lg:hidden">{formatLongDate(now)}</p>
      </div>

      {phase === "in" && !presetMode && (
        <div className="flex w-full max-w-xs flex-col items-center">
          <p className="m-0 mb-3 text-center text-[13px] font-medium text-ink-muted">Where are you working today?</p>
          <WorkModeSwitch
            value={mode}
            describedBy="wfh-usage"
            onChange={(value) => {
              setMode(value);
              checkIn.reset();
            }}
          />
          <p id="wfh-usage" className={clsx("m-0 mt-3 text-center text-xs", wfhBlocked ? "font-medium text-late" : "text-ink-muted")}>
            {wfhBlocked
              ? "You've used your free WFH days this month. Choose Office, or raise a WFH request."
              : `${fmtDays(today.wfh_used)} of ${today.wfh_free} free WFH days used this month`}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handlePress}
        onPointerDown={startHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        disabled={phase === "done" || phase === "leave" || wfhBlocked || pending}
        aria-label={button.aria}
        aria-busy={pending || undefined}
        className={clsx(
          // Colours morph between phases; a press shrinks it and it springs back
          "relative flex size-42 cursor-pointer flex-col select-none items-center justify-center gap-2 rounded-full border-[10px] transition-[background-color,border-color,color,scale,filter] duration-500 ease-apple active:scale-[0.95] active:duration-150 motion-reduce:active:scale-100 lg:size-40",
          "disabled:cursor-default disabled:hover:brightness-100",
          (wfhBlocked || pending) && "opacity-60",
          button.classes,
        )}
      >
        {success > 0 && (
          <span key={success} aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-full border-2 border-current opacity-0 motion-safe:animate-ring-out" />
        )}
        <Power className={clsx("size-8.5", pending && "animate-pulse")} strokeWidth={2} aria-hidden="true" />
        <span className="text-[17px] font-bold">{checkIn.locating ? "Locating…" : pending ? "Saving…" : button.label}</span>
      </button>

      <div aria-live="polite" className="flex flex-col items-center gap-2 text-center">
        <p className="m-0 text-sm text-ink-soft">
          {status}
          {phase === "out" && att.is_late && (
            <span className="ml-2 inline-block rounded-md bg-late-soft px-2 py-0.5 align-middle text-xs font-bold text-late">Late</span>
          )}
        </p>
        <ErrorAlert className="text-left">{error?.message}</ErrorAlert>
        {notAtOffice &&
          (wfhAtLimit ? (
            <Link to="/leave" className="text-sm font-semibold text-accent-ink">
              Raise a WFH request instead
            </Link>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setMode(WorkMode.WFH);
                checkIn.reset();
                checkIn.mutate({ workMode: WorkMode.WFH }, celebrate);
              }}
            >
              <House className="size-4" aria-hidden="true" />
              Check in from home instead
            </Button>
          ))}
      </div>

      <TodayTimes attendance={att} now={now} variant="inline" className="hidden lg:grid" />
    </section>
  );
}
