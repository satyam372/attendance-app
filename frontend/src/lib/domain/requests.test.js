import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LeaveCategory, LeaveHalf, RequestType } from "./enums.js";
import { buildRequest, Duration, requestDays, RequestKind, requestTypeFor, validateRequest } from "./requests.js";

const form = (overrides) => ({
  kind: RequestKind.LEAVE,
  duration: Duration.FULL,
  category: LeaveCategory.CASUAL,
  fromDate: "2026-10-21",
  toDate: "2026-10-23",
  leaveHalf: LeaveHalf.FIRST_HALF,
  holidayId: null,
  reason: "  Family function  ",
  ...overrides,
});

describe("requestTypeFor", () => {
  it("maps kind and duration to the five request types", () => {
    assert.equal(requestTypeFor(RequestKind.LEAVE, Duration.FULL), RequestType.FULL_LEAVE);
    assert.equal(requestTypeFor(RequestKind.LEAVE, Duration.HALF), RequestType.HALF_DAY_LEAVE);
    assert.equal(requestTypeFor(RequestKind.LEAVE, Duration.HALF_WFH), RequestType.HALF_LEAVE_HALF_WFH);
    assert.equal(requestTypeFor(RequestKind.WFH, Duration.FULL), RequestType.FULL_WFH);
    assert.equal(requestTypeFor(RequestKind.WFH, Duration.HALF), RequestType.HALF_WFH);
  });
});

describe("buildRequest", () => {
  it("builds a full leave over a range, trimming the reason", () => {
    assert.deepEqual(buildRequest(form()), {
      request_type: RequestType.FULL_LEAVE,
      from_date: "2026-10-21",
      to_date: "2026-10-23",
      leave_half: null,
      leave_category: LeaveCategory.CASUAL,
      holiday_id: null,
      reason: "Family function",
    });
  });

  it("makes half days a single date with a half, and WFH without a category", () => {
    const half = buildRequest(form({ duration: Duration.HALF, leaveHalf: LeaveHalf.SECOND_HALF }));
    assert.equal(half.to_date, half.from_date);
    assert.equal(half.leave_half, LeaveHalf.SECOND_HALF);
    const wfh = buildRequest(form({ kind: RequestKind.WFH, reason: "" }));
    assert.deepEqual([wfh.request_type, wfh.leave_category, wfh.leave_half, wfh.reason], [RequestType.FULL_WFH, null, null, null]);
  });

  it("turns an optional holiday into a one-day FULL_LEAVE on that holiday", () => {
    const holidays = [{ id: "h1", name: "Diwali", holiday_date: "2026-11-10", is_optional: true }];
    const body = buildRequest(form({ category: LeaveCategory.OPTIONAL_HOLIDAY, holidayId: "h1" }), holidays);
    assert.deepEqual([body.request_type, body.from_date, body.to_date, body.holiday_id], [RequestType.FULL_LEAVE, "2026-11-10", "2026-11-10", "h1"]);
  });
});

describe("validateRequest", () => {
  it("accepts a valid request", () => {
    assert.deepEqual(validateRequest(buildRequest(form())), {});
  });

  it("rejects reversed dates and ranges with no working day", () => {
    assert.ok(validateRequest(buildRequest(form({ toDate: "2026-10-20" }))).to);
    const weekend = buildRequest(form({ fromDate: "2026-10-24", toDate: "2026-10-25" }));
    assert.equal(validateRequest(weekend).from, "These dates are all weekends or holidays.");
    const holiday = buildRequest(form({ fromDate: "2026-10-20", toDate: "2026-10-20" }));
    assert.ok(validateRequest(holiday, { closedHolidays: new Set(["2026-10-20"]) }).from);
  });

  it("needs a holiday for an optional holiday", () => {
    assert.ok(validateRequest(buildRequest(form({ category: LeaveCategory.OPTIONAL_HOLIDAY }))).holiday);
  });
});

describe("requestDays", () => {
  it("counts working days, half-day types as 0.5", () => {
    assert.equal(requestDays(buildRequest(form({ fromDate: "2026-10-23", toDate: "2026-10-27" }))), 3);
    assert.equal(requestDays(buildRequest(form({ duration: Duration.HALF }))), 0.5);
  });
});
