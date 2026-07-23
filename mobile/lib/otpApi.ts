import { apiUrl } from "../constants/api";
import { storeOtpVerificationToken } from "./api";
import { safeUserMessage } from "./errorSafety";
import { deleteSessionSecret, getSessionSecret, setSessionSecret } from "./secureSessionStorage";

const REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_RESEND_SECONDS = 45;
const OTP_SESSION_PREFIX = "connect_t_otp_session_v2";

export type OtpSessionState = {
  mobile: string;
  purpose: string;
  sessionToken: string;
  resendAt: number;
  expiresAt: number;
};

export type OtpResult = {
  success: boolean;
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
  data?: any;
};

function normalizedMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function normalizedPurpose(value: string) {
  return String(value || "login").trim().slice(0, 40) || "login";
}

function sessionKey(mobile: string, purpose: string) {
  return `${OTP_SESSION_PREFIX}:${normalizedMobile(mobile)}:${normalizedPurpose(purpose)}`;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function safeOtpError(status: number, value: unknown, fallback: string) {
  if (status >= 500) return "OTP service is temporarily unavailable. Please try again after some time.";
  if (status === 429) return safeUserMessage(value, "Too many attempts. Please wait and try again.");
  if (status === 401 || status === 403 || status === 404) return fallback;
  return safeUserMessage(value, fallback);
}

async function readResponse(res: Response) {
  return res.json().catch(() => ({}));
}

export async function getOtpSessionState(mobile: string, purpose = "login"): Promise<OtpSessionState | null> {
  const key = sessionKey(mobile, purpose);
  const raw = await getSessionSecret(key);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as OtpSessionState;
    if (!state.sessionToken || state.expiresAt <= Date.now()) {
      await deleteSessionSecret(key);
      return null;
    }
    return state;
  } catch {
    await deleteSessionSecret(key);
    return null;
  }
}

export async function clearOtpSession(mobile: string, purpose = "login") {
  await deleteSessionSecret(sessionKey(mobile, purpose));
}

async function saveOtpSession(mobile: string, purpose: string, data: any) {
  const now = Date.now();
  const resendAfterSeconds = Math.max(1, Number(data?.resendAfterSeconds || DEFAULT_RESEND_SECONDS));
  const expiresInSeconds = Math.max(resendAfterSeconds, Number(data?.expiresInSeconds || 300));
  const state: OtpSessionState = {
    mobile,
    purpose,
    sessionToken: String(data.sessionToken),
    resendAt: now + resendAfterSeconds * 1000,
    expiresAt: now + expiresInSeconds * 1000,
  };
  await setSessionSecret(sessionKey(mobile, purpose), JSON.stringify(state));
  return state;
}

export async function sendRealOtp(mobile: string, purpose = "login"): Promise<OtpResult> {
  try {
    const mobile10 = normalizedMobile(mobile);
    const normalizedOtpPurpose = normalizedPurpose(purpose);

    if (mobile10.length !== 10) {
      return { success: false, error: "Enter valid 10-digit mobile number", code: "INVALID_MOBILE" };
    }

    const res = await fetchWithTimeout(apiUrl("/api/auth/send-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: mobile10, purpose: normalizedOtpPurpose }),
    });
    const data = await readResponse(res);
    const retryAfterSeconds = Number(data?.retryAfterSeconds || 0) || undefined;

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: safeOtpError(res.status, data.error || data.message, "OTP could not be sent. Please try again."),
        code: data?.code ? String(data.code) : undefined,
        retryAfterSeconds,
      };
    }

    if (!data.sessionToken) {
      return { success: false, error: "OTP session was not created. Please try again.", code: "OTP_SESSION_MISSING" };
    }

    const state = await saveOtpSession(mobile10, normalizedOtpPurpose, data);
    await storeOtpVerificationToken(null);
    return {
      success: true,
      data: {
        ...data,
        resendAt: state.resendAt,
        expiresAt: state.expiresAt,
      },
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      success: false,
      error: timedOut
        ? "OTP request timed out. Check your connection and try again."
        : "Failed to send OTP. Please try again.",
      code: timedOut ? "OTP_TIMEOUT" : "OTP_NETWORK_ERROR",
    };
  }
}

export async function verifyRealOtp(mobile: string, otp: string, purpose = "login"): Promise<OtpResult> {
  try {
    const mobile10 = normalizedMobile(mobile);
    const normalizedOtpPurpose = normalizedPurpose(purpose);
    const code = String(otp || "").replace(/\D/g, "");

    if (mobile10.length !== 10) {
      return { success: false, error: "Enter valid 10-digit mobile number", code: "INVALID_MOBILE" };
    }
    if (code.length !== 6) {
      return { success: false, error: "Enter 6-digit OTP", code: "INVALID_OTP_LENGTH" };
    }

    const state = await getOtpSessionState(mobile10, normalizedOtpPurpose);
    if (!state) {
      return { success: false, error: "OTP session expired. Please request a new OTP.", code: "OTP_SESSION_EXPIRED" };
    }

    const res = await fetchWithTimeout(apiUrl("/api/auth/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: mobile10,
        otp: code,
        purpose: normalizedOtpPurpose,
        sessionToken: state.sessionToken,
      }),
    });
    const data = await readResponse(res);
    const retryAfterSeconds = Number(data?.retryAfterSeconds || 0) || undefined;

    if (!res.ok || !data.success) {
      if (["OTP_MAX_ATTEMPTS", "OTP_SESSION_MISMATCH", "OTP_SESSION_REQUIRED"].includes(String(data?.code || ""))) {
        await clearOtpSession(mobile10, normalizedOtpPurpose);
      }
      return {
        success: false,
        error: safeOtpError(res.status, data.error || data.message, "The OTP is invalid or expired. Please try again."),
        code: data?.code ? String(data.code) : undefined,
        retryAfterSeconds,
      };
    }

    await clearOtpSession(mobile10, normalizedOtpPurpose);
    await storeOtpVerificationToken(data.verificationToken || null);
    return { success: true, data };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      success: false,
      error: timedOut
        ? "OTP verification timed out. Check your connection and try again."
        : "OTP verification failed. Please try again.",
      code: timedOut ? "OTP_TIMEOUT" : "OTP_NETWORK_ERROR",
    };
  }
}
