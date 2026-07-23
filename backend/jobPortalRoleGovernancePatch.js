/*
 * Connect-T Job Portal role governance.
 *
 * Enforces one active Job Portal role per verified citizen mobile number,
 * prevents direct role switching, and provides an audited Super Admin approval
 * workflow for genuine role-correction requests.
 */

"use strict";

const crypto = require("crypto");
const { signToken, verifyRequestToken } = require("./authSecurity");

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function cleanText(value, maxLength = 500) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function randomColor() {
  const colors = ["#C2410C", "#EA580C", "#F97316", "#FB923C", "#B45309", "#92400E"];
  return colors[Math.floor(Math.random() * colors.length)];
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

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

async function ensureSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_role_locks (
    phone VARCHAR(20) PRIMARY KEY,
    active_user_id VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_jp_role_lock_user (active_user_id),
    KEY idx_jp_role_lock_role (role)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_role_change_requests (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    current_role VARCHAR(20) NOT NULL,
    target_role VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_note TEXT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    reviewed_by VARCHAR(64) NULL,
    KEY idx_jp_role_req_phone (phone),
    KEY idx_jp_role_req_status (status),
    KEY idx_jp_role_req_requested (requested_at)
  )`);
}

async function civicCitizenFromRequest(db, req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return { error: "LOGIN_REQUIRED" };

  const [rows] = await db.query(
    `SELECT id, name, mobile, dob, email, address, profile_photo, role
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  const user = rows[0];
  if (!user || user.role !== "citizen") return { error: "CITIZEN_REQUIRED" };
  return { auth, user, phone: cleanPhone(user.mobile) };
}

async function activeProfileForPhone(db, phone) {
  const [lockRows] = await db.query(
    "SELECT phone, active_user_id, role FROM job_portal_role_locks WHERE phone = ? LIMIT 1",
    [phone],
  );

  if (lockRows.length) {
    const lock = lockRows[0];
    const [profileRows] = await db.query(
      "SELECT * FROM job_portal_users WHERE id = ? AND phone = ? LIMIT 1",
      [lock.active_user_id, phone],
    );
    if (profileRows.length) return { lock, profile: profileRows[0] };
    await db.query("DELETE FROM job_portal_role_locks WHERE phone = ?", [phone]);
  }

  const [profileRows] = await db.query(
    "SELECT * FROM job_portal_users WHERE phone = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1",
    [phone],
  );
  if (!profileRows.length) return { lock: null, profile: null };

  const profile = profileRows[0];
  await db.query(
    `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
    [phone, profile.id, profile.role],
  );
  return {
    lock: { phone, active_user_id: profile.id, role: profile.role },
    profile,
  };
}

async function unifiedSession(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const civic = await civicCitizenFromRequest(db, req);
    if (civic.error === "LOGIN_REQUIRED") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }
    if (civic.error) {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const requestedRole = cleanText(req.body?.role, 20);
    if (requestedRole && !["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, message: "Choose Job Seeker or Employer." });
    }

    const active = await activeProfileForPhone(db, civic.phone);
    if (!active.profile) {
      return sendJson(res, 404, {
        success: false,
        code: "JOB_PROFILE_REQUIRED",
        message: "Choose how you want to use the Job Portal.",
      });
    }

    if (requestedRole && requestedRole !== active.profile.role) {
      return sendJson(res, 409, {
        success: false,
        code: "JOB_ROLE_LOCKED",
        message: `Your Job Portal role is locked as ${active.profile.role === "employer" ? "Employer" : "Job Seeker"}. Submit a role-change request for Super Admin review.`,
      });
    }

    const user = userPayload(active.profile);
    return sendJson(res, 200, {
      success: true,
      roleLocked: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    console.warn("[JobPortalRoleGovernance] session failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Job Portal could not be opened right now." });
  }
}

async function onboarding(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const civic = await civicCitizenFromRequest(db, req);
    if (civic.error === "LOGIN_REQUIRED") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }
    if (civic.error) {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const role = cleanText(req.body?.role, 20);
    if (!["seeker", "employer"].includes(role)) {
      return sendJson(res, 400, { success: false, message: "Choose Job Seeker or Employer." });
    }

    const active = await activeProfileForPhone(db, civic.phone);
    if (active.profile && active.profile.role !== role) {
      return sendJson(res, 409, {
        success: false,
        code: "JOB_ROLE_LOCKED",
        message: `Your Job Portal role is already locked as ${active.profile.role === "employer" ? "Employer" : "Job Seeker"}.`,
      });
    }

    const name = cleanText(req.body?.name || civic.user.name, 160);
    const location = cleanText(req.body?.location || req.body?.address || civic.user.address, 190);
    if (civic.phone.length !== 10) return sendJson(res, 400, { success: false, message: "Your Connect T mobile number is not valid." });
    if (name.split(/\s+/).filter(Boolean).length < 2) return sendJson(res, 400, { success: false, message: "Enter your full name, including surname." });
    if (location.length < 3) return sendJson(res, 400, { success: false, message: role === "employer" ? "Enter your business location." : "Enter your preferred work location." });

    const qualification = cleanText(req.body?.qualification, 160);
    const skills = cleanText(req.body?.skills, 1200);
    const about = cleanText(req.body?.about, 1200);
    const experience = cleanText(req.body?.experience, 500);
    const languages = cleanText(req.body?.languages, 190);
    const company = cleanText(req.body?.company, 190);
    const contactPerson = cleanText(req.body?.contactPerson || name, 160);
    const industry = cleanText(req.body?.industry, 120);
    const companyDescription = cleanText(req.body?.companyDescription, 1500);
    const address = cleanText(req.body?.address || location, 1500);
    const whatsapp = cleanPhone(req.body?.whatsapp || civic.phone);
    const allowedStatuses = new Set(["employed", "unemployed", "student", "fresher"]);
    const requestedStatus = cleanText(req.body?.currentStatus, 40);
    const currentStatus = role === "seeker" && allowedStatuses.has(requestedStatus) ? requestedStatus : role === "seeker" ? "fresher" : "";

    if (role === "seeker" && qualification.length < 2) return sendJson(res, 400, { success: false, message: "Add your qualification." });
    if (role === "seeker" && skills.length < 2) return sendJson(res, 400, { success: false, message: "Add at least one skill." });
    if (role === "seeker" && about.length < 2) return sendJson(res, 400, { success: false, message: "Add your preferred job category." });
    if (role === "employer" && company.length < 2) return sendJson(res, 400, { success: false, message: "Enter your company, shop, or business name." });
    if (role === "employer" && industry.length < 2) return sendJson(res, 400, { success: false, message: "Add your business type or industry." });
    if (role === "employer" && about.length < 2) return sendJson(res, 400, { success: false, message: "Add the job categories you plan to hire for." });
    if (role === "employer" && companyDescription.length < 10) return sendJson(res, 400, { success: false, message: "Add a short description of your business." });

    const id = active.profile?.id || makeId(role === "employer" ? "emp" : "seek");
    await db.query(
      `INSERT INTO job_portal_users
       (id, role, name, dob, phone, email, avatar_color, profile_photo,
        qualification, skills, about, current_status, experience, location,
        languages, company, contact_person, industry, company_description,
        address, whatsapp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name), qualification = VALUES(qualification), skills = VALUES(skills),
         about = VALUES(about), current_status = VALUES(current_status), experience = VALUES(experience),
         location = VALUES(location), languages = VALUES(languages), company = VALUES(company),
         contact_person = VALUES(contact_person), industry = VALUES(industry),
         company_description = VALUES(company_description), address = VALUES(address),
         whatsapp = VALUES(whatsapp), updated_at = CURRENT_TIMESTAMP`,
      [
        id, role, name, civic.user.dob || null, civic.phone, civic.user.email || null,
        active.profile?.avatar_color || randomColor(), civic.user.profile_photo || active.profile?.profile_photo || null,
        role === "seeker" ? qualification : null,
        role === "seeker" ? skills || null : null,
        about || null,
        currentStatus || null,
        role === "seeker" ? experience || null : null,
        location,
        role === "seeker" ? languages || null : null,
        role === "employer" ? company : null,
        role === "employer" ? contactPerson : null,
        role === "employer" ? industry : null,
        role === "employer" ? companyDescription : null,
        address,
        role === "employer" ? whatsapp || civic.phone : null,
      ],
    );

    await db.query(
      `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
      [civic.phone, id, role],
    );

    const [rows] = await db.query("SELECT * FROM job_portal_users WHERE id = ? LIMIT 1", [id]);
    const user = userPayload(rows[0]);
    return sendJson(res, active.profile ? 200 : 201, {
      success: true,
      roleLocked: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    console.warn("[JobPortalRoleGovernance] onboarding failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Job profile could not be saved right now. Please try again after some time." });
  }
}

async function requestRoleChange(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope !== "job_portal") {
      return sendJson(res, 401, { success: false, message: "Open the Job Portal and try again." });
    }

    const [profileRows] = await db.query("SELECT * FROM job_portal_users WHERE id = ? LIMIT 1", [auth.sub]);
    const profile = profileRows[0];
    if (!profile) return sendJson(res, 404, { success: false, message: "Job Portal profile was not found." });

    const active = await activeProfileForPhone(db, cleanPhone(profile.phone));
    if (!active.profile || active.profile.id !== profile.id) {
      return sendJson(res, 409, { success: false, code: "JOB_SESSION_OUTDATED", message: "Your active Job Portal role changed. Reopen the Job Portal and try again." });
    }

    const targetRole = cleanText(req.body?.targetRole, 20);
    const reason = cleanText(req.body?.reason, 800);
    if (!["seeker", "employer"].includes(targetRole) || targetRole === profile.role) {
      return sendJson(res, 400, { success: false, message: "Choose the other Job Portal role." });
    }
    if (reason.length < 10) return sendJson(res, 400, { success: false, message: "Explain why you need this role change in at least 10 characters." });

    const [pendingRows] = await db.query(
      "SELECT id FROM job_portal_role_change_requests WHERE phone = ? AND status = 'pending' LIMIT 1",
      [cleanPhone(profile.phone)],
    );
    if (pendingRows.length) {
      return sendJson(res, 409, { success: false, code: "ROLE_CHANGE_PENDING", message: "Your role-change request is already pending Super Admin review." });
    }

    const id = makeId("role");
    await db.query(
      `INSERT INTO job_portal_role_change_requests
       (id, phone, user_id, current_role, target_role, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, cleanPhone(profile.phone), profile.id, profile.role, targetRole, reason],
    );
    return sendJson(res, 201, {
      success: true,
      request: { id, currentRole: profile.role, targetRole, reason, status: "pending" },
      message: "Your request was sent to the Super Admin for review.",
    });
  } catch (err) {
    console.warn("[JobPortalRoleGovernance] request failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Role-change request could not be submitted right now." });
  }
}

async function myRoleChangeRequest(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope !== "job_portal") return sendJson(res, 401, { success: false, message: "Open the Job Portal and try again." });
    const [rows] = await db.query(
      `SELECT id, current_role AS currentRole, target_role AS targetRole, reason, status,
              admin_note AS adminNote, requested_at AS requestedAt, reviewed_at AS reviewedAt
       FROM job_portal_role_change_requests
       WHERE user_id = ? ORDER BY requested_at DESC LIMIT 1`,
      [auth.sub],
    );
    return sendJson(res, 200, { success: true, request: rows[0] || null });
  } catch (err) {
    return sendJson(res, 500, { success: false, message: "Role-change status could not be loaded right now." });
  }
}

async function requireSuperAdmin(db, req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal" || auth.role !== "super_admin") return null;
  const [rows] = await db.query("SELECT id, role, is_super_admin FROM users WHERE id = ? LIMIT 1", [auth.sub]);
  const user = rows[0];
  return user && (user.role === "super_admin" || user.is_super_admin === 1) ? { auth, user } : null;
}

async function listRoleChangeRequests(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const admin = await requireSuperAdmin(db, req);
    if (!admin) return sendJson(res, 403, { success: false, message: "Super Admin access is required." });

    const requestedStatus = cleanText(req.query?.status, 20);
    const allowed = new Set(["pending", "approved", "rejected"]);
    const params = [];
    let where = "";
    if (allowed.has(requestedStatus)) {
      where = "WHERE r.status = ?";
      params.push(requestedStatus);
    }

    const [rows] = await db.query(
      `SELECT r.id, r.phone, r.user_id AS userId, r.current_role AS currentRole,
              r.target_role AS targetRole, r.reason, r.status, r.admin_note AS adminNote,
              r.requested_at AS requestedAt, r.reviewed_at AS reviewedAt,
              p.name, p.company, p.qualification
       FROM job_portal_role_change_requests r
       LEFT JOIN job_portal_users p ON p.id = r.user_id
       ${where}
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.requested_at DESC
       LIMIT 250`,
      params,
    );
    return sendJson(res, 200, { success: true, requests: rows });
  } catch (err) {
    console.warn("[JobPortalRoleGovernance] admin list failed:", err.message);
    return sendJson(res, 500, { success: false, message: "Role-change requests could not be loaded right now." });
  }
}

async function reviewRoleChangeRequest(req, res) {
  const db = getPool();
  let connection;
  try {
    await ensureSchema(db);
    const admin = await requireSuperAdmin(db, req);
    if (!admin) return sendJson(res, 403, { success: false, message: "Super Admin access is required." });

    const action = cleanText(req.body?.action, 20);
    const adminNote = cleanText(req.body?.adminNote, 800);
    if (!["approve", "reject"].includes(action)) {
      return sendJson(res, 400, { success: false, message: "Choose approve or reject." });
    }

    connection = typeof db.getConnection === "function" ? await db.getConnection() : db;
    if (connection.beginTransaction) await connection.beginTransaction();

    const [requestRows] = await connection.query(
      "SELECT * FROM job_portal_role_change_requests WHERE id = ? LIMIT 1 FOR UPDATE",
      [req.params.id],
    );
    const request = requestRows[0];
    if (!request) {
      if (connection.rollback) await connection.rollback();
      return sendJson(res, 404, { success: false, message: "Role-change request was not found." });
    }
    if (request.status !== "pending") {
      if (connection.rollback) await connection.rollback();
      return sendJson(res, 409, { success: false, message: "This request has already been reviewed." });
    }

    if (action === "reject") {
      await connection.query(
        `UPDATE job_portal_role_change_requests
         SET status = 'rejected', admin_note = ?, reviewed_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
        [adminNote || "Request rejected after review.", admin.user.id, request.id],
      );
      if (connection.commit) await connection.commit();
      return sendJson(res, 200, { success: true, status: "rejected" });
    }

    const [activeRows] = await connection.query(
      "SELECT * FROM job_portal_users WHERE id = ? AND phone = ? LIMIT 1",
      [request.user_id, request.phone],
    );
    const currentProfile = activeRows[0];
    if (!currentProfile) throw new Error("Active profile missing");

    const [targetRows] = await connection.query(
      "SELECT * FROM job_portal_users WHERE phone = ? AND role = ? ORDER BY updated_at DESC LIMIT 1",
      [request.phone, request.target_role],
    );

    let targetProfile = targetRows[0];
    if (!targetProfile) {
      if (request.target_role === "seeker") {
        await connection.query(
          `UPDATE job_portal_users SET role = 'seeker',
             company = NULL, contact_person = NULL, gst_no = NULL, industry = NULL,
             website = NULL, company_description = NULL, company_type = NULL,
             company_size = NULL, year_established = NULL, whatsapp = NULL,
             current_status = COALESCE(current_status, 'unemployed'), updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [currentProfile.id],
        );
      } else {
        await connection.query(
          `UPDATE job_portal_users SET role = 'employer',
             qualification = NULL, skills = NULL, current_status = NULL,
             experience = NULL, languages = NULL, current_company = NULL,
             current_role = NULL, previous_company = NULL, previous_role = NULL,
             college_name = NULL, field_of_study = NULL,
             contact_person = COALESCE(contact_person, name), whatsapp = COALESCE(whatsapp, phone),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [currentProfile.id],
        );
      }
      const [updatedRows] = await connection.query("SELECT * FROM job_portal_users WHERE id = ? LIMIT 1", [currentProfile.id]);
      targetProfile = updatedRows[0];
    }

    await connection.query(
      `INSERT INTO job_portal_role_locks (phone, active_user_id, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE active_user_id = VALUES(active_user_id), role = VALUES(role), updated_at = CURRENT_TIMESTAMP`,
      [request.phone, targetProfile.id, request.target_role],
    );

    if (request.current_role === "employer" && request.target_role === "seeker") {
      await connection.query("UPDATE job_portal_jobs SET active = 0 WHERE employer_id = ?", [currentProfile.id]);
      await connection.query("UPDATE jobs SET active = 0 WHERE employer_id = ?", [currentProfile.id]);
    }

    await connection.query(
      `UPDATE job_portal_role_change_requests
       SET status = 'approved', admin_note = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [adminNote || "Role change approved.", admin.user.id, request.id],
    );

    if (connection.commit) await connection.commit();
    return sendJson(res, 200, {
      success: true,
      status: "approved",
      activeRole: request.target_role,
      activeUserId: targetProfile.id,
    });
  } catch (err) {
    if (connection?.rollback) await connection.rollback().catch(() => undefined);
    console.warn("[JobPortalRoleGovernance] review failed:", err.message);
    return sendJson(res, 500, { success: false, message: "This role-change request could not be reviewed right now." });
  } finally {
    if (connection && connection !== db && typeof connection.release === "function") connection.release();
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
  console.warn("[JobPortalRoleGovernance] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/session", unifiedSession);
    originalPost.call(app, "/api/job-portal/onboarding", onboarding);
    originalPost.call(app, "/api/job-portal/role-change-requests", requestRoleChange);
    originalGet.call(app, "/api/job-portal/role-change-requests/me", myRoleChangeRequest);
    originalGet.call(app, "/api/job-portal/admin/role-change-requests", listRoleChangeRequests);
    originalPatch.call(app, "/api/job-portal/admin/role-change-requests/:id", reviewRoleChangeRequest);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };
  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };
  express.application.patch = function patchedPatch(path, ...handlers) {
    install(this);
    return originalPatch.call(this, path, ...handlers);
  };

  console.log("[JobPortalRoleGovernance] one-role lock and admin review routes active");
} catch (err) {
  console.warn("[JobPortalRoleGovernance] express patch disabled:", err.message);
}

module.exports = {};
