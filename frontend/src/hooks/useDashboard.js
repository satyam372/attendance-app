import { useQueries, useQuery } from "@tanstack/react-query";

import * as dashboard from "../lib/services/dashboard.js";

// Today's data changes as people check in, so it refreshes every minute; past days don't change.
export function useDaySummary(day, { isToday }) {
  return useQuery({
    queryKey: ["dashboard", "summary", day ?? "today"],
    queryFn: () => dashboard.getDaySummary(day),
    refetchInterval: isToday ? 60_000 : false,
  });
}

export function useTeamDay(day, { isToday }) {
  return useQuery({
    queryKey: ["dashboard", "team", day ?? "today"],
    queryFn: () => dashboard.getTeamDay(day),
    refetchInterval: isToday ? 60_000 : false,
  });
}

/**
 * Team status for each day of a week (HR sheet): one /today/team call per day, sharing the cache
 * with "Team today". Days after today are skipped (the backend returns 422 for them).
 */
export function useTeamWeek(days, todayKey) {
  return useQueries({
    queries: days.map((day) => {
      const isToday = day === todayKey;
      return {
        queryKey: ["dashboard", "team", isToday ? "today" : day],
        queryFn: () => dashboard.getTeamDay(isToday ? null : day),
        refetchInterval: isToday ? 60_000 : false,
        enabled: day <= todayKey,
      };
    }),
  });
}
