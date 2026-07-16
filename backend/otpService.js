const crypto = require("crypto");

const { issueOtpProof, normalizeMobile } = require("./authSecurity");

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_DELAY_MS = 45 * 1000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 6;
const MAX_VERIFY_ATTEMPTS = 5;

const sessions = new Map();
const rateLimits = new Map();

class OtpError extends Error {
  constructor(message, status = 400, code = "OTP_ERROR", retryAfterMs = 0) {
    super(message);
    this.name = "OtpError";
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

function cleanup(now = Date.now()) {
  for (const [token, session] of sessions.entries()) {
    if (!session || session.expiresAt <= now) sessions.delete(token);
  }

  for (const [mobile, item] of rateLimits.entries()) {
    if (!item || item.windowStartedAt + RATE_WINDOW_MS <= now) rateLimits.delete(mobile);
  }
}

function nextRateState(mobile, now) {
  const previous = rateLimits.get(mobile);
  if (!previous || previous.windowStartedAt + RATE_WINDOW_MS <= now) {
    return { windowStartedAt: now, count: 0, lastSentAt: 0 };
  }
  return previous;
}

async function sendOtp({ mobile: rawMobile, purpose = "login", sendSms }) {
  const mobile = normalizeMobile(rawMobile);
  if (mobile.length !== 10) {
    throw new OtpError("Valid 10 digit mobile number is required", 400, "INVALID_MOBILE");
  }
  if (typeof sendSms !== "function") {
    throw new OtpError("SMS provider is unavailable", 503, "SMS_UNAVAILABLE");
  }

  const now = Date.now();
  cleanup(now);
  const rate = nextRateState(mobile, now);
  const resendWait = rate.lastSentAt + RESEND_DELAY_MS - now;

  if (resendWait > 0) {
    throw new OtpError(
      "Please wait before requesting another OTP",
      429,
      "OTP_RESEND_TOO_SOON",
      resendWait,
    );
  }
  if (rate.count >= MAX_SENDS_PER_WINDOW) {
    throw new OtpError(
      "Too many OTP requests. Please try again later",
      429,
      "OTP_RATE_LIMITED",
      rate.windowStartedAt + RATE_WINDOW_MS - now,
    );
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const sessionToken = `otp_${crypto.randomBytes(24).toString("hex")}`;
  await sendSms(mobile, code);

  sessions.set(sessionToken, {
    mobile,
    purpose: String(purpose || "login"),
    code,
    attempts: 0,
    expiresAt: now + OTP_TTL_MS,
  });
  rateLimits.set(mobile, { ...rate, count: rate.count + 1, lastSentAt: now });

  return { sessionToken, otpLength: 6, expiresInSeconds: OTP_TTL_MS / 1000 };
}

function verifyOtp({ mobile: rawMobile, code: rawCode, purpose = "login", sessionToken }) {
  const mobile = normalizeMobile(rawMobile);
  const code = String(rawCode || "").replace(/\D/g, "");
  const token = String(sessionToken || "").trim();
  cleanup();

  if (!token) throw new OtpError("OTP session is required", 400, "OTP_SESSION_REQUIRED");
  const session = sessions.get(token);
  if (!session) throw new OtpError("Invalid or expired OTP", 400, "OTP_INVALID_OR_EXPIRED");

  if (session.mobile !== mobile || session.purpose !== String(purpose || "login")) {
    sessions.delete(token);
    throw new OtpError("OTP session does not match this request", 400, "OTP_SESSION_MISMATCH");
  }

  session.attempts += 1;
  const expected = Buffer.from(session.code);
  const received = Buffer.from(code);
  const valid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!valid) {
    if (session.attempts >= MAX_VERIFY_ATTEMPTS) sessions.delete(token);
    throw new OtpError("Invalid or expired OTP", 400, "OTP_INVALID_OR_EXPIRED");
  }

  sessions.delete(token);
  return {
    mobile,
    purpose: session.purpose,
    verificationToken: issueOtpProof(mobile, session.purpose),
  };
}

function resetForTests() {
  sessions.clear();
  rateLimits.clear();
}

module.exports = {
  OtpError,
  resetForTests,
  sendOtp,
  verifyOtp,
};
