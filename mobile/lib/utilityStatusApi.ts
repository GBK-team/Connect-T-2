import { apiDelete, apiGet, apiPost } from "@/lib/api";

export type UtilityType = "water" | "electricity";

export type UtilityStatus = {
  id: string;
  ward: string;
  wardCode?: string | null;
  utilityType: UtilityType;
  title: string;
  status: string;
  hoursPerDay?: string | null;
  scheduleText?: string | null;
  description?: string | null;
  helpline?: string | null;
  source?: string | null;
  postedById?: string | null;
  postedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function statusIsOk(status?: string) {
  const key = String(status || "").toLowerCase();
  return key === "normal" || key === "available" || key === "active" || key === "completed";
}

export function displayUtilityStatus(status?: string) {
  const key = String(status || "").toLowerCase();
  if (key === "normal") return "Normal";
  if (key === "reduced") return "Reduced";
  if (key === "outage") return "Outage";
  if (key === "maintenance") return "Maintenance";
  if (key === "available") return "Available";
  return status ? String(status) : "No Update";
}

export function utilityLastUpdated(value?: string) {
  if (!value) return "not updated";
  const ts = new Date(value).getTime();
  if (!ts) return "not updated";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export async function fetchUtilityStatuses(ward?: string | null, wardCode?: string | null) {
  const query = new URLSearchParams();
  if (ward) query.set("ward", ward);
  if (wardCode) query.set("ward_code", wardCode);
  const res = await apiGet<{ success: boolean; statuses: UtilityStatus[] }>(`/api/utility-status?${query.toString()}`);
  return Array.isArray(res.statuses) ? res.statuses : [];
}

export async function postUtilityStatus(input: {
  ward?: string | null;
  wardCode?: string | null;
  utilityType: UtilityType;
  title?: string;
  status: string;
  hoursPerDay?: string;
  scheduleText?: string;
  description?: string;
  helpline?: string;
  source?: string;
}) {
  return apiPost<{ success: boolean; statusId: string }>("/api/utility-status", input);
}

export async function deleteUtilityStatus(id: string) {
  return apiDelete<{ success: boolean; statusId: string }>(`/api/utility-status/${encodeURIComponent(id)}`);
}
