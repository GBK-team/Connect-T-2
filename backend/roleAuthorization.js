"use strict";

const crypto = require("crypto");

const officialNagarsevaks = require("./data/officialNagarsevaks");
const { normalizeMobile } = require("./authSecurity");

const ROLE_PRIORITY = Object.freeze({ super_admin: 1, nagarsevak: 2, citizen: 3 });
const PRIVILEGED_ROLES = new Set(["super_admin", "nagarsevak"]);
const VALID_STATUSES = new Set(["active", "inactive", "revoked"]);
const MIGRATION_KEY = "unified_role_authorization_v1";
let schemaPromise = null;

function wardNumberFromDesignation(value) {
  const match = String(value || "").match(/(\d{1,2})/);
  if (!match) return null;
  const ward = Number(match[1]);
  return ward >= 1 && ward <= 29 ? String(ward) : null;
}

function chooseHighestPriorityAssignment(assignments) {
  return [...(assignments || [])]
    .filter((item) => item && item.status === "active" && ROLE_PRIORITY[item.role])
    .sort((left, right) => ROLE_PRIORITY[left.role] - ROLE_PRIORITY[right.role])[0] || null;
}

function validateOfficialNagarsevakRecords(records = officialNagarsevaks) {
  const valid = [];
  const invalid = [];
  const duplicate = [];
  const seen = new Map();

  for (const record of records) {
    const mobile = normalizeMobile(record?.mobile);
    const normalized = { ...record, mobile };
    if (!record?.serial || !String(record?.nameMr || "").trim() || !String(record?.designation || "").trim() || mobile.length !== 10) {
      invalid.push({ ...normalized, reason: "MISSING_OR_INVALID_VALUE" });
      continue;
    }
    if (seen.has(mobile)) {
      duplicate.push({ ...normalized, duplicateOfSerial: seen.get(mobile) });
      continue;
    }
    seen.set(mobile, record.serial);
    valid.push(normalized);
  }

  return { valid, invalid, duplicate, total: records.length };
}

function safeAssignmentUserId(role, assignmentId, mobile) {
  const digest = crypto.createHash("sha256").update(`${role}:${assignmentId}:${mobile}`).digest("hex").slice(0, 14);
  return `${role === "super_admin" ? "SA" : role === "nagarsevak" ? "NS" : "U"}_${digest}`;
}

function privilegedRestrictionReason({ target, actorUserId, actorMobile, activeCount }) {
  if (target?.is_primary || target?.isPrimary) return "PRIMARY_ADMIN_PROTECTED";
  if (
    String(target?.user_id || target?.userId || "") === String(actorUserId || "") ||
    normalizeMobile(target?.normalized_phone || target?.mobile) === normalizeMobile(actorMobile)
  ) {
    return "SELF_LOCKOUT_BLOCKED";
  }
  if (target?.status === "active" && Number(activeCount || 0) <= 1) return "LAST_ADMIN_PROTECTED";
  return null;
}

function mapRoleAssignment(row) {
  return {
    id: String(row.id),
    userId: row.user_id || null,
    mobile: normalizeMobile(row.normalized_phone),
    role: row.role,
    name: row.display_name,
    wardOrDesignation: row.ward_or_designation || null,
    status: row.status,
    source: row.source,
    isPrimary: !!row.is_primary,
    sourceSerial: row.source_serial == null ? null : Number(row.source_serial),
    addedBy: row.added_by || null,
    addedByName: row.added_by_name || null,
    lastLoginAt: row.last_login_at || null,
    hasLoggedIn: !!row.last_login_at,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function columnExists(db, table, column) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.count || 0) > 0;
}

async function ensureUsersCompatibilityColumns(db) {
  if (!(await columnExists(db, "users", "official_designation"))) {
    await db.query("ALTER TABLE users ADD COLUMN official_designation VARCHAR(100) NULL AFTER ward_number");
  }
  if (!(await columnExists(db, "users", "last_login_at"))) {
    await db.query("ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER updated_at");
  }
}

