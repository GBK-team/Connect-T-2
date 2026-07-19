"use strict";

const crypto = require("crypto");

const GENERIC_SERVER_ERROR = "Something went wrong. Please try again after some time.";

function requestIdFrom(value) {
  const candidate = String(value || "").trim();
  if (/^[A-Za-z0-9._-]{8,80}$/.test(candidate)) return candidate;
  return crypto.randomUUID();
}

function safeServerErrorPayload(requestId) {
  return {
    success: false,
    error: GENERIC_SERVER_ERROR,
    message: GENERIC_SERVER_ERROR,
    requestId,
  };
}

function installHttpSafety(app) {
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const requestId = requestIdFrom(req.headers?.["x-request-id"]);
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    if (/^\/api\/(auth|admin|super-admin)(\/|$)/.test(req.path || req.originalUrl || "")) {
      res.setHeader("Cache-Control", "no-store");
    }

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (res.statusCode >= 500) {
        console.error(
          `[Connect-T] ${requestId} ${req.method || "REQUEST"} ${req.path || ""} returned ${res.statusCode}`,
        );
        return originalJson(safeServerErrorPayload(requestId));
      }
      return originalJson(payload);
    };

    next();
  });
}

function installSafeErrorHandler(app) {
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const requestId = res.locals?.requestId || requestIdFrom();
    const status = Number(error?.status || error?.statusCode);
    if (status === 400 && error instanceof SyntaxError) {
      return res.status(400).json({
        success: false,
        error: "The request contains invalid JSON.",
        message: "The request contains invalid JSON.",
        requestId,
      });
    }
    if (status === 413) {
      return res.status(413).json({
        success: false,
        error: "The request is too large.",
        message: "The request is too large.",
        requestId,
      });
    }
    return res.status(500).json(safeServerErrorPayload(requestId));
  });
}

module.exports = {
  GENERIC_SERVER_ERROR,
  installHttpSafety,
  installSafeErrorHandler,
  requestIdFrom,
  safeServerErrorPayload,
};
