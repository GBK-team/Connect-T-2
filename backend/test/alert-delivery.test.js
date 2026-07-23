"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeWard, isGlobalAlert, canCitizenSee } = require("../alertDeliveryPatch");

test("ward normalization accepts municipal ward formats", () => {
  assert.equal(normalizeWard("Ward 7"), "7");
  assert.equal(normalizeWard("ward 07A"), "07a");
  assert.equal(normalizeWard("All Wards"), "");
});

test("global alerts are visible to every citizen", () => {
  assert.equal(isGlobalAlert({ ward: null, target_audience: "All citizens" }), true);
  assert.equal(canCitizenSee({ ward: null }, { ward: "Ward 12" }), true);
});

test("ward alerts are visible only to matching citizens", () => {
  const alert = { ward: "Ward 12", target_audience: "Ward residents" };
  assert.equal(canCitizenSee(alert, { ward: "12" }), true);
  assert.equal(canCitizenSee(alert, { ward: "Ward 13" }), false);
});
