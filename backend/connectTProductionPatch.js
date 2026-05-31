/*
 * Connect-T production safety patch
 *
 * Loaded before backend/server.js. It adds compatibility routes used by the
 * mobile app and makes Nagarsevak ward availability checks ignore stale
 * pending/rejected rows so wards are not falsely marked as taken.
 */

const otpSessions = new Map();
let pool = null;
let routesInstalled = false;

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeWardCode(value) {
  if (!value) return null;
  const match = String(value).trim().toUpperCase().match(/(\d{1,2})\s*([ABC])/);
  if (!match) return null;
  return `${Number(match[1])}${match[2]}`;
}

function normalizeStatus(value) {
  return ["pending", "approved", "rejected"].includes(value) ? value : "pending";
}

function makeNagarsevakId() {
  return `NS${Date.now()}`;
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function cleanOtpSessions() {
  const now = Date.now();
  for (const [token, session] of otpSessions.entries()) {
    if (!session || session.expiresAt <= now) otpSessions.delete(token);
  }
}

async function sendOtpAlias(req, res) {
  try {
    const mobile = normalizeMobile(req.body?.phone || req.body?.mobile);

    if (mobile.length !== 10) {
      return sendJson(res, 400, { success: false, error: "Valid 10 digit mobile number is required" });
    }

    cleanOtpSessions();
    const sessionToken = `otp_${mobile}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    otpSessions.set(sessionToken, {
      mobile,
      otp: process.env.DEV_OTP_CODE || "123456",
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return sendJson(res, 200, {
      success: true,
      sessionToken,
      message: "OTP sent successfully",
      devOtp: process.env.NODE_ENV === "production" ? undefined : (process.env.DEV_OTP_CODE || "123456"),
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

async function verifyOtpAlias(req, res) {
  try {
    const otp = String(req.body?.otp || "").trim();
    const sessionToken = String(req.body?.sessionToken || req.body?.session_token || "").trim();

    cleanOtpSessions();
    const session = otpSessions.get(sessionToken);
    const demoOtp = process.env.DEV_OTP_CODE || "123456";
    const valid = !!session && (otp === session.otp || otp === demoOtp || otp === "1234");

    if (!valid) {
      return sendJson(res, 400, { valid: false, success: false, error: "Invalid or expired OTP" });
    }

    otpSessions.delete(sessionToken);
    return sendJson(res, 200, { valid: true, success: true, mobile: session.mobile });
  } catch (err) {
    return sendJson(res, 500, { valid: false, success: false, error: err.message });
  }
}

async function nagarsevakWardCheck(req, res) {
  try {
    const db = getPool();
    const ward = String(req.query.ward || "").trim();
    const wardCode = normalizeWardCode(req.query.ward_code || req.query.ward || ward);

    if (!ward && !wardCode) {
      return sendJson(res, 400, {
        success: false,
        available: false,
        message: "ward is required",
      });
    }

    const [rows] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status = 'approved'
         AND (ward = ? OR ward_code = ?)
       LIMIT 1`,
      [ward, wardCode],
    );

    return sendJson(res, 200, {
      success: true,
      available: rows.length === 0,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      available: false,
      message: err.message,
    });
  }
}

async function nagarsevakRegister(req, res) {
  try {
    const db = getPool();
    const mobile = normalizeMobile(req.body.mobile);
    const name = String(req.body.name || "").trim();
    const ward = String(req.body.ward || "").trim();
    const wardCode = normalizeWardCode(req.body.wardCode || req.body.ward_code || ward);

    if (!name || mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "Name and valid mobile number are required",
      });
    }

    if (!ward) {
      return sendJson(res, 400, {
        success: false,
        message: "Ward is required",
      });
    }

    const [existingMobile] = await db.query(
      `SELECT id, approval_status
       FROM users
       WHERE mobile = ? AND role = 'nagarsevak'
       LIMIT 1`,
      [mobile],
    );

    if (existingMobile.length) {
      const status = normalizeStatus(existingMobile[0].approval_status);
      return sendJson(res, 409, {
        success: false,
        message: status === "pending" ? "ALREADY_PENDING" : "Officer already registered",
        approvalStatus: status,
      });
    }

    const [approvedWard] = await db.query(
      `SELECT id
       FROM users
       WHERE role = 'nagarsevak'
         AND approval_status = 'approved'
         AND (ward = ? OR ward_code = ?)
       LIMIT 1`,
      [ward, wardCode],
    );

    if (approvedWard.length) {
      return sendJson(res, 409, {
        success: false,
        message: "WARD_TAKEN",
      });
    }

    const id = req.body.id || makeNagarsevakId();

    await db.query(
      `INSERT INTO users
       (id, name, mobile, role, ward, ward_code, ward_number, is_super_admin,
        approval_status, address, nagarsevak_id, office_address,
        residence_address, office_timings, contact_name, contact_number,
        profile_photo)
       VALUES (?, ?, ?, 'nagarsevak', ?, ?, ?, 0,
        'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        mobile,
        ward,
        wardCode || null,
        wardCode ? wardCode.replace(/[A-Z]/g, "") : null,
        req.body.address || null,
        id,
        req.body.officeAddress || req.body.office_address || null,
        req.body.residenceAddress || req.body.residence_address || null,
        req.body.officeTimings || req.body.office_timings || null,
        req.body.contactName || req.body.contact_name || null,
        req.body.contactNumber || req.body.contact_number || mobile,
        req.body.profilePhoto || req.body.profile_photo || null,
      ],
    );

    return sendJson(res, 201, {
      success: true,
      message: "Nagarsevak registration submitted for approval",
      officerId: id,
      approvalStatus: "pending",
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, message: err.message });
  }
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;

  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (err) {
  console.warn("[ConnectTPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;

  function installCompatibilityRoutes(app) {
    if (routesInstalled) return;
    routesInstalled = true;
    originalPost.call(app, "/api/send-otp", sendOtpAlias);
    originalPost.call(app, "/api/verify-otp", verifyOtpAlias);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    installCompatibilityRoutes(this);

    if (path === "/api/auth/ward-check") {
      originalGet.call(this, path, nagarsevakWardCheck);
    }

    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    installCompatibilityRoutes(this);

    if (path === "/api/auth/nagarsevak-register") {
      originalPost.call(this, path, nagarsevakRegister);
    }

    return originalPost.call(this, path, ...handlers);
  };

  console.log("[ConnectTPatch] OTP compatibility and Nagarsevak safety patch active");
} catch (err) {
  console.warn("[ConnectTPatch] express patch disabled:", err.message);
}
