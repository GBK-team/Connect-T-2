/*
 * Super Admin DB authority patch.
 *
 * Loaded before backend/server.js. This patch makes Super Admin login DB-driven:
 * - seeds 9370796604 once as SUPER_ADMIN_MAIN when the row is missing,
 * - allows any users row marked role='super_admin' or is_super_admin=1 to login without a frontend hardcode,
 * - persists access-code Super Admins into the users table,
 * - registers its route before older compatibility routes by using app.route().post().
 */

let pool = null;
let installed = false;
let columnsEnsured = false;
let defaultSuperAdminEnsured = false;

const DEFAULT_SUPER_ADMIN_ID = "SUPER_ADMIN_MAIN";
const DEFAULT_SUPER_ADMIN_MOBILE = "9370796604";

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function mobileSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column},''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  return res.status(status).json(payload);
}

function getPool() {
  if (!pool) throw new Error("Database pool is not ready");
  return pool;
}

async function ensureColumn(db, table, column, definition) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column],
  );

  if (!rows.length) {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureUsersTable(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'citizen',
    ward VARCHAR(80) NULL,
    ward_code VARCHAR(20) NULL,
    ward_number VARCHAR(20) NULL,
    is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
    approval_status VARCHAR(30) NOT NULL DEFAULT 'approved',
    age INT NULL,
    email VARCHAR(190) NULL,
    address TEXT NULL,
    nagarsevak_id VARCHAR(80) NULL,
    avatar_color VARCHAR(40) NULL,
    profile_photo LONGTEXT NULL,
    notify_email TINYINT(1) NOT NULL DEFAULT 0,
    notify_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
    office_address TEXT NULL,
    residence_address TEXT NULL,
    office_timings VARCHAR(160) NULL,
    contact_name VARCHAR(160) NULL,
    contact_number VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_users_mobile_role (mobile, role),
    KEY idx_users_role (role),
    KEY idx_users_mobile (mobile),
    KEY idx_users_approval_status (approval_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function ensureUsersColumns(db) {
  if (columnsEnsured) return;
  await ensureUsersTable(db);
  await ensureColumn(db, "users", "role", "VARCHAR(30) NOT NULL DEFAULT 'citizen'");
  await ensureColumn(db, "users", "ward", "VARCHAR(80) NULL");
  await ensureColumn(db, "users", "ward_code", "VARCHAR(20) NULL");
  await ensureColumn(db, "users", "ward_number", "VARCHAR(20) NULL");
  await ensureColumn(db, "users", "is_super_admin", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumn(db, "users", "approval_status", "VARCHAR(30) NOT NULL DEFAULT 'approved'");
  await ensureColumn(db, "users", "nagarsevak_id", "VARCHAR(80) NULL");
  await ensureColumn(db, "users", "avatar_color", "VARCHAR(40) NULL");
  await ensureColumn(db, "users", "contact_name", "VARCHAR(160) NULL");
  await ensureColumn(db, "users", "contact_number", "VARCHAR(30) NULL");
  columnsEnsured = true;
}

async function ensureSuperAdminAccessTable(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS super_admin_access_codes (
    id VARCHAR(100) PRIMARY KEY,
    access_code VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_super_admin_access_code (access_code),
    KEY idx_super_admin_mobile (mobile),
    KEY idx_super_admin_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function ensureDefaultSuperAdmin(db) {
  if (defaultSuperAdminEnsured) return;
  await ensureUsersColumns(db);

  await db.query(
    `INSERT IGNORE INTO users
     (id, name, mobile, role, ward, ward_code, ward_number, is_super_admin,
      approval_status, nagarsevak_id, avatar_color, contact_name, contact_number,
      notify_email, notify_whatsapp)
     VALUES (?, 'Super Admin', ?, 'super_admin', 'All Wards', NULL, NULL, 1,
      'approved', ?, '#16A34A', 'Super Admin', ?, 0, 0)`,
    [DEFAULT_SUPER_ADMIN_ID, DEFAULT_SUPER_ADMIN_MOBILE, DEFAULT_SUPER_ADMIN_ID, DEFAULT_SUPER_ADMIN_MOBILE],
  );

  defaultSuperAdminEnsured = true;
}

function mapSuperAdmin(row, fallbackMobile, fallbackAccessCode) {
  const mobile = normalizeMobile(row.mobile || fallbackMobile);
  return {
    id: String(row.id || row.nagarsevak_id || fallbackAccessCode || `SUPER_ADMIN_${mobile}`),
    name: row.name || row.contact_name || "Super Admin",
    mobile,
    role: "super_admin",
    ward: row.ward || "All Wards",
    wardCode: row.ward_code || null,
    wardNumber: row.ward_number || null,
    isSuperAdmin: true,
    nagarsevakId: row.nagarsevak_id || row.id || fallbackAccessCode || `SA_${mobile}`,
    avatarColor: row.avatar_color || "#16A34A",
    contactName: row.contact_name || row.name || "Super Admin",
    contactNumber: normalizeMobile(row.contact_number || row.mobile || fallbackMobile),
    approvalStatus: "approved",
    accessCode: fallbackAccessCode || undefined,
    createdAt: row.created_at || null,
  };
}

async function findDbSuperAdminByMobile(db, mobile) {
  const [rows] = await db.query(
    `SELECT *
     FROM users
     WHERE ${mobileSql("mobile")} = ?
       AND (role = 'super_admin' OR is_super_admin = 1)
       AND COALESCE(approval_status, 'approved') <> 'rejected'
     ORDER BY (id = ?) DESC, created_at DESC
     LIMIT 1`,
    [mobile, DEFAULT_SUPER_ADMIN_ID],
  );

  return rows[0] || null;
}

async function normalizeSuperAdminUserRow(db, row) {
  if (!row?.id) return row;
  await db.query(
    `UPDATE users
     SET role = 'super_admin',
         is_super_admin = 1,
         approval_status = 'approved',
         ward = COALESCE(ward, 'All Wards'),
         nagarsevak_id = COALESCE(nagarsevak_id, id),
         avatar_color = COALESCE(avatar_color, '#16A34A'),
         contact_name = COALESCE(contact_name, name),
         contact_number = COALESCE(contact_number, mobile)
     WHERE id = ?`,
    [row.id],
  );
  return { ...row, role: "super_admin", is_super_admin: 1, approval_status: "approved" };
}

async function upsertAccessCodeSuperAdmin(db, accessRow, mobile) {
  const id = accessRow.id || `SUPER_ADMIN_${mobile}`;
  const name = accessRow.name || "Super Admin";

  await db.query(
    `INSERT INTO users
     (id, name, mobile, role, ward, ward_code, ward_number, is_super_admin,
      approval_status, nagarsevak_id, avatar_color, contact_name, contact_number,
      notify_email, notify_whatsapp)
     VALUES (?, ?, ?, 'super_admin', 'All Wards', NULL, NULL, 1,
      'approved', ?, '#16A34A', ?, ?, 0, 0)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       mobile = VALUES(mobile),
       role = 'super_admin',
       ward = 'All Wards',
       is_super_admin = 1,
       approval_status = 'approved',
       nagarsevak_id = VALUES(nagarsevak_id),
       avatar_color = COALESCE(avatar_color, VALUES(avatar_color)),
       contact_name = VALUES(contact_name),
       contact_number = VALUES(contact_number)`,
    [id, name, mobile, id, name, mobile],
  );

  const row = await findDbSuperAdminByMobile(db, mobile);
  return row || { id, name, mobile, nagarsevak_id: id };
}

async function superAdminAccessLogin(req, res) {
  try {
    const db = getPool();
    await ensureUsersColumns(db);
    await ensureSuperAdminAccessTable(db);
    await ensureDefaultSuperAdmin(db);

    const mobile = normalizeMobile(req.body?.mobile || req.body?.phone);
    const accessCode = String(req.body?.accessCode || req.body?.access_code || "").trim().toUpperCase();

    if (mobile.length !== 10) {
      return sendJson(res, 400, { success: false, message: "Valid 10 digit mobile number is required" });
    }

    const dbSuperAdmin = await findDbSuperAdminByMobile(db, mobile);
    if (dbSuperAdmin) {
      const normalized = await normalizeSuperAdminUserRow(db, dbSuperAdmin);
      return sendJson(res, 200, {
        success: true,
        source: "users",
        user: mapSuperAdmin(normalized, mobile, accessCode || undefined),
      });
    }

    if (!accessCode) {
      return sendJson(res, 400, {
        success: false,
        message: "Unique access ID is required unless this mobile is marked as Super Admin in DB",
      });
    }

    const [accessRows] = await db.query(
      `SELECT id, name, mobile, access_code, status
       FROM super_admin_access_codes
       WHERE ${mobileSql("mobile")} = ?
         AND UPPER(access_code) = ?
       LIMIT 1`,
      [mobile, accessCode],
    );

    if (!accessRows.length) {
      return sendJson(res, 401, { success: false, message: "Invalid mobile number or unique access ID" });
    }

    const accessRow = accessRows[0];
    if (String(accessRow.status || "").toLowerCase() !== "active") {
      return sendJson(res, 403, { success: false, message: "This unique access ID is revoked" });
    }

    const userRow = await upsertAccessCodeSuperAdmin(db, accessRow, mobile);
    return sendJson(res, 200, {
      success: true,
      source: "access_code",
      user: mapSuperAdmin(userRow, mobile, accessRow.access_code),
    });
  } catch (err) {
    return sendJson(res, 500, { success: false, error: err.message, message: err.message || "SUPER_ADMIN_LOGIN_FAILED" });
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
  console.warn("[SuperAdminDbPatch] mysql patch disabled:", err.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalPatch = express.application.patch;

  function install(app) {
    if (installed) return;
    installed = true;
    app.route("/api/auth/super-admin-access-login").post(superAdminAccessLogin);
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

  console.log("[SuperAdminDbPatch] DB-driven Super Admin login active");
} catch (err) {
  console.warn("[SuperAdminDbPatch] express patch disabled:", err.message);
}

module.exports = {};