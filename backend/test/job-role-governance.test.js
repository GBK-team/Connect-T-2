"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "jobPortalRoleGovernancePatch.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "productionBootstrap.js"), "utf8");

test("role governance loads before legacy Job Portal auth routes", () => {
  const governanceIndex = bootstrap.indexOf("jobPortalRoleGovernancePatch.js");
  const authIndex = bootstrap.indexOf("jobPortalAuthPatch.js");
  assert.ok(governanceIndex >= 0);
  assert.ok(authIndex > governanceIndex);
});

test("one active Job Portal role is locked per phone", () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS job_portal_role_locks/);
  assert.match(source, /phone VARCHAR\(20\) PRIMARY KEY/);
  assert.match(source, /JOB_ROLE_LOCKED/);
  assert.match(source, /activeProfileForPhone/);
});

test("role changes require an audited Super Admin decision", () => {
  assert.match(source, /job_portal_role_change_requests/);
  assert.match(source, /\/api\/job-portal\/role-change-requests/);
  assert.match(source, /\/api\/job-portal\/admin\/role-change-requests/);
  assert.match(source, /requireSuperAdmin/);
  assert.match(source, /status = 'approved'/);
  assert.match(source, /status = 'rejected'/);
});

test("employer jobs are paused when an approved correction moves to seeker", () => {
  assert.match(source, /UPDATE job_portal_jobs SET active = 0 WHERE employer_id = \?/);
});
