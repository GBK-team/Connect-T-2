import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch, getUserErrorMessage } from "@/lib/api";

export interface Officer {
  id: string;
  name: string;
  mobile: string;
  ward: string;
  wardCode?: string | null;
  role: string;
  isSuperAdmin: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  dob?: string | null;
  address?: string | null;
  officeAddress?: string | null;
  residenceAddress?: string | null;
  officeTimings?: string | null;
  contactName?: string | null;
  contactNumber?: string | null;
  profilePhoto?: string | null;
  createdAt?: string;
}

type ApprovalStatus = "pending" | "approved" | "rejected";

function normalizeOfficer(item: any): Officer {
  return {
    id: String(item.id || item.nagarsevakId || item.nagarsevak_id || ""),
    name: String(item.name || "Unknown Officer"),
    mobile: String(item.mobile || item.phone || ""),
    ward: String(item.ward || "Not assigned"),
    wardCode: item.wardCode || item.ward_code || null,
    role: item.role || "nagarsevak",
    isSuperAdmin: Boolean(item.isSuperAdmin || item.is_super_admin),
    approvalStatus:
      item.approvalStatus === "approved" ||
      item.approvalStatus === "rejected" ||
      item.approvalStatus === "pending"
        ? item.approvalStatus
        : item.approval_status === "approved" || item.approval_status === "rejected" || item.approval_status === "pending"
          ? item.approval_status
          : "pending",
    dob: item.dob || item.dateOfBirth || item.date_of_birth || null,
    address: item.address || null,
    officeAddress: item.officeAddress || item.office_address || null,
    residenceAddress: item.residenceAddress || item.residence_address || item.address || null,
    officeTimings: item.officeTimings || item.office_timings || null,
    contactName: item.contactName || item.contact_name || item.name || null,
    contactNumber: item.contactNumber || item.contact_number || item.mobile || item.phone || null,
    profilePhoto: item.profilePhoto || item.profile_photo || null,
    createdAt: item.createdAt || item.created_at,
  };
}

export function useOfficers(statusFilter?: ApprovalStatus) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const data = await apiGet<any>(`/api/auth/officers${query}`);

      setOfficers((data.officers || []).map(normalizeOfficer));
    } catch (e: unknown) {
      setError(getUserErrorMessage(e, "Nagarsevak records could not be loaded. Please try again."));
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchOfficers();
  }, [fetchOfficers]);

  const approveOfficer = async (
    id: string,
    approvalStatus: "approved" | "rejected",
  ) => {
    try {
      const data = await apiPatch<any>("/api/auth/officers", {
        id,
        approvalStatus,
      });

      setOfficers((prev) =>
        prev.map((o) => (o.id === id ? { ...o, approvalStatus } : o)),
      );

      return data;
    } catch (e: unknown) {
      return {
        success: false,
        message: getUserErrorMessage(e, "Nagarsevak status could not be updated. Please try again."),
      };
    }
  };

  return {
    officers,
    loading,
    error,
    refetch: fetchOfficers,
    approveOfficer,
  };
}
