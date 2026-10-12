// Business rule settings. Defaults match backend/app/core/config.py; keep the two in sync.
export const BUSINESS_RULES = Object.freeze({
  timezone: "Asia/Kolkata",
  officeStart: "10:30",
  officeEnd: "19:30",
  lateBufferMin: 30,
  wfhFreeDaysPerMonth: 2,
});
