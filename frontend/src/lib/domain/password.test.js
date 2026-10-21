import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateTemporaryPassword, newPasswordError } from "./password.js";

describe("temporary passwords", () => {
  it("generates passwords that meet the policy, without look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword();
      assert.equal(password.length, 12);
      assert.equal(newPasswordError(password), null);
      assert.doesNotMatch(password, /[01OlI]/);
    }
  });

  it("applies the 8 to 72 byte policy", () => {
    assert.ok(newPasswordError("short"));
    assert.equal(newPasswordError("eight888"), null);
    assert.ok(newPasswordError("é".repeat(40))); // 40 characters but 80 bytes
  });
});
