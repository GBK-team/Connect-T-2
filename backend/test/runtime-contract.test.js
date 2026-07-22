"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const backendRoot = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(backendRoot, file), "utf8");

test("server.js loads the complete production bootstrap before Express", () => {
  const server = read("server.js");
  const bootstrapIndex = server.indexOf('require("./productionBootstrap")');
  const expressIndex = server.indexOf('require("express")');

  assert.ok(bootstrapIndex >= 0, "server.js must load the production bootstrap");
  assert.ok(expressIndex > bootstrapIndex, "production bootstrap must load before Express");
});

test("production bootstrap includes every route and workflow patch", () => {
  const bootstrap = read("productionBootstrap.js");
  for (const patch of [
    "otpProductionPatch.js",
    "utilityStatusPatch.js",
    "jobPortalAuthPatch.js",
    "jobPortalMessagePatch.js",
    "jobPortalProfilePatch.js",
  ]) {
    assert.match(bootstrap, new RegExp(patch.replace(".", "\\.")));
  }

  assert.match(read("jobPortalAuthPatch.js"), /\/api\/job-portal\/session/);
  assert.match(read("utilityStatusPatch.js"), /\/api\/utility-status/);
  assert.match(read("jobPortalMessagePatch.js"), /sent_count[^]*>=\s*2/);
});

test("all supported startup files share the same bootstrap", () => {
  assert.match(read("hostinger-entry.js"), /require\("\.\/productionBootstrap\.js"\)/);
  assert.match(read("hostinger-server.js"), /require\("\.\/hostinger-entry\.js"\)/);
  assert.match(read("server.js"), /backend-server-production-ready-v4/);
});
