import { useQuery } from "@tanstack/react-query";

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
