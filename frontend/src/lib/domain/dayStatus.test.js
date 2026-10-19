import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Category, describeDay, summarizeMonth } from "./dayStatus.js";

const day = (overrides) => ({
  work_date: "2026-10-12",
  status: "OFFICE",
  holiday_name: null,
  in_time: "2026-10-12T05:00:00Z",
  out_time: "2026-10-12T14:00:00Z",
  worked_minutes: 540,
  punctuality: "ON_TIME",
  ...overrides,
});

describe("describeDay", () => {
  it("splits worked days into present and late", () => {
    assert.equal(describeDay(day()).category, Category.PRESENT);
    assert.equal(describeDay(day({ status: "WFH", punctuality: "LATE" })).category, Category.LATE);
    assert.equal(describeDay(day({ status: "WFH" })).mode, "Work from home");
  });

  it("maps leave, holiday, pending, rejected and absent days", () => {
    assert.equal(describeDay(day({ status: "LEAVE", in_time: null })).category, Category.LEAVE);
    assert.equal(describeDay(day({ status: "HALF_DAY_LEAVE" })).label, "Half-day leave");
    const holiday = describeDay(day({ status: "HOLIDAY", holiday_name: "Dussehra", in_time: null }));
    assert.deepEqual([holiday.category, holiday.label], [Category.HOLIDAY, "Dussehra"]);
    assert.equal(describeDay(day({ status: "AWAITING_APPROVAL", in_time: null })).category, Category.PENDING);
    assert.equal(describeDay(day({ status: "REJECTED", in_time: null })).category, Category.ABSENT);
    assert.equal(describeDay(day({ status: "NOT_CHECKED_IN", in_time: null })).category, Category.TODAY);
    assert.equal(describeDay(undefined).category, Category.NONE);
  });
});

describe("summarizeMonth", () => {
  it("counts attendance, late, absent and leave (half days as 0.5) and total hours", () => {
    const totals = summarizeMonth([
      day(),
      day({ punctuality: "LATE" }),
      day({ status: "ABSENT", in_time: null, out_time: null, worked_minutes: null, punctuality: "NO_CHECK_IN" }),
      day({ status: "LEAVE", in_time: null, out_time: null, worked_minutes: null, punctuality: null }),
      day({ status: "HALF_DAY_LEAVE", worked_minutes: 240, punctuality: null }),
    ]);
    assert.deepEqual(totals, { present: 3, late: 1, absent: 1, leave: 1.5, workedMinutes: 1320 });
  });
});
