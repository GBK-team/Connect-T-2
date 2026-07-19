"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  GENERIC_SERVER_ERROR,
  requestIdFrom,
  safeServerErrorPayload,
} = require("../httpSafety");
const { isIsoDate, validateCoordinates } = require("../validation");
const { hasExpectedSignature } = require("../mediaStorage");
const { redactApplicationContact, redactJobContact } = require("../jobPortalPrivacy");

test("server errors expose a safe message and traceable request id", () => {
  const payload = safeServerErrorPayload("request-123");
  assert.equal(payload.success, false);
  assert.equal(payload.error, GENERIC_SERVER_ERROR);
  assert.equal(payload.message, GENERIC_SERVER_ERROR);
  assert.equal(payload.requestId, "request-123");
  assert.doesNotMatch(JSON.stringify(payload), /sql|stack|exception/i);
});

test("request ids accept safe values and reject header injection", () => {
  assert.equal(requestIdFrom("safe-request_123"), "safe-request_123");
  assert.match(requestIdFrom("bad\r\nheader"), /^[0-9a-f-]{36}$/i);
});

test("GPS validation requires a complete, valid coordinate pair", () => {
  assert.deepEqual(validateCoordinates(undefined, undefined, undefined), {
    valid: true,
    latitude: null,
    longitude: null,
    accuracy: null,
  });
  assert.equal(validateCoordinates(19.2183, 73.0868, 8).valid, true);
  assert.equal(validateCoordinates(91, 73.0868, 8).valid, false);
  assert.equal(validateCoordinates(19.2183, undefined, 8).valid, false);
  assert.equal(validateCoordinates(19.2183, 73.0868, -1).valid, false);
});

test("ISO date validation rejects impossible dates", () => {
  assert.equal(isIsoDate("2000-02-29"), true);
  assert.equal(isIsoDate("2001-02-29"), false);
  assert.equal(isIsoDate("19-07-2026"), false);
});

test("uploaded media must match its declared file type", () => {
  const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
  const webp = Buffer.from("RIFF0000WEBP", "ascii");
  assert.equal(hasExpectedSignature(png, "image/png"), true);
  assert.equal(hasExpectedSignature(webp, "image/webp"), true);
  assert.equal(hasExpectedSignature(Buffer.from("not an image"), "image/png"), false);
});

test("Job Portal contact details follow employer-only WhatsApp privacy", () => {
  const job = { employer_id: "EMP1", employer_phone: "9999999999", employer_whatsapp: "9999999999" };
  assert.equal(redactJobContact(job, undefined).employer_phone, null);
  assert.equal(redactJobContact(job, { sub: "SEEK1", role: "seeker" }).employer_whatsapp, null);
  assert.equal(redactJobContact(job, { sub: "EMP1", role: "employer" }).employer_phone, "9999999999");
  assert.equal(redactJobContact(job, { sub: "ADMIN", role: "super_admin" }).employer_phone, "9999999999");
  assert.equal(redactApplicationContact(job, { sub: "SEEK1", role: "seeker" }).employer_phone, null);
});
