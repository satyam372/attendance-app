import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays, isWeekend, minutesInOfficeTz, parseHm, toDateKey, weekdayOf } from "./time.js";

describe("office time zone helpers", () => {
  it("converts UTC instants to Asia/Kolkata", () => {
    assert.equal(minutesInOfficeTz("2026-10-12T05:00:00Z"), parseHm("10:30"));
    // 20:00 UTC on the 11th is already the 12th in India.
    assert.equal(toDateKey("2026-10-11T20:00:00Z"), "2026-10-12");
  });

  it("works with plain date keys regardless of the browser time zone", () => {
    assert.equal(weekdayOf("2026-10-12"), 1); // Monday
    assert.equal(isWeekend("2026-10-10"), true);
    assert.equal(addDays("2026-10-30", 3), "2026-11-02");
  });
});
