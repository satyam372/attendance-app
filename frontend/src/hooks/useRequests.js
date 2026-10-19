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
