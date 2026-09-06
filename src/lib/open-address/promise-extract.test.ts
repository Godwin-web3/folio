import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractInboundPromise } from "./promise-extract.ts";

const TODAY = "2026-09-06";

describe("extractInboundPromise", () => {
  it("extracts an explicit ISO date with commitment", () => {
    const r = extractInboundPromise(
      "We'll send a plumber on 2026-09-12 to fix the heat.",
      TODAY,
    );
    assert.equal(r.classification, "promise");
    assert.equal(r.promiseOn, "2026-09-12");
    assert.equal(r.confidence, "high");
  });

  it("maps Friday commitment to the next Friday", () => {
    const r = extractInboundPromise(
      "We'll send someone Friday. Sorry about the wait.",
      TODAY,
    );
    assert.equal(r.classification, "promise");
    assert.equal(r.promiseOn, "2026-09-11"); // next Friday after Sunday Sep 6 2026
  });

  it("does not invent a promise from 'friday' alone", () => {
    const r = extractInboundPromise("See you friday maybe.", TODAY);
    assert.equal(r.classification, "other");
    assert.equal(r.promiseOn, null);
  });

  it("does not invent a due date for undated commitment", () => {
    const r = extractInboundPromise("We will fix the boiler soon.", TODAY);
    assert.equal(r.promiseOn, null);
    assert.notEqual(r.classification, "promise");
  });

  it("classifies denials without creating dates", () => {
    const r = extractInboundPromise("We will not repair that. Not responsible.", TODAY);
    assert.equal(r.classification, "denial");
    assert.equal(r.promiseOn, null);
  });

  it("classifies court language", () => {
    const r = extractInboundPromise("Your court date is set. Appearance required.", TODAY);
    assert.equal(r.classification, "court_date");
  });
});
