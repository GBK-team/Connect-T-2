/*
 * Nagarsevak login compatibility patch.
 *
 * Loaded before backend/server.js. It guarantees the route used by the mobile
 * Nagarsevak login screen exists, even if the main server route order changes.
 */

let pool = null;
let installed = false;

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizeApproval(value) {
  const status = String(value || "").toLowerCase();
  if (status === "approved" || status === "pending" || status === "rejected") return status;
  return "pending";
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

function mobileSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

async function nagarsevakLogin(req, res) {
  try {
    const db = getPool();
    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);

    if (mobile.length !== 10) {
      return sendJson(res, 400, {
        success: false,
        message: "INVALID_MOBILE",
      });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM users
       WHERE role = 'nagarsevak'
         AND ${mobileSql("mobile")} = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [mobile],
    );

    if (!rows.length) {
      return sendJson(res, 200, {
        success: false,
        message: "NOT_FOUND",
        notFound: true,
      });
    }

    const row = rows[0];
    const approval = normalizeApproval(row.approval_status);

    if (approval === "pending") {
      return sendJson(res, 200, {
        success: false,
        message: "PENDING",
        approvalStatus: "pending",
      });
    }

    if (approval === "rejected") {
      return sendJson(res, 200, {
        success: false,
        message: "REJECTED",
        approvalStatus: "rejected",
      });
    }

    return sendJson(res, 200, {
      success: true,
      user: {
        id: String(row.id || row.nagarsevak_id || mobile),
        name: row.name || "Nagarsevak",
        mobile,
        role: "nagarsevak",
        ward: row.ward || "",
        wardCode: row.ward_code || row.wardCode || null,
        wardNumber: row.ward_number || null,
        address: row.address || row.office_address || row.residence_address || "",
        profilePhoto: row.profile_photo || null,
        isSuperAdmin: !!row.is_super_admin,
        approvalStatus: "approved",
        nagarsevakId: row.nagarsevak_id || row.id || null,
        officeAddress: row.office_address || "",
        residenceAddress: row.residence_address || "",
        officeTimings: row.office_timings || "",
        contactName: row.contact_name || row.name || "",
        contactNumber: normalizeMobile(row.contact_number || row.mobile),
      },
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message || "LOGIN_FAILED",
    });
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
  console.warn("[NagarsevakLoginPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  express.application.post = function patchedPost(path, ...handlers) {
    if (!installed && path === "/api/auth/nagarsevak-login") {
      installed = true;
      originalPost.call(this, path, nagarsevakLogin);
    }

    return originalPost.call(this, path, ...handlers);
  };

  console.log("[NagarsevakLoginPatch] compatibility route active");
} catch (err) {
  console.warn("[NagarsevakLoginPatch] express patch disabled:", err.message);
}
