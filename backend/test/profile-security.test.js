"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

test("normal profile endpoint rejects mobile-number changes", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(server, /MOBILE_CHANGE_REQUIRES_REVERIFICATION/);
  assert.match(server, /Mobile number cannot be changed from the normal profile form/);
});