async function createAuthorizationTables(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS role_assignments (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(80) NULL,
    normalized_phone CHAR(10) NOT NULL,
    role VARCHAR(30) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    ward_or_designation VARCHAR(100) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    source VARCHAR(80) NOT NULL DEFAULT 'admin',
    source_serial INT NULL,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    added_by VARCHAR(80) NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_role_phone (normalized_phone, role),
    KEY idx_role_active_lookup (normalized_phone, status, role),
    KEY idx_role_status (role, status),
    KEY idx_role_user (user_id),
    KEY idx_role_source_serial (source, source_serial)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS role_audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    actor_user_id VARCHAR(80) NULL,
    actor_phone CHAR(10) NULL,
    actor_role VARCHAR(30) NULL,
    action VARCHAR(80) NOT NULL,
    target_assignment_id BIGINT NULL,
    target_phone CHAR(10) NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NULL,
    details_json LONGTEXT NULL,
    request_id VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_role_audit_created (created_at),
    KEY idx_role_audit_actor (actor_user_id),
    KEY idx_role_audit_target (target_assignment_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS role_migration_runs (
    migration_key VARCHAR(120) PRIMARY KEY,
    summary_json LONGTEXT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

function normalizedPhoneSql(column) {
  return `RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), 10)`;
}

async function runInitialMigration(db) {
  const [alreadyApplied] = await db.query(
    "SELECT summary_json FROM role_migration_runs WHERE migration_key = ? LIMIT 1",
    [MIGRATION_KEY],
  );
  if (alreadyApplied.length) {
    try {
      return JSON.parse(alreadyApplied[0].summary_json || "{}");
    } catch {
      return { migrationKey: MIGRATION_KEY, alreadyApplied: true };
    }
  }

  const validation = validateOfficialNagarsevakRecords();
  const connection = typeof db.getConnection === "function" ? await db.getConnection() : db;
  let imported = 0;
  let existing = 0;

  try {
    if (connection.beginTransaction) await connection.beginTransaction();

    await connection.query(
      `INSERT IGNORE INTO role_assignments
       (user_id, normalized_phone, role, display_name, ward_or_designation, status, source, is_primary, last_login_at)
       SELECT id, ${normalizedPhoneSql("mobile")}, role, name,
              COALESCE(official_designation, ward),
              CASE
                WHEN role IN ('super_admin', 'nagarsevak') AND COALESCE(approval_status, 'approved') <> 'approved' THEN 'inactive'
                ELSE 'active'
              END,
              'legacy_users', 0, last_login_at
       FROM users
       WHERE role IN ('super_admin', 'nagarsevak', 'citizen')
         AND CHAR_LENGTH(${normalizedPhoneSql("mobile")}) = 10`,
    );

    await connection.query(
      `INSERT INTO role_assignments
       (normalized_phone, role, display_name, status, source, added_by)
       SELECT ${normalizedPhoneSql("mobile")}, 'super_admin', MAX(name),
              CASE WHEN SUM(status = 'active') > 0 THEN 'active' ELSE 'revoked' END,
              'legacy_access_code', MAX(created_by)
       FROM super_admin_access_codes
       WHERE CHAR_LENGTH(${normalizedPhoneSql("mobile")}) = 10
       GROUP BY ${normalizedPhoneSql("mobile")}
       ON DUPLICATE KEY UPDATE status = VALUES(status),
         source = 'legacy_access_code', added_by = COALESCE(VALUES(added_by), added_by)`,
    ).catch(() => null);

    for (const record of validation.valid) {
      const [priorRows] = await connection.query(
        "SELECT id FROM role_assignments WHERE normalized_phone = ? AND role = 'nagarsevak' LIMIT 1",
        [record.mobile],
      );
      const [result] = await connection.query(
        `INSERT INTO role_assignments
         (normalized_phone, role, display_name, ward_or_designation, status, source, source_serial)
         VALUES (?, 'nagarsevak', ?, ?, 'active', 'official_nagarsevak_pdf', ?)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name),
           ward_or_designation = VALUES(ward_or_designation), source = VALUES(source),
           source_serial = VALUES(source_serial)`,
        [record.mobile, record.nameMr, record.designation, record.serial],
      );
      if (priorRows.length) existing += 1;
      else if (Number(result?.affectedRows || 0) > 0) imported += 1;
    }

    const configuredRootMobile = normalizeMobile(process.env.MAIN_SUPER_ADMIN_MOBILE || "");
    if (configuredRootMobile.length === 10) {
      await connection.query(
        `INSERT INTO role_assignments
         (normalized_phone, role, display_name, status, source, is_primary)
         VALUES (?, 'super_admin', 'Primary Super Admin', 'active', 'environment', 1)
         ON DUPLICATE KEY UPDATE is_primary = 1, status = 'active'`,
        [configuredRootMobile],
      );
    }

    const [primaryRows] = await connection.query(
      "SELECT id FROM role_assignments WHERE role = 'super_admin' AND status = 'active' AND is_primary = 1 LIMIT 1",
    );
    if (!primaryRows.length) {
      await connection.query(
        `UPDATE role_assignments SET is_primary = 1
         WHERE role = 'super_admin' AND status = 'active'
         ORDER BY created_at ASC, id ASC LIMIT 1`,
      );
    }

    const summary = {
      migrationKey: MIGRATION_KEY,
      sourceTotal: validation.total,
      imported,
      existing,
      invalid: validation.invalid,
      duplicate: validation.duplicate,
      skipped: validation.invalid.length + validation.duplicate.length,
    };
    await connection.query(
      "INSERT INTO role_migration_runs (migration_key, summary_json) VALUES (?, ?)",
      [MIGRATION_KEY, JSON.stringify(summary)],
    );
    if (connection.commit) await connection.commit();
    return summary;
  } catch (error) {
    if (connection.rollback) await connection.rollback();
    throw error;
  } finally {
    if (connection !== db && connection.release) connection.release();
  }
}

async function ensureRoleAuthorizationSchema(db) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await createAuthorizationTables(db);
      await ensureUsersCompatibilityColumns(db);
      return runInitialMigration(db);
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function findAssignmentsByMobile(db, rawMobile, options = {}) {
  const mobile = normalizeMobile(rawMobile);
  if (mobile.length !== 10) return [];
  const statuses = options.includeInactive ? ["active", "inactive", "revoked"] : ["active"];
  const placeholders = statuses.map(() => "?").join(", ");
  const [rows] = await db.query(
    `SELECT * FROM role_assignments
     WHERE normalized_phone = ? AND status IN (${placeholders})
     ORDER BY FIELD(role, 'super_admin', 'nagarsevak', 'citizen'), created_at ASC`,
    [mobile, ...statuses],
  );
  return rows.map(mapRoleAssignment);
}

async function resolveActiveAssignment(db, rawMobile) {
  return chooseHighestPriorityAssignment(await findAssignmentsByMobile(db, rawMobile));
}

async function isPrivilegedRoleActive(db, { mobile, role, userId }) {
  if (!PRIVILEGED_ROLES.has(role)) return true;
  const [rows] = await db.query(
    `SELECT id FROM role_assignments
     WHERE normalized_phone = ? AND role = ? AND status = 'active'
       AND (user_id IS NULL OR user_id = ?)
     LIMIT 1`,
    [normalizeMobile(mobile), role, String(userId || "")],
  );
  return rows.length > 0;
}

async function getMigrationSummary(db) {
  await ensureRoleAuthorizationSchema(db);
  const [rows] = await db.query(
    "SELECT summary_json, applied_at FROM role_migration_runs WHERE migration_key = ? LIMIT 1",
    [MIGRATION_KEY],
  );
  if (!rows.length) return null;
  let summary = {};
  try { summary = JSON.parse(rows[0].summary_json || "{}"); } catch { summary = {}; }
  return { ...summary, appliedAt: rows[0].applied_at };
}

async function recordRoleAudit(db, entry) {
  await db.query(
    `INSERT INTO role_audit_logs
     (actor_user_id, actor_phone, actor_role, action, target_assignment_id,
      target_phone, previous_status, new_status, details_json, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorUserId || null,
      normalizeMobile(entry.actorPhone) || null,
      entry.actorRole || null,
      entry.action,
      entry.targetAssignmentId || null,
      normalizeMobile(entry.targetPhone) || null,
      entry.previousStatus || null,
      entry.newStatus || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.requestId || null,
    ],
  );
}

module.exports = {
  MIGRATION_KEY,
  PRIVILEGED_ROLES,
  ROLE_PRIORITY,
  VALID_STATUSES,
  chooseHighestPriorityAssignment,
  ensureRoleAuthorizationSchema,
  findAssignmentsByMobile,
  getMigrationSummary,
  isPrivilegedRoleActive,
  mapRoleAssignment,
  privilegedRestrictionReason,
  recordRoleAudit,
  resolveActiveAssignment,
  safeAssignmentUserId,
  validateOfficialNagarsevakRecords,
  wardNumberFromDesignation,
};
