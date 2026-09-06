import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allowClaimedUserId,
  normalizeClaimedUserId,
  resolveUserIdPure,
} from "./authz-resolve.mjs";

test("allowClaimedUserId defaults off", () => {
  assert.equal(allowClaimedUserId({}), false);
  assert.equal(allowClaimedUserId({ ALLOW_CLAIMED_USERID: "" }), false);
  assert.equal(allowClaimedUserId({ ALLOW_CLAIMED_USERID: "0" }), false);
});

test("allowClaimedUserId accepts true/1", () => {
  assert.equal(allowClaimedUserId({ ALLOW_CLAIMED_USERID: "true" }), true);
  assert.equal(allowClaimedUserId({ ALLOW_CLAIMED_USERID: "1" }), true);
});

test("normalizeClaimedUserId rejects empty and oversized", () => {
  assert.equal(normalizeClaimedUserId(""), null);
  assert.equal(normalizeClaimedUserId("   "), null);
  assert.equal(normalizeClaimedUserId("x".repeat(321)), null);
  assert.equal(normalizeClaimedUserId(" alice@example.com "), "alice@example.com");
});

test("resolveUserIdPure rejects mismatched claim when identity present", () => {
  assert.throws(
    () => resolveUserIdPure({ subject: "user_1" }, "other", {}),
    /Unauthorized/,
  );
});

test("resolveUserIdPure returns subject when claim omitted or matches", () => {
  assert.equal(resolveUserIdPure({ subject: "user_1" }, undefined, {}), "user_1");
  assert.equal(resolveUserIdPure({ subject: "user_1" }, "user_1", {}), "user_1");
});

test("resolveUserIdPure fails closed without identity by default", () => {
  assert.throws(() => resolveUserIdPure(null, "guest@x.com", {}), /Unauthorized/);
  assert.throws(() => resolveUserIdPure(undefined, "guest@x.com", {}), /Unauthorized/);
});

test("resolveUserIdPure allows claim only when ALLOW_CLAIMED_USERID set", () => {
  assert.equal(
    resolveUserIdPure(null, "guest@x.com", { ALLOW_CLAIMED_USERID: "true" }),
    "guest@x.com",
  );
});
