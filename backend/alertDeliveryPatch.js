"use strict";

const crypto = require("crypto");
const { verifyRequestToken } = require("./authSecurity");
const { saveDataUri } = require("./mediaStorage");

let pool = null;
let installed = false;

function sendJson(res, status, payload) {
  if (res.headersSent) return res;
  return res.status(status).json(payload);
}

function cleanText(value, maxLength = 500) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
}

function normalizeWard(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw === "all wards" || raw === "all" || raw === "all citizens") return "";
  const match = raw.match(/(?:ward\s*)?([0-9]{1,2}[a-z]?)/i);
  return match ? match[1].toLowerCase() : raw.replace(/\s+/g, "");
}

function isGlobalAlert(row) {
  const ward = normalizeWard(row?.ward);
  const audience = String(row?.target_audience || row?.targetAudience || "").toLowerCase();
  return !ward || audience.includes("all citizen") || audience.includes("all ward");
}

function canCitizenSee(row, user) {
  if (isGlobalAlert(row)) return true;
  return normalizeWard(row?.ward) === normalizeWard(user?.ward || user?.ward_code || user?.wardCode);
}

function makeId() {
  return `alert_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function ensureSchema(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'alert',
    category VARCHAR(80) NULL,
    priority VARCHAR(30) NULL DEFAULT 'normal',
    location VARCHAR(255) NULL,
    valid_until VARCHAR(80) NULL,
    expires_at VARCHAR(80) NULL,
    target_audience VARCHAR(80) NULL,
    media_uri TEXT NULL,
    media_type VARCHAR(30) NULL,
    media_file_name VARCHAR(255) NULL,
    media_mime_type VARCHAR(120) NULL,
    media_duration INT NULL,
    posted_by VARCHAR(120) NOT NULL DEFAULT 'Connect-T',
    posted_by_id VARCHAR(80) NULL,
    ward VARCHAR(80) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_alerts_active (is_active),
    KEY idx_alerts_ward (ward),
    KEY idx_alerts_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function civicUser(req) {
  const auth = verifyRequestToken(req);
  if (!auth?.sub || auth.scope === "job_portal") return null;
  const [rows] = await pool.query(
    `SELECT id, name, mobile, role, ward, ward_code, is_super_admin, approval_status
     FROM users WHERE id = ? LIMIT 1`,
    [auth.sub],
  );
  return rows[0] || null;
}

function isSuperAdmin(user) {
  return !!user && (user.role === "super_admin" || !!user.is_super_admin);
}

function isApprovedOfficer(user) {
  return !!user && user.role === "nagarsevak" && String(user.approval_status || "approved") === "approved";
}

async function listAlerts(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureSchema(pool);
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });

    const params = [new Date().toISOString()];
    let sql = `SELECT * FROM alerts
      WHERE is_active = 1
        AND (expires_at IS NULL OR expires_at = '' OR expires_at > ?)`;
    const requestedType = cleanText(req.query?.type, 30);
    if (requestedType) {
      sql += " AND type = ?";
      params.push(requestedType);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    const visible = isSuperAdmin(user)
      ? rows
      : isApprovedOfficer(user)
        ? rows.filter((row) => isGlobalAlert(row) || canCitizenSee(row, user) || String(row.posted_by_id || "") === String(user.id))
        : rows.filter((row) => canCitizenSee(row, user));

    return sendJson(res, 200, { success: true, alerts: visible });
  } catch (error) {
    console.warn("[AlertDeliveryPatch] list failed:", error.message);
    return sendJson(res, 500, { success: false, message: "Alerts and news could not be loaded right now." });
  }
}

async function createAlert(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureSchema(pool);
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, message: "Only an approved Nagarsevak or Super Admin can publish alerts and news." });
    }

    const title = cleanText(req.body?.title, 255);
    const body = cleanText(req.body?.body, 10000);
    const type = cleanText(req.body?.type || "alert", 30).toLowerCase();
    const priority = cleanText(req.body?.priority || "normal", 30).toLowerCase();
    if (title.length < 3 || body.length < 5) {
      return sendJson(res, 400, { success: false, message: "Enter a clear title and detailed message." });
    }
    if (!["alert", "news", "emergency"].includes(type)) {
      return sendJson(res, 400, { success: false, message: "Choose Alert or News." });
    }
    if (!["normal", "important", "urgent", "high"].includes(priority)) {
      return sendJson(res, 400, { success: false, message: "Choose a valid priority." });
    }

    const expiresAt = cleanText(req.body?.expires_at || req.body?.expiresAt, 80);
    if (expiresAt && (Number.isNaN(new Date(expiresAt).getTime()) || new Date(expiresAt).getTime() <= Date.now())) {
      return sendJson(res, 400, { success: false, message: "The alert expiry must be a future date and time." });
    }

    const requestedAudience = cleanText(req.body?.target_audience || req.body?.targetAudience, 80);
    const globalAudience = isSuperAdmin(user) && /all/i.test(requestedAudience || "");
    const ward = isSuperAdmin(user)
      ? (globalAudience ? null : cleanText(req.body?.ward, 80) || null)
      : cleanText(user.ward || user.ward_code, 80) || null;
    const targetAudience = ward ? "Ward residents" : "All citizens";
    const mediaType = cleanText(req.body?.media_type || req.body?.mediaType, 30);
    if (mediaType && !["image", "video"].includes(mediaType)) {
      return sendJson(res, 400, { success: false, message: "Unsupported alert attachment type." });
    }
    const mediaUri = await saveDataUri(req.body?.media_uri || req.body?.mediaUri, "alert", req);
    const id = cleanText(req.body?.id, 80) || makeId();

    await pool.query(
      `INSERT INTO alerts
       (id, title, body, type, category, priority, location, valid_until, expires_at,
        target_audience, media_uri, media_type, media_file_name, media_mime_type,
        media_duration, posted_by, posted_by_id, ward, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        title,
        body,
        type,
        cleanText(req.body?.category, 80) || null,
        priority,
        cleanText(req.body?.location, 255) || ward || null,
        cleanText(req.body?.valid_until || req.body?.validUntil, 80) || null,
        expiresAt || null,
        targetAudience,
        mediaUri || null,
        mediaType || null,
        cleanText(req.body?.media_file_name || req.body?.mediaFileName, 255) || null,
        cleanText(req.body?.media_mime_type || req.body?.mediaMimeType, 120) || null,
        Number(req.body?.media_duration || req.body?.mediaDuration || 0) || null,
        cleanText(user.name, 120) || "Connect-T",
        String(user.id),
        ward,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM alerts WHERE id = ? LIMIT 1", [id]);
    return sendJson(res, 201, { success: true, alertId: id, alert: rows[0] || null });
  } catch (error) {
    console.warn("[AlertDeliveryPatch] create failed:", error.message);
    return sendJson(res, 500, { success: false, message: "This alert or news update could not be published right now." });
  }
}

