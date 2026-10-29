import { Role } from "./enums.js";

// Who decides a leave/WFH request (agreed 2026-10-29; the backend's decide_request enforces it):
// - an EMPLOYEE's request: their manager (reports_to)
// - a MANAGER's or HR person's request: HR
// - HR may also decide an employee's request in exceptions (an override of the manager)
// - nobody decides their own request

export const ApproverKind = Object.freeze({ MANAGER: "MANAGER", HR: "HR" });

/** The normal approver for requests raised by `requester` (an Employee): { kind, id }. */
export function approverOf(requester) {
  // An employee without a manager should not exist (HR must set one); HR covers it meanwhile
  if (requester.role === Role.EMPLOYEE && requester.reports_to_id) return { kind: ApproverKind.MANAGER, id: requester.reports_to_id };
  return { kind: ApproverKind.HR, id: null };
}

/**
 * What `user` may do with a request raised by `requester`:
 * "decide" (they are the normal approver), "override" (HR stepping in for a manager) or null.
 */
export function decisionRight(user, requester) {
  if (!user || !requester || user.id === requester.id) return null;
  const approver = approverOf(requester);
  if (approver.kind === ApproverKind.MANAGER && approver.id === user.id) return "decide";
  if (user.role === Role.HR) return approver.kind === ApproverKind.HR ? "decide" : "override";
  return null;
}

/** "Rohan Patil" or "HR": who normally decides, by name, for screens. `employeesById` maps id → Employee. */
export function approverName(requester, employeesById) {
  const approver = approverOf(requester);
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
    const right = requester ? decisionRight(user, requester) : "decide";
    if (right === "override") withManagers.push({ request, mode: "override", approver: approverName(requester, employeesById) });
    else forYou.push({ request, mode: right ? "decide" : "own" });
  }
  return { forYou, withManagers };
}
