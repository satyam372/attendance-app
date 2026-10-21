import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as employees from "../lib/services/employees.js";

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: employees.listEmployees });
}

/** Add an employee; the team list and the HR dashboard (team size) refresh. */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employees.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/** Add a holiday; holidays, attendance and the HR dashboard refresh (working days change). */
export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employees.createHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
