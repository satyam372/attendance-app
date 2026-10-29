import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { approverName, approverOf, ApproverKind, decisionRight, splitForHr } from "./approvals.js";
import { Role } from "./enums.js";

const hr = { id: "hr", role: Role.HR, reports_to_id: null };
const hr2 = { id: "hr2", role: Role.HR, reports_to_id: null };
const manager = { id: "m", name: "Satyam", role: Role.MANAGER, reports_to_id: null };
const otherManager = { id: "m2", role: Role.MANAGER, reports_to_id: null };
const employee = { id: "e", role: Role.EMPLOYEE, reports_to_id: "m" };

describe("approverOf", () => {
  it("sends an employee's request to their manager, everyone else's to HR", () => {
    assert.deepEqual(approverOf(employee), { kind: ApproverKind.MANAGER, id: "m" });
    assert.equal(approverOf(manager).kind, ApproverKind.HR);
    assert.equal(approverOf(hr).kind, ApproverKind.HR);
    assert.equal(approverOf({ ...employee, reports_to_id: null }).kind, ApproverKind.HR);
  });
});

describe("decisionRight", () => {
  it("lets the manager decide for their own reports only", () => {
    assert.equal(decisionRight(manager, employee), "decide");
    assert.equal(decisionRight(otherManager, employee), null);
    assert.equal(decisionRight(manager, otherManager), null);
  });

  it("lets HR decide managers' and HR's requests, and override for employees", () => {
    assert.equal(decisionRight(hr, manager), "decide");
    assert.equal(decisionRight(hr, hr2), "decide");
    assert.equal(decisionRight(hr, employee), "override");
  });

  it("never lets anyone decide their own request", () => {
    assert.equal(decisionRight(hr, hr), null);
    assert.equal(decisionRight(manager, manager), null);
    assert.equal(decisionRight(employee, employee), null);
  });
});

describe("approverName", () => {
  it("names the manager, or HR", () => {
    const byId = new Map([[manager.id, manager]]);
    assert.equal(approverName(employee, byId), "Satyam");
    assert.equal(approverName(manager, byId), "HR");
  });
});

describe("splitForHr", () => {
  it("puts managers' and HR requests in 'for you', employees' with their manager, own ones read-only", () => {
    const byId = new Map([hr, hr2, manager, employee].map((e) => [e.id, e]));
    const pending = [{ id: 1, employee_id: "m" }, { id: 2, employee_id: "e" }, { id: 3, employee_id: "hr" }, { id: 4, employee_id: "hr2" }];
    const { forYou, withManagers } = splitForHr(pending, hr, byId);
    assert.deepEqual(forYou.map((x) => [x.request.id, x.mode]), [[1, "decide"], [3, "own"], [4, "decide"]]);
    assert.deepEqual(withManagers.map((x) => [x.request.id, x.mode, x.approver]), [[2, "override", "Satyam"]]);
  });
});