async function deleteAlert(req, res) {
  try {
    if (!pool) throw new Error("Database pool is not ready");
    await ensureSchema(pool);
    const user = await civicUser(req);
    if (!user) return sendJson(res, 401, { success: false, message: "Please log in to Connect T first." });
    if (!isSuperAdmin(user) && !isApprovedOfficer(user)) {
      return sendJson(res, 403, { success: false, message: "You do not have permission to remove alerts or news." });
    }

    const id = cleanText(req.params?.id, 80);
    const [rows] = await pool.query("SELECT posted_by_id, ward FROM alerts WHERE id = ? AND is_active = 1 LIMIT 1", [id]);
    if (!rows.length) return sendJson(res, 404, { success: false, message: "Alert or news post not found." });
    const owns = String(rows[0].posted_by_id || "") === String(user.id);
    if (!isSuperAdmin(user) && !owns) {
      return sendJson(res, 403, { success: false, message: "You can remove only alerts or news posted from your account." });
    }

    await pool.query("UPDATE alerts SET is_active = 0 WHERE id = ?", [id]);
    return sendJson(res, 200, { success: true, alertId: id });
  } catch (error) {
    console.warn("[AlertDeliveryPatch] delete failed:", error.message);
    return sendJson(res, 500, { success: false, message: "This alert or news post could not be removed right now." });
  }
}

try {
  const mysql = require("mysql2/promise");
  const originalCreatePool = mysql.createPool;
  mysql.createPool = function patchedCreatePool(...args) {
    pool = originalCreatePool.apply(this, args);
    return pool;
  };
} catch (error) {
  console.warn("[AlertDeliveryPatch] mysql patch disabled:", error.message);
}

try {
  const express = require("express");
  const originalGet = express.application.get;
  const originalPost = express.application.post;
  const originalDelete = express.application.delete;

  function install(app) {
    if (installed) return;
    installed = true;
    originalGet.call(app, "/api/alerts", listAlerts);
    originalPost.call(app, "/api/alerts", createAlert);
    originalDelete.call(app, "/api/alerts/:id", deleteAlert);
    console.log("[AlertDeliveryPatch] secure multi-role alert delivery active");
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
} catch (error) {
  console.warn("[AlertDeliveryPatch] express patch disabled:", error.message);
}

module.exports = { normalizeWard, isGlobalAlert, canCitizenSee };
