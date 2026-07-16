"use strict";

process.env.JWT_SECRET = "connect-t-test-secret-with-more-than-thirty-two-characters";

const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
  issueOtpProof,
  signToken,
  verifyOtpProof,
  verifyRequestToken,
  verifySignedToken,
} = require("../authSecurity");
const { resetForTests, sendOtp, verifyOtp } = require("../otpService");

beforeEach(() => resetForTests());

test("signed authentication tokens verify and tampered tokens fail", () => {
  const token = signToken({ sub: "U100", role: "citizen", scope: "civic" });
  const request = { headers: { authorization: `Bearer ${token}` } };

  assert.equal(verifyRequestToken(request).sub, "U100");
  assert.equal(verifySignedToken(`${token.slice(0, -1)}x`), null);
  assert.equal(verifySignedToken(signToken({ sub: "expired" }, 0)), null);
});

test("OTP proof is limited to its mobile number and purpose", () => {
  const proof = issueOtpProof("+91 98765 43210", "login");
  const request = { headers: { "x-otp-verification": proof } };

  assert.equal(verifyOtpProof(request, "9876543210", ["login"]).mobile, "9876543210");
  assert.equal(verifyOtpProof(request, "9876543210", ["register"]), null);
  assert.equal(verifyOtpProof(request, "9999999999", ["login"]), null);
});

test("OTP sessions require the matching session, mobile, purpose, and code", async () => {
  let deliveredCode = "";
  const sent = await sendOtp({
    mobile: "9876543210",
    purpose: "register",
    sendSms: async (_mobile, code) => {
      deliveredCode = code;
    },
  });

  assert.match(deliveredCode, /^\d{6}$/);
  assert.throws(
    () =>
      verifyOtp({
        mobile: "9876543210",
        purpose: "login",
        code: deliveredCode,
        sessionToken: sent.sessionToken,
      }),
    /does not match/,
  );

  resetForTests();
  const second = await sendOtp({
    mobile: "9876543210",
    purpose: "register",
    sendSms: async (_mobile, code) => {
      deliveredCode = code;
    },
  });
  const verified = verifyOtp({
    mobile: "9876543210",
    purpose: "register",
    code: deliveredCode,
    sessionToken: second.sessionToken,
  });

  assert.equal(verified.mobile, "9876543210");
  assert.ok(verifySignedToken(verified.verificationToken));
  assert.throws(
    () =>
      verifyOtp({
        mobile: "9876543210",
        purpose: "register",
        code: deliveredCode,
        sessionToken: second.sessionToken,
      }),
    /Invalid or expired OTP/,
  );
});

test("OTP resend throttling is enforced", async () => {
  const sendSms = async () => {};
  await sendOtp({ mobile: "9123456789", purpose: "login", sendSms });

  await assert.rejects(
    sendOtp({ mobile: "9123456789", purpose: "login", sendSms }),
    (error) => error?.status === 429 && error?.code === "OTP_RESEND_TOO_SOON",
  );
});
