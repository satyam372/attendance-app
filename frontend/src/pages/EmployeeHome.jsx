import { useEffect } from "react";

import { useAuth } from "../auth/AuthContext.jsx";
import { CheckInCard } from "../components/home/CheckInCard.jsx";
import { MonthStats } from "../components/home/MonthStats.jsx";
import { HoursChart } from "../components/home/HoursChart.jsx";
import { TodayTimes } from "../components/home/TodayTimes.jsx";
import { Avatar } from "../components/ui/Avatar.jsx";
import { useNow } from "../hooks/useNow.js";
import { useToday } from "../hooks/useAttendance.js";
import { BUSINESS_RULES } from "../lib/domain/config.js";
import { formatHm, formatLongDate, minutesInOfficeTz, toDateKey } from "../lib/domain/time.js";

function greeting(now) {
  const hour = Math.floor(minutesInOfficeTz(now) / 60);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Employee home: check in/out, today's times, this week and this month (Home + Dashboard artboards). */
export default function EmployeeHome() {
  const { user } = useAuth();
  const now = useNow();
  const today = useToday();
  const firstName = user.name.split(" ")[0];
  const todayKey = today.data?.work_date ?? toDateKey(now);

  useEffect(() => {
    document.title = "Home · SpeedIn";
  }, []);

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* Phone header: avatar and greeting */}
      <header className="flex items-center gap-3 lg:hidden">
        <Avatar name={user.name} />
        <div>
          <p className="m-0 text-[13px] text-ink-muted">{greeting(now)}</p>
          <h1 className="m-0 text-[17px] font-bold">{user.name}</h1>
        </div>
      </header>

      {/* PC header */}
      <header className="hidden lg:block">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
          {greeting(now)}, {firstName}
        </h1>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          {formatLongDate(now)} · Office hours {formatHm(BUSINESS_RULES.officeStart)} – {formatHm(BUSINESS_RULES.officeEnd)}
        </p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <CheckInCard
            today={today.data}
            isLoading={today.isLoading}
            isError={today.isError}
            onRetry={() => today.refetch()}
            now={now}
          />
          {today.data && <TodayTimes attendance={today.data.attendance} now={now} className="lg:hidden" />}
        </div>

        <div className="flex flex-col gap-5">
          {/* Phones: this week (Home artboard). PC: this month (Desktop Dashboard artboard). */}
          <div className="lg:hidden">
            <HoursChart range="week" todayKey={todayKey} attendance={today.data?.attendance} now={now} />
          </div>
          <div className="hidden lg:block">
            <HoursChart range="month" todayKey={todayKey} attendance={today.data?.attendance} now={now} />
          </div>
          {today.data && <MonthStats today={today.data} />}
        </div>
      </div>
    </div>
  );
}
