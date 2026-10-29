import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { monthOf } from "../lib/domain/time.js";
import { getCurrentLocation } from "../lib/geolocation.js";
import * as attendance from "../lib/services/attendance.js";

export const attendanceKeys = {
  today: ["attendance", "today"],
  history: (year, month) => ["attendance", "history", year, month],
};

export function useToday() {
  return useQuery({ queryKey: attendanceKeys.today, queryFn: attendance.getToday });
}

export function useMonthHistory(year, month, options = {}) {
  return useQuery({
    queryKey: attendanceKeys.history(year, month),
    queryFn: () => attendance.getHistory({ year, month }),
    enabled: Boolean(year && month),
    ...options,
  });
}

/** History for every month touched by the given "YYYY-MM-DD" keys, merged into one map by date. */
export function useHistoryForDays(dateKeys) {
  const months = [...new Set(dateKeys.map((key) => key.slice(0, 7)))].map((key) => monthOf(`${key}-01`));
  const results = useQueries({
    queries: months.map(({ year, month }) => ({
      queryKey: attendanceKeys.history(year, month),
      queryFn: () => attendance.getHistory({ year, month }),
    })),
  });
  const byDate = new Map(results.flatMap((r) => r.data ?? []).map((day) => [day.work_date, day]));
  return { byDate, isLoading: results.some((r) => r.isLoading), isError: results.some((r) => r.isError) };
}

/** Check in or out, then refresh today's status and history. */
function useAttendanceAction(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (row) => {
      queryClient.setQueryData(attendanceKeys.today, (old) => (old ? { ...old, attendance: row } : old));
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

/**
 * Checks in with `location` if given, otherwise gets a fresh one (the browser may ask for permission).
 * Call as `mutate({ workMode, location })`: TanStack Query passes only one variable to the mutation.
 * `locating` is true while waiting for the browser's position, so the card can say so.
 */
export function useCheckIn() {
  const [locating, setLocating] = useState(false);
  const mutation = useAttendanceAction(async ({ workMode, location }) => {
    if (location) return attendance.checkIn(workMode, location);
    setLocating(true);
    let loc;
    try {
      loc = await getCurrentLocation();
    } finally {
      setLocating(false);
    }
    return attendance.checkIn(workMode, loc);
  });
  return { ...mutation, locating };
}

export function useCheckOut() {
  return useAttendanceAction(() => attendance.checkOut());
}
