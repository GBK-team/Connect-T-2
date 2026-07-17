const API_BASE_URL = String(
  process.env.CONNECT_T_API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    "https://newapp.e-bjp.in",
).replace(/\/+$/, "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: body.mobile || body.phone,
        otp: body.otp,
        purpose: body.purpose || "login",
        sessionToken: body.sessionToken || body.session_token,
      }),
    });
    const data = await response.json().catch(() => ({ error: "OTP service returned an invalid response" }));
    return Response.json(data, { status: response.status });
  } catch {
    return Response.json({ success: false, valid: false, error: "OTP service is unavailable" }, { status: 502 });
  }
}
