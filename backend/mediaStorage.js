"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = path.join(__dirname, "uploads");

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

async function saveDataUri(value, prefix, req) {
  if (!value || typeof value !== "string" || !value.startsWith("data:")) return value || null;

  const match = value.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Invalid uploaded media format");

  const mime = match[1].toLowerCase();
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const ext = extensions[mime];
  if (!ext) throw new Error("Unsupported uploaded media type");

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded media must be between 1 byte and 8MB");
  }

  const safePrefix = String(prefix || "media").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "media";
  const fileName = `${safePrefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer, { flag: "wx" });

  return `${publicBaseUrl(req)}/uploads/${fileName}`;
}

module.exports = {
  MAX_UPLOAD_BYTES,
  saveDataUri,
};
