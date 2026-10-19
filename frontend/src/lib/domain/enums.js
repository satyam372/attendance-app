// Mirrors the enums in docs/schema.md. Values are sent to and received from the API as-is.

export const Role = Object.freeze({ EMPLOYEE: "EMPLOYEE", MANAGER: "MANAGER", HR: "HR" });

export const WorkMode = Object.freeze({ OFFICE: "OFFICE", WFH: "WFH", HYBRID: "HYBRID" });

export const LeavePortion = Object.freeze({ NONE: "NONE", HALF: "HALF", FULL: "FULL" });

export const LeaveHalf = Object.freeze({ FIRST_HALF: "FIRST_HALF", SECOND_HALF: "SECOND_HALF" });

export const RequestType = Object.freeze({
  FULL_LEAVE: "FULL_LEAVE",
  HALF_DAY_LEAVE: "HALF_DAY_LEAVE",
  HALF_LEAVE_HALF_WFH: "HALF_LEAVE_HALF_WFH",
  HALF_WFH: "HALF_WFH",
  FULL_WFH: "FULL_WFH",
});

export const LeaveCategory = Object.freeze({
  CASUAL: "CASUAL",
  SICK: "SICK",
  EARNED: "EARNED",
  OPTIONAL_HOLIDAY: "OPTIONAL_HOLIDAY",
});

export const ApprovalStatus = Object.freeze({ PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" });

export const ROLE_LABELS = Object.freeze({
  [Role.EMPLOYEE]: "Employee",
  [Role.MANAGER]: "Manager",
  [Role.HR]: "HR",
});
