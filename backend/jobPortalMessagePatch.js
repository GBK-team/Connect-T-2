/*
 * Job Portal message patch module.
 *
 * The main backend/server.js already owns the active message GET/POST routes.
 * This file is intentionally kept as a startup-safe compatibility module because
 * backend/package.json preloads it with node --require.
 */

console.log("[JobPortalMessagePatch] loaded");

module.exports = {};
