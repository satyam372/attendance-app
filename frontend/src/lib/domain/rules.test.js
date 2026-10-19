import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LeaveHalf, LeavePortion, RequestType, WorkMode } from "./enums.js";
import {
  attendanceForRequest,
  inTimeBucket,
  isLate,
  isWorkingDay,
  wfhDaysUsed,
  wfhWeight,
  workingDaysInRange,
} from "./rules.js";

// 05:30Z = 11:00 in Asia/Kolkata (UTC+5:30).
const at = (hhmmUtc) => `2026-10-12T${hhmmUtc}:00Z`;

describe("isLate", () => {
  it("is on time at exactly 11:00 IST and late one minute after", () => {
    assert.equal(isLate({ in_time: at("05:30"), leave_portion: LeavePortion.NONE }), false);
    assert.equal(isLate({ in_time: at("05:31"), leave_portion: LeavePortion.NONE }), true);
  });

  it("is never late without a check-in or on a half-day leave", () => {
    assert.equal(isLate({ in_time: null }), false);
    assert.equal(isLate({ in_time: at("08:00"), leave_portion: LeavePortion.HALF }), false);
  });
});

describe("inTimeBucket", () => {
  it("splits check-ins into on time, grace and late", () => {
    assert.equal(inTimeBucket(null), "none");
    assert.equal(inTimeBucket(at("05:00")), "ontime"); // 10:30 IST
    assert.equal(inTimeBucket(at("05:15")), "grace"); // 10:45 IST
    assert.equal(inTimeBucket(at("05:30")), "grace"); // 11:00 IST
    assert.equal(inTimeBucket(at("05:45")), "late"); // 11:15 IST
  });
});

describe("wfhWeight", () => {
  it("follows the request-to-attendance table in schema.md", () => {
    assert.equal(wfhWeight({ work_mode: WorkMode.OFFICE, leave_portion: LeavePortion.NONE }), 0);
    assert.equal(wfhWeight({ work_mode: WorkMode.WFH, leave_portion: LeavePortion.NONE }), 1);
    assert.equal(wfhWeight({ work_mode: WorkMode.HYBRID, leave_portion: LeavePortion.NONE }), 0.5);
    assert.equal(wfhWeight({ work_mode: WorkMode.OFFICE, leave_portion: LeavePortion.HALF }), 0);
    assert.equal(wfhWeight({ work_mode: WorkMode.WFH, leave_portion: LeavePortion.HALF }), 0.5);
    assert.equal(wfhWeight({ work_mode: null, leave_portion: LeavePortion.FULL }), 0);
  });

  it("sums half days as 0.5", () => {
    const rows = [
      { work_mode: WorkMode.WFH, leave_portion: LeavePortion.NONE },
      { work_mode: WorkMode.HYBRID, leave_portion: LeavePortion.NONE },
      { work_mode: WorkMode.WFH, leave_portion: LeavePortion.HALF },
    ];
    assert.equal(wfhDaysUsed(rows), 2);
  });
});

describe("working days", () => {
  const holidays = new Set(["2026-10-02"]); // Gandhi Jayanti, a Friday

  it("skips weekends and holidays", () => {
    assert.equal(isWorkingDay("2026-10-01", holidays), true); // Thursday
    assert.equal(isWorkingDay("2026-10-02", holidays), false); // holiday
    assert.equal(isWorkingDay("2026-10-03", holidays), false); // Saturday
  });

  it("lists working days in a range, inclusive", () => {
    assert.deepEqual(workingDaysInRange("2026-10-01", "2026-10-06", holidays), ["2026-10-01", "2026-10-05", "2026-10-06"]);
  });
});

describe("attendanceForRequest", () => {
  it("maps each request type to attendance fields", () => {
    assert.deepEqual(attendanceForRequest(RequestType.FULL_LEAVE), {
      work_mode: null,
      leave_portion: LeavePortion.FULL,
      leave_half: null,
    });
    assert.deepEqual(attendanceForRequest(RequestType.HALF_LEAVE_HALF_WFH, LeaveHalf.SECOND_HALF), {
      work_mode: WorkMode.WFH,
      leave_portion: LeavePortion.HALF,
      leave_half: LeaveHalf.SECOND_HALF,
    });
  });

  it("requires a half for half-day leave", () => {
    assert.throws(() => attendanceForRequest(RequestType.HALF_DAY_LEAVE));
  });
});
