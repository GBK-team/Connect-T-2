/*
 * Production OTP route patch.
 *
 * Loaded before server.js so every mobile login uses a server-issued OTP
 * session, rate limits, attempt limits, and a short-lived verification proof.
 */

const { sendOtp: createOtp, verifyOtp: checkOtp } = require("./otpService");

let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function otpError(res, err, fallback) {
  return sendJson(res, Number(err?.status || 500), {
    success: false,
    valid: false,
    error: err?.message || fallback,
    code: err?.code || "OTP_ERROR",
    retryAfterSeconds: err?.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : undefined,
  });
}

async function sendOtp(req, res) {
  try {
    const { sendOtpSms } = require("./smsProvider");
    const result = await createOtp({
      mobile: req.body?.mobile || req.body?.phone,
      purpose: req.body?.purpose || "login",
      sendSms: sendOtpSms,
    });

    return sendJson(res, 200, {
      success: true,
      message: "OTP sent successfully",
      ...result,
    });
  } catch (err) {
    return otpError(res, err, "Failed to send OTP");
  }
}

async function verifyOtp(req, res) {
  try {
    const result = checkOtp({
      mobile: req.body?.mobile || req.body?.phone,
      code: req.body?.otp || req.body?.otp_code,
      purpose: req.body?.purpose || "login",
      sessionToken: req.body?.sessionToken || req.body?.session_token,
    });

    return sendJson(res, 200, {
      success: true,
      valid: true,
      message: "OTP verified successfully",
      ...result,
    });
  } catch (err) {
    return otpError(res, err, "OTP verification failed");
  }
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/auth/send-otp", sendOtp);
    originalPost.call(app, "/api/auth/verify-otp", verifyOtp);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/auth/send-otp" || path === "/api/auth/verify-otp") install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[OtpProductionPatch] secure 6 digit SMS OTP active");
} catch (err) {
  console.warn("[OtpProductionPatch] disabled:", err.message);
}

module.exports = {};
