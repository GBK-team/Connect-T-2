import { API_BASE_URL } from "../constants/api";
import { storeOtpVerificationToken } from "./api";

const REQUEST_TIMEOUT_MS = 15_000;
const otpSessions = new Map<string, string>();

function sessionKey(mobile: string, purpose: string) {
  return `${String(mobile || "").replace(/\D/g, "").slice(-10)}:${purpose || "login"}`;
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

function otpApiUrl(path: string) {
  const base = String(API_BASE_URL || "https://newapp.e-bjp.in").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}


export async function sendRealOtp(mobile: string, purpose = "login") {
  try {
    const mobile10 = String(mobile || "").replace(/\D/g, "").slice(-10);

    if (mobile10.length !== 10) {
      return { success: false, error: "Enter valid 10-digit mobile number" };
    }

    const res = await fetchWithTimeout(otpApiUrl("/api/auth/send-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: mobile10, purpose }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || "Failed to send OTP",
      };
    }

    if (!data.sessionToken) {
      return { success: false, error: "OTP session was not created. Please try again." };
    }

    otpSessions.set(sessionKey(mobile10, purpose), String(data.sessionToken));
    await storeOtpVerificationToken(null);
    return { success: true, data };
  } catch {
    return { success: false, error: "Failed to send OTP. Please try again." };
  }
}

export async function verifyRealOtp(mobile: string, otp: string, purpose = "login") {
  try {
    const mobile10 = String(mobile || "").replace(/\D/g, "").slice(-10);
    const code = String(otp || "").replace(/\D/g, "");

    if (mobile10.length !== 10) {
      return { success: false, error: "Enter valid 10-digit mobile number" };
    }

    if (code.length !== 6) {
      return { success: false, error: "Enter 6-digit OTP" };
    }

    const key = sessionKey(mobile10, purpose);
    const sessionToken = otpSessions.get(key);
    if (!sessionToken) {
      return { success: false, error: "OTP session expired. Please request a new OTP." };
    }

    const res = await fetchWithTimeout(otpApiUrl("/api/auth/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: mobile10,
        otp: code,
        purpose,
        sessionToken,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || "Invalid OTP",
      };
    }

    otpSessions.delete(key);
    await storeOtpVerificationToken(data.verificationToken || null);
    return { success: true, data };
  } catch {
    return { success: false, error: "OTP verification failed. Please try again." };
  }
}
