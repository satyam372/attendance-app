import { Role } from "./enums.js";

// Who decides a leave/WFH request. Mirrors backend services/request.py (can_decide, approver_name):
// - an EMPLOYEE's request: their manager (reports_to), if that manager is an active MANAGER
// - a MANAGER's or HR person's request, or an employee's without a valid manager: HR
// - HR may also decide an employee's request in exceptions (an override of the manager)
// - nobody decides their own request

export const ApproverKind = Object.freeze({ MANAGER: "MANAGER", HR: "HR" });

/**
 * The normal approver for requests raised by `requester` (an Employee): { kind, id }.
 * With `employeesById`, a manager who is inactive or no longer a MANAGER hands over to HR.
 */
export function approverOf(requester, employeesById) {
  const managerId = requester.role === Role.EMPLOYEE ? requester.reports_to_id : null;
  const manager = managerId && employeesById ? employeesById.get(managerId) : null;
  const validManager = managerId && (!employeesById || (manager?.is_active && manager.role === Role.MANAGER));
  return validManager ? { kind: ApproverKind.MANAGER, id: managerId } : { kind: ApproverKind.HR, id: null };
}

/**
 * What `user` may do with a request raised by `requester`:
 * "decide" (they are the normal approver), "override" (HR stepping in for a manager) or null.
 */
export function decisionRight(user, requester, employeesById) {
  if (!user || !requester || user.id === requester.id) return null;
  const approver = approverOf(requester, employeesById);
  if (approver.kind === ApproverKind.MANAGER && approver.id === user.id) return "decide";
  if (user.role === Role.HR) return approver.kind === ApproverKind.HR ? "decide" : "override";
  return null;
}

/** "Rohan Patil" or "HR": who normally decides, by name, for screens. `employeesById` maps id → Employee. */
export function approverName(requester, employeesById) {
  const approver = approverOf(requester, employeesById);
  return approver.kind === ApproverKind.MANAGER ? (employeesById.get(approver.id)?.name ?? "their manager") : "HR";
}

/**
 * Pending HR requests split by who decides them (`employeesById` from GET /employees):
 * `forYou` HR decides (managers' and HR's requests, plus your own, shown read-only),
 * `withManagers` the employee's manager decides (HR can override).
 */
export function splitForHr(pending, user, employeesById) {
  const forYou = [];
  const withManagers = [];
  for (const request of pending) {
    const requester = employeesById.get(request.employee_id);
    const right = requester ? decisionRight(user, requester, employeesById) : "decide";
    if (right === "override") withManagers.push({ request, mode: "override", approver: approverName(requester, employeesById) });
    else forYou.push({ request, mode: right ? "decide" : "own" });
  }
  return { forYou, withManagers };
}
