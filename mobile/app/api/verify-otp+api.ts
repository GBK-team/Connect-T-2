import { buildApiUrl, normalizeApiBaseUrl } from "@/constants/api";
import { safeUserMessage } from "@/lib/errorSafety";

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.CONNECT_T_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    "https://newapp.e-bjp.in",
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(buildApiUrl("/api/auth/verify-otp", API_BASE_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: body.mobile || body.phone,
        otp: body.otp,
        purpose: body.purpose || "login",
        sessionToken: body.sessionToken || body.session_token,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      const fallback = response.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : "The OTP is invalid or expired. Please try again.";
      return Response.json(
        { success: false, valid: false, error: safeUserMessage(data?.error || data?.message, fallback) },
        { status: response.status === 404 ? 502 : response.status },
      );
    }
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ success: false, valid: false, error: "OTP service is unavailable" }, { status: 502 });
  }
}
