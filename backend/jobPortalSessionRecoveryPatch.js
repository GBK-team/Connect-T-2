/*
 * Returning-user Job Portal session recovery.
 *
 * The server-side role lock is authoritative. A stale role cached on a device is
 * ignored so an approved role correction opens the correct dashboard directly.
 */

"use strict";

const { signToken, verifyRequestToken } = require("./authSecurity");

let pool = null;
let installed = false;

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function userPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    dob: row.dob,
    phone: cleanPhone(row.phone),
    email: row.email,
    avatarColor: row.avatar_color,
    profilePhoto: row.profile_photo,
    qualification: row.qualification,
    skills: row.skills,
    about: row.about,
    currentStatus: row.current_status,
    experience: row.experience,
    location: row.location,
    languages: row.languages,
    currentCompany: row.current_company,
    currentRole: row.current_role,
    previousCompany: row.previous_company,
    previousRole: row.previous_role,
    collegeName: row.college_name,
    fieldOfStudy: row.field_of_study,
    company: row.company,
    contactPerson: row.contact_person,
    gstNo: row.gst_no,
    industry: row.industry,
    website: row.website,
    companyDescription: row.company_description,
    companyType: row.company_type,
    companySize: row.company_size,
    yearEstablished: row.year_established,
    address: row.address,
    pincode: row.pincode,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureLockSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_role_locks (
    phone VARCHAR(20) PRIMARY KEY,
    active_user_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_jp_role_lock_user (active_user_id),
    KEY idx_jp_role_lock_role (role)
  )`);
}

async function session(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureLockSchema(pool);
    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const [civicRows] = await pool.query(
      "SELECT id, mobile, role FROM users WHERE id = ? LIMIT 1",
      [auth.sub],
    );
    const civicUser = civicRows[0];
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const phone = cleanPhone(civicUser.mobile);
    const [lockRows] = await pool.query(
      "SELECT active_user_id, role FROM job_portal_role_locks WHERE phone = ? LIMIT 1",
      [phone],
    );

    let profileRows = [];
    if (lockRows.length) {
      [profileRows] = await pool.query(
        "SELECT * FROM job_portal_users WHERE id = ? AND phone = ? LIMIT 1",
        [lockRows[0].active_user_id, phone],
      );
    }

    if (!profileRows.length) {
      [profileRows] = await pool.query(
        "SELECT * FROM job_portal_users WHERE phone = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
        [phone],
      );
      if (profileRows.length) {
        await pool.query(
          `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
          [phone, profileRows[0].id, profileRows[0].role],
        );
      }
    }

    if (!profileRows.length) {
      return sendJson(res, 404, {
        success: false,
        code: "JOB_PROFILE_REQUIRED",
        message: "Choose how you want to use the Job Portal.",
      });
    }

    const user = userPayload(profileRows[0]);
    return sendJson(res, 200, {
      success: true,
      roleLocked: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    console.warn("[JobPortalSessionRecovery] session failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Job Portal could not be opened right now." });
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
  console.warn("[JobPortalSessionRecovery] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/session", session);
  }

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };

  console.log("[JobPortalSessionRecovery] authoritative role session active");
} catch (err) {
  console.warn("[JobPortalSessionRecovery] express patch disabled:", err.message);
}

module.exports = {};
