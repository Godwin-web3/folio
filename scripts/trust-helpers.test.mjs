import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MATCH_ACCEPT_THRESHOLD,
  normalizeAddress,
  scoreAddressMatch,
  sodaAddressParts,
} from "./address-match.mjs";
import { extractInboundPromise } from "./promise-extract.mjs";

test("normalizeAddress expands suffixes and strips units", () => {
  const n = normalizeAddress("1757 W Berteau Ave, Apt 2F");
  assert.equal(n.number, "1757");
  assert.equal(n.direction, "W");
  assert.equal(n.streetName, "BERTEAU");
  assert.equal(n.suffix, "AVENUE");
});

test("scoreAddressMatch accepts the same building", () => {
  const m = scoreAddressMatch("1757 W Berteau Ave", "1757 W BERTEAU AVE");
  assert.equal(m.accept, true);
  assert.ok(m.score >= MATCH_ACCEPT_THRESHOLD);
});

test("scoreAddressMatch rejects different street numbers", () => {
  const m = scoreAddressMatch("1757 W Berteau Ave", "1759 W BERTEAU AVE");
  assert.equal(m.accept, false);
  assert.equal(m.reason, "street_number_mismatch");
});

test("scoreAddressMatch rejects opposite directions", () => {
  const m = scoreAddressMatch("1757 W Berteau Ave", "1757 E BERTEAU AVE");
  assert.equal(m.accept, false);
  assert.equal(m.reason, "direction_mismatch");
});

test("scoreAddressMatch rejects different street names", () => {
  const m = scoreAddressMatch("1757 W Berteau Ave", "1757 W BELMONT AVE");
  assert.equal(m.accept, false);
});

test("sodaAddressParts returns number + name", () => {
  assert.deepEqual(sodaAddressParts("1757 W Berteau Ave"), {
    number: "1757",
    nameNeedle: "BERTEAU",
  });
});

const TODAY = "2026-09-06";

test("extractInboundPromise keeps explicit ISO due dates", () => {
  const r = extractInboundPromise(
    "We'll send a plumber on 2026-09-12 to fix the heat.",
    TODAY,
  );
  assert.equal(r.classification, "promise");
  assert.equal(r.promiseOn, "2026-09-12");
});

test("extractInboundPromise maps Friday with commitment", () => {
  const r = extractInboundPromise(
    "We'll send someone Friday. Sorry about the wait.",
    TODAY,
  );
  assert.equal(r.classification, "promise");
  assert.equal(r.promiseOn, "2026-09-11");
});

test("extractInboundPromise does not invent from friday alone", () => {
  const r = extractInboundPromise("See you friday maybe.", TODAY);
  assert.equal(r.classification, "other");
  assert.equal(r.promiseOn, null);
});

test("extractInboundPromise does not invent due dates for undated commitments", () => {
  const r = extractInboundPromise("We will fix the boiler soon.", TODAY);
  assert.equal(r.promiseOn, null);
  assert.notEqual(r.classification, "promise");
});

test("extractInboundPromise classifies denials", () => {
  const r = extractInboundPromise("We will not repair that. Not responsible.", TODAY);
  assert.equal(r.classification, "denial");
  assert.equal(r.promiseOn, null);
});
