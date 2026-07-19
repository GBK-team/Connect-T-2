/*
 * Ward-based utility status patch.
 *
 * Adds DB-backed utility updates for water/electricity.
 * Citizens can fetch updates for their ward. Nagarsevaks can post only for
 * their own ward; super admins can post for any ward.
 */

const crypto = require("crypto");
const mysql = require("mysql2/promise");
const { verifyRequestToken } = require("./authSecurity");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

let installed = false;

function normalizeWard(value) {
  return String(value || "").trim();
}

function normalizeWardKey(value) {
  return normalizeWard(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeWardCode(value) {
  if (!value) return null;
  const match = String(value).trim().toUpperCase().match(/(\d{1,2})/);
  if (!match) return null;
  const wardNumber = Number(match[1]);
  return wardNumber >= 1 && wardNumber <= 29 ? `${wardNumber}` : null;
}

function verifyToken(req) {
  return verifyRequestToken(req);
}

async function ensureUtilityStatusSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS utility_statuses (
      id VARCHAR(80) NOT NULL PRIMARY KEY,
      ward VARCHAR(160) NOT NULL,
      ward_code VARCHAR(80) NULL,
      utility_type VARCHAR(40) NOT NULL,
      title VARCHAR(190) NOT NULL,
      status VARCHAR(60) NOT NULL,
      hours_per_day VARCHAR(40) NULL,
      schedule_text TEXT NULL,
      description TEXT NULL,
      helpline VARCHAR(160) NULL,
      source VARCHAR(190) NULL,
      posted_by_id VARCHAR(80) NULL,
      posted_by_name VARCHAR(160) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_utility_ward (ward),
      KEY idx_utility_ward_code (ward_code),
      KEY idx_utility_type (utility_type),
      KEY idx_utility_active (is_active),
      KEY idx_utility_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getUserForAuth(auth) {
  if (!auth?.sub) return null;
  const [rows] = await db.query(
    `SELECT id, name, mobile, role, ward, ward_code, ward_number, is_super_admin
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [auth.sub],
  );
  return rows[0] || null;
}

function presentRow(row) {
  return {
    id: row.id,
    ward: row.ward,
    wardCode: row.ward_code,
    utilityType: row.utility_type,
    title: row.title,
    status: row.status,
    hoursPerDay: row.hours_per_day,
    scheduleText: row.schedule_text,
    description: row.description,
    helpline: row.helpline,
    source: row.source,
    postedById: row.posted_by_id,
    postedByName: row.posted_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listUtilityStatuses(req, res) {
  try {
    await ensureUtilityStatusSchema();

    const ward = normalizeWard(req.query.ward || req.query.ward_name);
    const wardCode = normalizeWardCode(req.query.ward_code || ward);
    const utilityType = String(req.query.utility_type || req.query.utilityType || "").trim().toLowerCase();

    if (!ward && !wardCode) {
      return res.status(400).json({ success: false, error: "ward is required" });
    }

    const params = [];
    let sql = `SELECT * FROM utility_statuses WHERE is_active = 1`;

    if (ward || wardCode) {
      sql += ` AND (`;
      const parts = [];
      if (ward) {
        parts.push(`LOWER(ward) = ?`);
        params.push(normalizeWardKey(ward));
      }
      if (wardCode) {
        parts.push(`ward_code = ?`);
        params.push(wardCode);
      }
      sql += parts.join(" OR ") + `)`;
    }

    if (utilityType) {
      sql += ` AND utility_type = ?`;
      params.push(utilityType);
    }

    sql += ` ORDER BY updated_at DESC, created_at DESC`;

    const [rows] = await db.query(sql, params);
    const latestByType = [];
    const seen = new Set();

    for (const row of rows) {
      if (seen.has(row.utility_type)) continue;
      seen.add(row.utility_type);
      latestByType.push(presentRow(row));
    }

    return res.json({ success: true, statuses: latestByType });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function createUtilityStatus(req, res) {
  try {
    await ensureUtilityStatusSchema();

    const auth = verifyToken(req);
    const user = await getUserForAuth(auth);
    const isSuperAdmin = !!user && (user.role === "super_admin" || user.is_super_admin === 1 || user.is_super_admin === true);
    const isNagarsevak = !!user && user.role === "nagarsevak";

    if (!isSuperAdmin && !isNagarsevak) {
      return res.status(401).json({ success: false, error: "Nagarsevak or super admin token required" });
    }

    const utilityType = String(req.body.utility_type || req.body.utilityType || "").trim().toLowerCase();
    if (!['water', 'electricity'].includes(utilityType)) {
      return res.status(400).json({ success: false, error: "utility_type must be water or electricity" });
    }

    const finalWard = isSuperAdmin ? normalizeWard(req.body.ward || user.ward) : normalizeWard(user.ward);
    const finalWardCode = normalizeWardCode(isSuperAdmin ? (req.body.ward_code || req.body.wardCode || finalWard) : (user.ward_code || finalWard));

    if (!finalWard || !finalWardCode) {
      return res.status(400).json({ success: false, error: "Select a valid ward from Ward 1 to Ward 29" });
    }

    const id = req.body.id || `utility_${utilityType}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const title = String(req.body.title || (utilityType === "water" ? "Water Supply" : "Electricity")).trim();
    const status = String(req.body.status || "normal").trim().toLowerCase();

    await db.query(
      `UPDATE utility_statuses
       SET is_active = 0
       WHERE is_active = 1 AND utility_type = ? AND (LOWER(ward) = ? OR ward_code = ?)`,
      [utilityType, normalizeWardKey(finalWard), finalWardCode],
    );

    await db.query(
      `INSERT INTO utility_statuses
       (id, ward, ward_code, utility_type, title, status, hours_per_day, schedule_text, description, helpline, source, posted_by_id, posted_by_name, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        finalWard,
        finalWardCode,
        utilityType,
        title,
        status,
        req.body.hours_per_day || req.body.hoursPerDay || null,
        req.body.schedule_text || req.body.scheduleText || null,
        req.body.description || null,
        req.body.helpline || null,
        req.body.source || (utilityType === "water" ? "AMC Water Department" : "MSEDCL Ambernath Division"),
        user.id,
        user.name,
      ],
    );

    return res.status(201).json({ success: true, statusId: id, ward: finalWard, wardCode: finalWardCode });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function deactivateUtilityStatus(req, res) {
  try {
    await ensureUtilityStatusSchema();

    const auth = verifyToken(req);
    const user = await getUserForAuth(auth);
    const isSuperAdmin = !!user && (user.role === "super_admin" || user.is_super_admin === 1 || user.is_super_admin === true);
    const isNagarsevak = !!user && user.role === "nagarsevak";

    if (!isSuperAdmin && !isNagarsevak) {
      return res.status(401).json({ success: false, error: "Nagarsevak or super admin token required" });
    }

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ success: false, error: "status id is required" });

    let sql = "UPDATE utility_statuses SET is_active = 0 WHERE id = ?";
    const params = [id];

    if (isNagarsevak && !isSuperAdmin) {
      sql += " AND LOWER(ward) = ?";
      params.push(normalizeWardKey(user.ward));
    }

    const [result] = await db.query(sql, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: "Utility status not found for your ward" });
    }

    return res.json({ success: true, statusId: id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalDelete = express.application.delete;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/utility-status", listUtilityStatuses);
    originalPost.call(app, "/api/utility-status", createUtilityStatus);
    originalDelete.call(app, "/api/utility-status/:id", deactivateUtilityStatus);
  }

  express.application.get = function patchedGet(path, ...handlers) {
    install(this);
    return originalGet.call(this, path, ...handlers);
  };

  express.application.post = function patchedPost(path, ...handlers) {
    install(this);
    return originalPost.call(this, path, ...handlers);
  };

  express.application.delete = function patchedDelete(path, ...handlers) {
    install(this);
    return originalDelete.call(this, path, ...handlers);
  };

  console.log("[UtilityStatusPatch] ward-based utility status API active");
} catch (err) {
  console.warn("[UtilityStatusPatch] disabled:", err.message);
}

module.exports = {};
