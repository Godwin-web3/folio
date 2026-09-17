import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { folioActionError, prepareOpenFileInput } from "./action-error.ts";

describe("folioActionError", () => {
  it("never returns an empty string", () => {
    assert.equal(folioActionError(""), "That did not save");
    assert.equal(folioActionError({}), "That did not save");
    assert.equal(folioActionError(null), "That did not save");
  });

  it("strips Convex client prefixes", () => {
    const msg = folioActionError(
      new Error(
        "[CONVEX A(open:openFile)] [Request ID: abc] Server Error\nUncaught Error: Street is required",
      ),
    );
    assert.equal(msg, "Street is required");
  });

  it("rewrites Unauthorized into a visible tenant message", () => {
    assert.equal(
      folioActionError(new Error("Unauthorized")),
      "Could not open that file. Sign in again and retry.",
    );
  });

  it("reads ConvexError-style data.message", () => {
    assert.equal(
      folioActionError({ data: { message: "Unit already on file" } }),
      "Unit already on file",
    );
  });
});

describe("prepareOpenFileInput", () => {
  it("trims fields and allows an empty unit", () => {
    const out = prepareOpenFileInput({
      street: "  2100 N Lincoln Ave  ",
      unit: "  ",
      zip: " 60614 ",
      tenantName: " Alex ",
      ownerName: "",
      ownerEmail: "",
    });
    assert.equal(out.street, "2100 N Lincoln Ave");
    assert.equal(out.unit, "");
    assert.equal(out.city, "Chicago");
    assert.equal(out.zip, "60614");
  });

  it("rejects a blank street with a visible error", () => {
    assert.throws(
      () =>
        prepareOpenFileInput({
          street: "  ",
          unit: "2F",
          zip: "60613",
          tenantName: "Maya",
          ownerName: "",
          ownerEmail: "",
        }),
      /Street needs a number and name/,
    );
  });
});
