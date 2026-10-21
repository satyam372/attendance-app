import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  formatDuration,
  formatHm,
  isWeekend,
  minutesInOfficeTz,
  parseApiDateTime,
  parseHm,
  toDateKey,
  weekdayOf,
  weekOf,
} from "./time.js";

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

describe("display helpers", () => {
  it("treats API date-times without a zone as UTC", () => {
    assert.equal(parseApiDateTime("2026-10-12T05:00:00").toISOString(), "2026-10-12T05:00:00.000Z");
    assert.equal(parseApiDateTime("2026-10-12T05:00:00+00:00").toISOString(), "2026-10-12T05:00:00.000Z");
    assert.equal(parseApiDateTime(null), null);
  });

  it("formats durations, settings times and weeks", () => {
    assert.equal(formatDuration(485), "8h 05m");
    assert.equal(formatDuration(null), "—");
    assert.equal(formatHm("19:30"), "7:30 PM");
    assert.deepEqual(weekOf("2026-10-14"), [
      "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18",
    ]);
  });
});
