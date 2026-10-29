import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as employees from "../lib/services/employees.js";

/** HR only: everyone, with role and reports_to (also used to route approvals). */
export function useEmployees({ enabled = true } = {}) {
  return useQuery({ queryKey: ["employees"], queryFn: employees.listEmployees, enabled });
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

/** Change an employee: useUpdateEmployee().mutate({ id, changes: { is_active } or { reports_to_id } }). */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => employees.updateEmployee(id, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["requests"] }); // who approves pending requests may change
    },
  });
}
