import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as requests from "../lib/services/requests.js";

export function useHolidays() {
  // Holidays rarely change: keep them for 10 minutes
  return useQuery({ queryKey: ["holidays"], queryFn: requests.getHolidays, staleTime: 10 * 60_000 });
}

/** Raise a request; refresh attendance so pending days show as "Awaiting approval". */
export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requests.createRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

/** HR request lists. statuses: e.g. ["PENDING"] or ["APPROVED", "REJECTED"]. */
export function useRequestList(statuses, { enabled = true } = {}) {
  return useQuery({
    queryKey: ["requests", ...statuses],
    queryFn: () => requests.listRequests(statuses),
    enabled,
    refetchInterval: 60_000,
  });
}

/** Approve or reject; refresh request lists, the HR dashboard and attendance. */
export function useDecideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => requests.decideRequest(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}
