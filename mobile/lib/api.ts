import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL, apiUrl } from "@/constants/api";

const GET_CACHE_TTL_MS = 20_000;
const REQUEST_TIMEOUT_MS = 15_000;
const AUTH_TOKEN_KEY = "connect_t_auth_token_v1";
const JOB_AUTH_TOKEN_KEY = "connect_t_job_auth_token_v1";
const OTP_VERIFICATION_KEY = "connect_t_otp_verification_v1";

const getCache = new Map<string, { at: number; data: unknown }>();
const inFlightGets = new Map<string, Promise<unknown>>();

export async function storeAuthToken(token?: string | null) {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.removeItem(OTP_VERIFICATION_KEY);
    clearGetCache();
  }
}

export async function clearAuthToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(OTP_VERIFICATION_KEY);
  clearGetCache();
}

export async function storeJobsAuthToken(token?: string | null) {
  if (token) {
    await AsyncStorage.setItem(JOB_AUTH_TOKEN_KEY, token);
    await AsyncStorage.removeItem(OTP_VERIFICATION_KEY);
    clearGetCache();
  }
}

export async function clearJobsAuthToken() {
  await AsyncStorage.removeItem(JOB_AUTH_TOKEN_KEY);
  clearGetCache();
}

export async function storeOtpVerificationToken(token?: string | null) {
  if (token) await AsyncStorage.setItem(OTP_VERIFICATION_KEY, token);
  else await AsyncStorage.removeItem(OTP_VERIFICATION_KEY);
}

function tokenPayload(token?: string | null): Record<string, any> | null {
  if (!token) return null;
  try {
    const encoded = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!encoded) return null;
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded));
  } catch {
    return null;
  }
}

function isUsableToken(token?: string | null) {
  const payload = tokenPayload(token);
  return !!payload?.exp && Number(payload.exp) > Math.floor(Date.now() / 1000);
}

function isSuperAdminToken(token?: string | null) {
  const payload = tokenPayload(token);
  return payload?.role === "super_admin" || payload?.isSuperAdmin === true;
}

export async function getStoredAuthToken() {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return isUsableToken(token) ? token : null;
}

export async function getStoredJobsAuthToken() {
  const token = await AsyncStorage.getItem(JOB_AUTH_TOKEN_KEY);
  return isUsableToken(token) ? token : null;
}

async function getAuthHeaders(path: string, body?: unknown) {
  const [civicToken, jobsToken, otpVerification] = await Promise.all([
    AsyncStorage.getItem(AUTH_TOKEN_KEY),
    AsyncStorage.getItem(JOB_AUTH_TOKEN_KEY),
    AsyncStorage.getItem(OTP_VERIFICATION_KEY),
  ]);
  const token = path.startsWith("/api/job-portal/")
    ? isSuperAdminToken(civicToken)
      ? civicToken
      : jobsToken || civicToken
    : civicToken;
  const headers: Record<string, string> = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (otpVerification) headers["X-OTP-Verification"] = otpVerification;

  return Object.keys(headers).length ? headers : undefined;
}

async function readError(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return parsed?.error || parsed?.message || text;
  } catch {
    return text;
  }
}

function cacheKey(path: string) {
  return apiUrl(path);
}

function clearGetCache() {
  getCache.clear();
}

function apiFailureMessage(method: string, path: string, url: string, error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error || "Unknown network error");
  return [
    `${method} ${path} failed`,
    `Base URL: ${API_BASE_URL}`,
    `Request URL: ${url}`,
    `Error: ${rawMessage}`,
  ].join("\n");
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

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const url = apiUrl(path);
  const key = cacheKey(path);

  if (method === "GET") {
    const cached = getCache.get(key);
    if (cached && Date.now() - cached.at < GET_CACHE_TTL_MS) {
      return cached.data as T;
    }

    const pending = inFlightGets.get(key);
    if (pending) return pending as Promise<T>;
  } else {
    clearGetCache();
  }

  const promise = (async () => {
    let res: Response;

    try {
      res = await fetchWithTimeout(url, {
        method,
        headers: await getAuthHeaders(path, body),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new Error(apiFailureMessage(method, path, url, error));
    }

    if (!res.ok) {
      throw new Error(
        [
          `${method} ${path} failed with ${res.status}`,
          `Base URL: ${API_BASE_URL}`,
          `Request URL: ${url}`,
          await readError(res, `${method} ${path} failed with ${res.status}`),
        ].join("\n"),
      );
    }

    if (res.status === 204) return {} as T;

    const text = await res.text().catch(() => "");
    const data = (text ? JSON.parse(text) : {}) as T;

    if (method === "GET") {
      getCache.set(key, { at: Date.now(), data });
    }

    return data;
  })();

  if (method === "GET") {
    inFlightGets.set(key, promise);
    promise.finally(() => inFlightGets.delete(key));
  }

  return promise;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export async function apiPut<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

export async function apiPatch<T = any>(path: string, body?: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}
