"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

function hasExpectedSignature(buffer, mime) {
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mime === "video/mp4" || mime === "video/quicktime") return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm") return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"));
  return false;
}

function publicBaseUrl(req) {
  return String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

async function saveDataUri(value, prefix, req, options = {}) {
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
  if (Array.isArray(options.allowedMimeTypes) && !options.allowedMimeTypes.includes(mime)) {
    throw new Error("Unsupported uploaded media type");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded media must be between 1 byte and 8MB");
  }
  if (!hasExpectedSignature(buffer, mime)) {
    throw new Error("Uploaded media content does not match its file type");
  }

  const safePrefix = String(prefix || "media").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "media";
  const fileName = `${safePrefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}.${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, fileName), buffer, { flag: "wx" });

  return `${publicBaseUrl(req)}/uploads/${fileName}`;
}

module.exports = {
  hasExpectedSignature,
  MAX_UPLOAD_BYTES,
  UPLOAD_DIR,
  saveDataUri,
};
