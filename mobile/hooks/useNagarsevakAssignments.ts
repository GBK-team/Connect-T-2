import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch, getUserErrorMessage } from "@/lib/api";

export type NagarsevakAccessStatus = "active" | "inactive" | "revoked";

export interface NagarsevakAssignment {
  id: string;
  userId?: string | null;
  name: string;
  mobile: string;
  wardOrDesignation: string;
  wardCode?: string | null;
  status: NagarsevakAccessStatus;
  source: string;
  sourceSerial?: number | null;
  lastLoginAt?: string | null;
  hasLoggedIn: boolean;
  createdAt?: string | null;
}

function normalize(item: any): NagarsevakAssignment {
  const designation = String(item.wardOrDesignation || item.ward_or_designation || "Not assigned");
  return {
    id: String(item.id || ""),
    userId: item.userId || item.user_id || null,
    name: String(item.name || item.displayName || item.display_name || "Unknown Officer"),
    mobile: String(item.mobile || item.normalized_phone || "").replace(/\D/g, "").slice(-10),
    wardOrDesignation: designation,
    wardCode: designation.match(/\d{1,2}/)?.[0] || null,
    status: item.status === "inactive" || item.status === "revoked" ? item.status : "active",
    source: String(item.source || "admin"),
    sourceSerial: item.sourceSerial ?? item.source_serial ?? null,
    lastLoginAt: item.lastLoginAt || item.last_login_at || null,
    hasLoggedIn: !!(item.hasLoggedIn ?? item.lastLoginAt ?? item.last_login_at),
    createdAt: item.createdAt || item.created_at || null,
  };
}

export function useNagarsevakAssignments() {
  const [assignments, setAssignments] = useState<NagarsevakAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const data = await apiGet<any>(`/api/super-admin/nagarsevaks${query}`);
      setAssignments((data.assignments || []).map(normalize));
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, "Nagarsevak records could not be loaded."));
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (id: string, status: NagarsevakAccessStatus) => {
    await apiPatch(`/api/super-admin/nagarsevaks/${id}`, { status });
    await refetch();
  };

  useEffect(() => { void refetch(); }, [refetch]);

  return { assignments, loading, error, refetch, updateStatus };
}
