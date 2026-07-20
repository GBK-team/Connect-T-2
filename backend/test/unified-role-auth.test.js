"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const officialNagarsevaks = require("../data/officialNagarsevaks");
const { normalizeMobile } = require("../authSecurity");
const {
  ROLE_PRIORITY,
  VALID_STATUSES,
  chooseHighestPriorityAssignment,
  privilegedRestrictionReason,
  safeAssignmentUserId,
  validateOfficialNagarsevakRecords,
  wardNumberFromDesignation,
} = require("../roleAuthorization");

test("01 normalizes a plain Indian mobile number", () => {
  assert.equal(normalizeMobile("9850784359"), "9850784359");
});

test("02 normalizes a +91 mobile number", () => {
  assert.equal(normalizeMobile("+91 98507 84359"), "9850784359");
});

test("03 normalizes a 91-prefixed mobile number", () => {
  assert.equal(normalizeMobile("91-9850784359"), "9850784359");
});

test("04 removes spaces, brackets and hyphens", () => {
  assert.equal(normalizeMobile("(98507) 84-359"), "9850784359");
});

test("05 extracts a ward from an A designation", () => {
  assert.equal(wardNumberFromDesignation("1-A"), "1");
});

test("06 extracts a ward from a B designation", () => {
  assert.equal(wardNumberFromDesignation("29-B"), "29");
});

test("07 leaves non-ward official designations unassigned", () => {
  assert.equal(wardNumberFromDesignation("स्वीकृत सदस्य"), null);
});

test("08 rejects out-of-range ward designations", () => {
  assert.equal(wardNumberFromDesignation("Ward 30"), null);
});

test("09 validates all 65 official PDF rows", () => {
  const result = validateOfficialNagarsevakRecords(officialNagarsevaks);
  assert.deepEqual(
    { total: result.total, valid: result.valid.length, invalid: result.invalid.length, duplicate: result.duplicate.length },
    { total: 65, valid: 65, invalid: 0, duplicate: 0 },
  );
});

test("10 preserves the first Marathi name exactly", () => {
  assert.equal(officialNagarsevaks[0].nameMr, "कर्जुले पाटील तेजश्री विश्वजीत");
});

test("11 preserves the final PDF serial and mobile", () => {
  assert.deepEqual(
    { serial: officialNagarsevaks.at(-1).serial, mobile: officialNagarsevaks.at(-1).mobile },
    { serial: 65, mobile: "9921112244" },
  );
});

test("12 detects an invalid mobile without inventing digits", () => {
  const result = validateOfficialNagarsevakRecords([
    { serial: 1, nameMr: "पूर्ण नाव", designation: "1-A", mobile: "1234" },
  ]);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.valid.length, 0);
});

test("13 detects duplicate normalized mobile numbers", () => {
  const result = validateOfficialNagarsevakRecords([
    { serial: 1, nameMr: "पहिले पूर्ण नाव", designation: "1-A", mobile: "9850784359" },
    { serial: 2, nameMr: "दुसरे पूर्ण नाव", designation: "1-B", mobile: "+91 9850784359" },
  ]);
  assert.equal(result.valid.length, 1);
  assert.equal(result.duplicate.length, 1);
  assert.equal(result.duplicate[0].duplicateOfSerial, 1);
});

test("14 rejects a record with a missing official name", () => {
  const result = validateOfficialNagarsevakRecords([
    { serial: 1, nameMr: "", designation: "1-A", mobile: "9850784359" },
  ]);
  assert.equal(result.invalid.length, 1);
});

test("15 resolves Super Admin before Nagarsevak and Citizen", () => {
  const selected = chooseHighestPriorityAssignment([
    { role: "citizen", status: "active" },
    { role: "nagarsevak", status: "active" },
    { role: "super_admin", status: "active" },
  ]);
  assert.equal(selected.role, "super_admin");
});

test("16 resolves Nagarsevak before Citizen", () => {
  const selected = chooseHighestPriorityAssignment([
    { role: "citizen", status: "active" },
    { role: "nagarsevak", status: "active" },
  ]);
  assert.equal(selected.role, "nagarsevak");
});

test("17 ignores inactive and revoked privileged assignments", () => {
  const selected = chooseHighestPriorityAssignment([
    { role: "super_admin", status: "inactive" },
    { role: "nagarsevak", status: "revoked" },
    { role: "citizen", status: "active" },
  ]);
  assert.equal(selected.role, "citizen");
});

test("18 returns no role when no active assignment exists", () => {
  assert.equal(chooseHighestPriorityAssignment([{ role: "super_admin", status: "inactive" }]), null);
});

test("19 role priority and statuses match the authorization contract", () => {
  assert.deepEqual(ROLE_PRIORITY, { super_admin: 1, nagarsevak: 2, citizen: 3 });
  assert.deepEqual([...VALID_STATUSES].sort(), ["active", "inactive", "revoked"]);
});

test("20 generated linked-user IDs are deterministic and role-separated", () => {
  const first = safeAssignmentUserId("nagarsevak", 42, "9850784359");
  assert.equal(first, safeAssignmentUserId("nagarsevak", 42, "9850784359"));
  assert.notEqual(first, safeAssignmentUserId("super_admin", 42, "9850784359"));
});

test("21 protects the primary Super Admin", () => {
  assert.equal(privilegedRestrictionReason({ target: { is_primary: 1, status: "active" }, activeCount: 3 }), "PRIMARY_ADMIN_PROTECTED");
});

test("22 prevents Super Admin self-deactivation by linked user id", () => {
  assert.equal(
    privilegedRestrictionReason({ target: { user_id: "SA_1", mobile: "9000000001", status: "active" }, actorUserId: "SA_1", actorMobile: "9000000002", activeCount: 3 }),
    "SELF_LOCKOUT_BLOCKED",
  );
});

test("23 prevents Super Admin self-deactivation by normalized mobile", () => {
  assert.equal(
    privilegedRestrictionReason({ target: { user_id: "SA_1", mobile: "9000000001", status: "active" }, actorUserId: "SA_2", actorMobile: "+91 9000000001", activeCount: 3 }),
    "SELF_LOCKOUT_BLOCKED",
  );
});

test("24 protects the last active Super Admin", () => {
  assert.equal(
    privilegedRestrictionReason({ target: { user_id: "SA_1", mobile: "9000000001", status: "active" }, actorUserId: "SA_2", actorMobile: "9000000002", activeCount: 1 }),
    "LAST_ADMIN_PROTECTED",
  );
});

test("25 allows a different non-primary admin to be restricted when another remains", () => {
  assert.equal(
    privilegedRestrictionReason({ target: { user_id: "SA_1", mobile: "9000000001", status: "active" }, actorUserId: "SA_2", actorMobile: "9000000002", activeCount: 2 }),
    null,
  );
});
