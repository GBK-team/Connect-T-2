/*
 * Job Portal auth compatibility patch.
 *
 * Loaded before backend/server.js. It keeps login/register reliable on Hostinger
 * and avoids old route validation blocking basic seeker registration before DOB
 * is added from the profile screen.
 */

let pool = null;
let installed = false;

const { signToken, verifyOtpProof, verifyRequestToken } = require("./authSecurity");
const { saveDataUri } = require("./mediaStorage");

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function cleanPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function makeId(role) {
  const prefix = role === "employer" ? "emp" : "seek";
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
    company: row.company,
    contactPerson: row.contact_person,
    gstNo: row.gst_no,
    industry: row.industry,
    website: row.website,
    companyDescription: row.company_description,
    address: row.address,
    pincode: row.pincode,
    whatsapp: row.whatsapp,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

async function ensureSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS job_portal_users (
    id VARCHAR(64) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    name VARCHAR(160) NOT NULL,
    dob DATE NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(190) NULL,
    avatar_color VARCHAR(32) NULL,
    profile_photo LONGTEXT NULL,
    qualification VARCHAR(160) NULL,
    skills TEXT NULL,
    about TEXT NULL,
    current_status VARCHAR(40) NULL,
    experience VARCHAR(80) NULL,
    location VARCHAR(190) NULL,
    languages VARCHAR(190) NULL,
    company VARCHAR(190) NULL,
    contact_person VARCHAR(160) NULL,
    gst_no VARCHAR(64) NULL,
    industry VARCHAR(120) NULL,
    website VARCHAR(190) NULL,
    company_description TEXT NULL,
    address TEXT NULL,
    pincode VARCHAR(20) NULL,
    whatsapp VARCHAR(20) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_job_portal_phone_role (phone, role),
    KEY idx_job_portal_role (role),
    KEY idx_job_portal_phone (phone)
  )`);
}

async function register(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const role = String(req.body?.role || "").trim();
    const phone = cleanPhone(req.body?.phone || req.body?.mobile);
    const name = String(req.body?.name || req.body?.contactPerson || "").trim();

    if (!["seeker", "employer"].includes(role)) return sendJson(res, 400, { success: false, error: "Valid role is required" });
    if (phone.length !== 10) return sendJson(res, 400, { success: false, error: "Enter a valid 10 digit contact number" });
    if (!verifyOtpProof(req, phone, ["register"])) {
      return sendJson(res, 401, { success: false, error: "Verified OTP is required to register" });
    }
    if (name.split(/\s+/).filter(Boolean).length < 2) return sendJson(res, 400, { success: false, error: "Enter your full name, including surname" });
    if (role === "employer" && !String(req.body?.company || "").trim()) return sendJson(res, 400, { success: false, error: "Company name is required" });

    const id = req.body?.id || makeId(role);
    const profilePhoto = await saveDataUri(
      req.body?.profilePhoto || req.body?.profile_photo,
      "job_profile",
      req,
    );
    await db.query(
      `INSERT INTO job_portal_users
       (id, role, name, dob, phone, email, avatar_color, profile_photo, qualification, skills, about, current_status, experience, location, languages, company, contact_person, gst_no, industry, website, company_description, address, pincode, whatsapp, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name), location=VALUES(location), company=VALUES(company), contact_person=VALUES(contact_person), whatsapp=VALUES(whatsapp), address=VALUES(address), updated_at=CURRENT_TIMESTAMP`,
      [
        id,
        role,
        name,
        req.body?.dob || null,
        phone,
        req.body?.email || null,
        req.body?.avatarColor || req.body?.avatar_color || randomColor(),
        profilePhoto || null,
        req.body?.qualification || null,
        req.body?.skills || null,
        req.body?.about || null,
        req.body?.currentStatus || req.body?.current_status || (role === "seeker" ? "unemployed" : null),
        req.body?.experience || null,
        req.body?.location || req.body?.address || null,
        req.body?.languages || null,
        req.body?.company || null,
        req.body?.contactPerson || req.body?.contact_person || (role === "employer" ? name : null),
        req.body?.gstNo || req.body?.gst_no || null,
        req.body?.industry || null,
        req.body?.website || null,
        req.body?.companyDescription || req.body?.company_description || null,
        req.body?.address || req.body?.location || null,
        req.body?.pincode || null,
        req.body?.whatsapp || phone,
        req.body?.latitude || null,
        req.body?.longitude || null,
      ],
    );

    const [rows] = await db.query("SELECT * FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1", [phone, role]);
    const user = userPayload(rows[0]);
    return sendJson(res, 201, {
      success: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

async function login(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const role = String(req.body?.role || "").trim();
    const phone = cleanPhone(req.body?.phone || req.body?.mobile);
    if (!["seeker", "employer"].includes(role)) return sendJson(res, 400, { success: false, error: "Valid role is required" });
    if (phone.length !== 10) return sendJson(res, 400, { success: false, error: "Enter a valid 10 digit contact number" });
    if (!verifyOtpProof(req, phone, ["login"])) {
      return sendJson(res, 401, { success: false, error: "Verified OTP is required to login" });
    }

    const [rows] = await db.query("SELECT * FROM job_portal_users WHERE phone = ? AND role = ? LIMIT 1", [phone, role]);
    if (!rows.length) return sendJson(res, 404, { success: false, error: "Account not found. Please register first." });
    const user = userPayload(rows[0]);
    return sendJson(res, 200, {
      success: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message });
  }
}

async function unifiedSession(req, res) {
  try {
    const db = getPool();
    await ensureSchema(db);
    const auth = verifyRequestToken(req);
    if (!auth?.sub || auth.scope === "job_portal") {
      return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    }

    const [civicRows] = await db.query(
      `SELECT id, name, mobile, dob, email, address, profile_photo, role
       FROM users WHERE id = ? LIMIT 1`,
      [auth.sub],
    );
    const civicUser = civicRows[0];
    if (!civicUser || civicUser.role !== "citizen") {
      return sendJson(res, 403, { success: false, message: "Job Portal is available from a citizen account." });
    }

    const phone = cleanPhone(civicUser.mobile);
    const requestedRole = String(req.body?.role || "").trim();
    if (requestedRole && !["seeker", "employer"].includes(requestedRole)) {
      return sendJson(res, 400, { success: false, message: "Choose Job Seeker or Employer." });
    }

    const params = [phone];
    let lookup = "SELECT * FROM job_portal_users WHERE phone = ?";
    if (requestedRole) {
      lookup += " AND role = ?";
      params.push(requestedRole);
    }
    lookup += " ORDER BY updated_at DESC LIMIT 1";
    let [jobRows] = await db.query(lookup, params);

    if (!jobRows.length && !requestedRole) {
      return sendJson(res, 404, { success: false, code: "JOB_PROFILE_REQUIRED", message: "Choose how you want to use the Job Portal." });
    }

    if (!jobRows.length) {
      const name = String(req.body?.name || civicUser.name || "").trim();
      if (name.split(/\s+/).filter(Boolean).length < 2) {
        return sendJson(res, 400, { success: false, message: "Enter your full name, including surname." });
      }
      const company = String(req.body?.company || "").trim();
      if (requestedRole === "employer" && company.length < 2) {
        return sendJson(res, 400, { success: false, message: "Company or business name is required." });
      }

      const id = makeId(requestedRole);
      await db.query(
        `INSERT INTO job_portal_users
         (id, role, name, dob, phone, email, avatar_color, profile_photo, current_status,
          location, company, contact_person, address, whatsapp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          requestedRole,
          name,
          civicUser.dob || null,
          phone,
          civicUser.email || null,
          req.body?.avatarColor || randomColor(),
          civicUser.profile_photo || null,
          requestedRole === "seeker" ? "unemployed" : null,
          req.body?.location || civicUser.address || null,
          requestedRole === "employer" ? company : null,
          requestedRole === "employer" ? String(req.body?.contactPerson || name).trim() : null,
          req.body?.address || req.body?.location || civicUser.address || null,
          requestedRole === "employer" ? phone : null,
        ],
      );
      [jobRows] = await db.query("SELECT * FROM job_portal_users WHERE id = ? LIMIT 1", [id]);
    }

    const user = userPayload(jobRows[0]);
    return sendJson(res, 200, {
      success: true,
      user,
      token: signToken({ sub: user.id, mobile: user.phone, role: user.role, scope: "job_portal" }),
    });
  } catch (err) {
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
  console.warn("[JobPortalAuthPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalPost = express.application.post;
  function install(app) {
    if (installed) return;
    installed = true;
    originalPost.call(app, "/api/job-portal/register", register);
    originalPost.call(app, "/api/job-portal/login", login);
    originalPost.call(app, "/api/job-portal/session", unifiedSession);
  }
  express.application.post = function patchedPost(path, ...handlers) {
    if (path === "/api/job-portal/register" || path === "/api/job-portal/login" || path === "/api/job-portal/session") install(this);
    return originalPost.call(this, path, ...handlers);
  };
  console.log("[JobPortalAuthPatch] reliable login/register routes active");
} catch (err) {
  console.warn("[JobPortalAuthPatch] express patch disabled:", err.message);
}

module.exports = {};
