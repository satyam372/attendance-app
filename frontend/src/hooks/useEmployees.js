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

// Holidays change which days are working days, so attendance and the HR dashboard refresh too.
function refreshAfterHolidayChange(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["holidays"] });
  queryClient.invalidateQueries({ queryKey: ["attendance"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

/** Add a holiday (or restore a removed one on that date). */
export function useCreateHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: employees.createHoliday,
    onSuccess: () => refreshAfterHolidayChange(queryClient),
  });
}

/** Remove ({ id, isActive: false }) or restore ({ id, isActive: true }) a holiday. */
export function useSetHolidayActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => employees.setHolidayActive(id, isActive),
    onSuccess: () => refreshAfterHolidayChange(queryClient),
  });
}

/** Deactivate ({ id, isActive: false }) or reactivate an employee; the team list and HR dashboard refresh. */
export function useSetEmployeeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => employees.setEmployeeActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
