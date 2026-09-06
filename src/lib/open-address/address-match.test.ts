import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_ACCEPT_THRESHOLD,
  normalizeAddress,
  scoreAddressMatch,
  sodaAddressParts,
} from "./address-match.ts";

describe("normalizeAddress", () => {
  it("expands suffixes and strips unit noise", () => {
    const n = normalizeAddress("1757 W Berteau Ave, Apt 2F");
    assert.equal(n.number, "1757");
    assert.equal(n.direction, "W");
    assert.equal(n.streetName, "BERTEAU");
    assert.equal(n.suffix, "AVENUE");
  });
});

describe("scoreAddressMatch", () => {
  it("accepts the same building", () => {
    const m = scoreAddressMatch("1757 W Berteau Ave", "1757 W BERTEAU AVE");
    assert.equal(m.accept, true);
    assert.ok(m.score >= MATCH_ACCEPT_THRESHOLD);
  });

  it("rejects different street numbers", () => {
    const m = scoreAddressMatch("1757 W Berteau Ave", "1759 W BERTEAU AVE");
    assert.equal(m.accept, false);
    assert.equal(m.reason, "street_number_mismatch");
  });

  it("rejects opposite directions on the same named street", () => {
    const m = scoreAddressMatch("1757 W Berteau Ave", "1757 E BERTEAU AVE");
    assert.equal(m.accept, false);
    assert.equal(m.reason, "direction_mismatch");
  });

  it("rejects a different street name with the same number", () => {
    const m = scoreAddressMatch("1757 W Berteau Ave", "1757 W BELMONT AVE");
    assert.equal(m.accept, false);
  });
});

describe("sodaAddressParts", () => {
  it("returns number + street name for SOQL", () => {
    const p = sodaAddressParts("1757 W Berteau Ave");
    assert.deepEqual(p, { number: "1757", nameNeedle: "BERTEAU" });
  });

  it("returns null when too weak", () => {
    assert.equal(sodaAddressParts("Ave"), null);
  });
});
