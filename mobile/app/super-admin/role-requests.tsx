import { AppScrollView } from "@/components/AppScrollView";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { apiGet, apiPatch, getUserErrorMessage } from "@/lib/api";

type RequestStatus = "pending" | "approved" | "rejected";

type RoleChangeRequest = {
  id: string;
  phone: string;
  userId: string;
  name?: string;
  company?: string;
  qualification?: string;
  currentRole: "seeker" | "employer";
  targetRole: "seeker" | "employer";
  reason: string;
  status: RequestStatus;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
};

const GREEN = "#16A34A";
const DARK = "#052E16";
const BG = "#F0F4F8";

function roleLabel(role: "seeker" | "employer") {
  return role === "employer" ? "Employer" : "Job Seeker";
}

function statusConfig(status: RequestStatus) {
  if (status === "approved") return { color: "#059669", bg: "#D1FAE5", icon: "check-circle" as const, label: "Approved" };
  if (status === "rejected") return { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" as const, label: "Rejected" };
  return { color: "#D97706", bg: "#FEF3C7", icon: "clock" as const, label: "Pending" };
}

export default function JobRoleRequestsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [activeStatus, setActiveStatus] = useState<RequestStatus>("pending");
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RoleChangeRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (status = activeStatus, refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setMessage("");
    try {
      const res = await apiGet<{ requests: RoleChangeRequest[] }>(`/api/job-portal/admin/role-change-requests?status=${status}`);
      setRequests(res.requests || []);
    } catch (err) {
      setMessage(getUserErrorMessage(err, "Role-change requests could not be loaded right now."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    void load(activeStatus);
  }, [activeStatus]);

  const counts = useMemo(() => ({
    visible: requests.length,
    seekerToEmployer: requests.filter((item) => item.currentRole === "seeker").length,
    employerToSeeker: requests.filter((item) => item.currentRole === "employer").length,
  }), [requests]);

  const openReview = (request: RoleChangeRequest, action: "approve" | "reject") => {
    setSelected(request);
    setReviewAction(action);
    setAdminNote("");
    setMessage("");
  };

  const closeReview = () => {
    if (submitting) return;
    setSelected(null);
    setReviewAction(null);
    setAdminNote("");
  };

  const submitReview = async () => {
    if (!selected || !reviewAction || submitting) return;
    setSubmitting(true);
    try {
      await apiPatch(`/api/job-portal/admin/role-change-requests/${selected.id}`, {
        action: reviewAction,
        adminNote: adminNote.trim() || undefined,
      });
      closeReview();
      await load(activeStatus);
      setMessage(reviewAction === "approve" ? "Role change approved successfully." : "Role change request rejected.");
    } catch (err) {
      setMessage(getUserErrorMessage(err, "This request could not be reviewed right now."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, "#166534", GREEN]} style={[s.header, { paddingTop: topPad + 12 }]}>
        <TopShade height={110} />
        <DecorativeCircles />
        <View style={s.headerBadge}><Feather name="repeat" size={10} color="#6EE7B7" /><Text style={s.headerBadgeText}>ROLE GOVERNANCE</Text></View>
        <Text style={s.headerTitle}>Job Portal Role Requests</Text>
        <Text style={s.headerSub}>Review genuine Job Seeker and Employer role corrections.</Text>
        <View style={s.statsRow}>
          <View style={s.stat}><Text style={s.statNumber}>{counts.visible}</Text><Text style={s.statLabel}>{activeStatus}</Text></View>
          <View style={s.statDivider} />
          <View style={s.stat}><Text style={[s.statNumber, { color: "#FDE68A" }]}>{counts.seekerToEmployer}</Text><Text style={s.statLabel}>To employer</Text></View>
          <View style={s.statDivider} />
          <View style={s.stat}><Text style={[s.statNumber, { color: "#BFDBFE" }]}>{counts.employerToSeeker}</Text><Text style={s.statLabel}>To seeker</Text></View>
        </View>
      </LinearGradient>

      <View style={s.filters}>
        {(["pending", "approved", "rejected"] as RequestStatus[]).map((status) => {
          const active = activeStatus === status;
          return (
            <TouchableOpacity key={status} onPress={() => setActiveStatus(status)} style={[s.filterButton, active && s.filterButtonActive]} activeOpacity={0.8}>
              <Text style={[s.filterText, active && s.filterTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {message ? <View style={s.messageBox}><Feather name="info" size={15} color={GREEN} /><Text style={s.messageText}>{message}</Text></View> : null}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={GREEN} size="large" /><Text style={s.loadingText}>Loading role requests...</Text></View>
      ) : (
        <AppScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: Math.max(insets.bottom, 8) + 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(activeStatus, true)} tintColor={GREEN} />}
          showsVerticalScrollIndicator={false}
        >
          {!requests.length ? (
            <View style={s.emptyCard}><View style={s.emptyIcon}><Feather name="check-circle" size={28} color={GREEN} /></View><Text style={s.emptyTitle}>No {activeStatus} requests</Text><Text style={s.emptyText}>Requests will appear here when citizens ask for a Job Portal role correction.</Text></View>
          ) : requests.map((request) => {
            const cfg = statusConfig(request.status);
            return (
              <View key={request.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}><Text style={s.avatarText}>{String(request.name || "U").charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{request.name || "Citizen"}</Text>
                    <Text style={s.phone}>+91 {request.phone}</Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: cfg.bg }]}><Feather name={cfg.icon} size={11} color={cfg.color} /><Text style={[s.statusText, { color: cfg.color }]}>{cfg.label}</Text></View>
                </View>

                <View style={s.roleFlow}>
                  <View style={s.roleBox}><Text style={s.roleSmall}>CURRENT</Text><Text style={s.roleValue}>{roleLabel(request.currentRole)}</Text></View>
                  <View style={s.arrow}><Feather name="arrow-right" size={17} color={GREEN} /></View>
                  <View style={[s.roleBox, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}><Text style={[s.roleSmall, { color: "#047857" }]}>REQUESTED</Text><Text style={[s.roleValue, { color: "#047857" }]}>{roleLabel(request.targetRole)}</Text></View>
                </View>

                <View style={s.reasonBox}><Text style={s.reasonLabel}>REASON</Text><Text style={s.reason}>{request.reason}</Text></View>
                <View style={s.metaRow}><Feather name="calendar" size={11} color="#94A3B8" /><Text style={s.metaText}>{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "Recently submitted"}</Text></View>
                {request.adminNote ? <View style={s.noteBox}><Text style={s.noteLabel}>ADMIN NOTE</Text><Text style={s.noteText}>{request.adminNote}</Text></View> : null}

                {request.status === "pending" ? (
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => openReview(request, "reject")} style={s.rejectButton}><Feather name="x" size={15} color="#DC2626" /><Text style={s.rejectText}>Reject</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => openReview(request, "approve")} style={s.approveButton}><Feather name="check" size={15} color="white" /><Text style={s.approveText}>Approve Change</Text></TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </AppScrollView>
      )}

      <Modal visible={!!selected && !!reviewAction} transparent animationType="fade" onRequestClose={closeReview}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIcon, { backgroundColor: reviewAction === "approve" ? "#D1FAE5" : "#FEE2E2" }]}><Feather name={reviewAction === "approve" ? "check-circle" : "x-circle"} size={28} color={reviewAction === "approve" ? "#059669" : "#DC2626"} /></View>
            <Text style={s.modalTitle}>{reviewAction === "approve" ? "Approve Role Change?" : "Reject Role Change?"}</Text>
            <Text style={s.modalText}>{selected ? `${selected.name || "This citizen"}: ${roleLabel(selected.currentRole)} → ${roleLabel(selected.targetRole)}` : ""}</Text>
            {reviewAction === "approve" ? <View style={s.approvalWarning}><Feather name="shield" size={15} color="#047857" /><Text style={s.approvalWarningText}>The active role lock will change. Existing records remain protected, and employer jobs are paused when moving to Job Seeker.</Text></View> : null}
            <Text style={s.noteInputLabel}>Admin note</Text>
            <TextInput value={adminNote} onChangeText={setAdminNote} placeholder={reviewAction === "approve" ? "Optional approval note" : "Reason for rejection"} placeholderTextColor="#94A3B8" multiline textAlignVertical="top" style={s.noteInput} />
            <View style={s.modalActions}><TouchableOpacity onPress={closeReview} style={s.cancelButton}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={submitReview} disabled={submitting} style={[s.submitButton, { backgroundColor: reviewAction === "approve" ? GREEN : "#DC2626" }, submitting && { opacity: 0.65 }]}>{submitting ? <ActivityIndicator color="white" /> : <Text style={s.submitText}>{reviewAction === "approve" ? "Approve" : "Reject"}</Text>}</TouchableOpacity></View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  headerBadge: { alignSelf: "flex-start", flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(110,231,183,0.14)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  headerBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", letterSpacing: 1.2 },
  headerTitle: { fontSize: 21, fontFamily: "Inter_700Bold", color: "white", marginTop: 7 },
  headerSub: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 3 },
  statsRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.11)", borderRadius: 14, padding: 10, marginTop: 13 },
  stat: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold", color: "white" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.62)", textTransform: "capitalize", marginTop: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.18)" },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 12 },
  filterButton: { flex: 1, minHeight: 39, borderRadius: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  filterButtonActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterText: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: "#64748B" },
  filterTextActive: { color: "white" },
  messageBox: { marginHorizontal: 14, marginTop: 10, flexDirection: "row", gap: 8, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 11 },
  messageText: { flex: 1, fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#166534" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 10 },
  emptyCard: { backgroundColor: "white", borderRadius: 18, padding: 28, alignItems: "center" },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 12, textTransform: "capitalize" },
  emptyText: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 17, marginTop: 5 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 10, shadowColor: "#166534", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold", color: GREEN },
  name: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" },
  phone: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
  statusPill: { flexDirection: "row", gap: 4, alignItems: "center", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  roleFlow: { flexDirection: "row", alignItems: "center", marginTop: 13 },
  roleBox: { flex: 1, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 10 },
  roleSmall: { fontSize: 8.5, fontFamily: "Inter_700Bold", color: "#94A3B8", letterSpacing: 0.8 },
  roleValue: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#334155", marginTop: 2 },
  arrow: { width: 34, alignItems: "center" },
  reasonBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 11, marginTop: 11 },
  reasonLabel: { fontSize: 8.5, fontFamily: "Inter_700Bold", color: "#94A3B8", letterSpacing: 0.8 },
  reason: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#334155", lineHeight: 17, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  metaText: { fontSize: 9.5, fontFamily: "Inter_400Regular", color: "#94A3B8" },
  noteBox: { backgroundColor: "#F1F5F9", borderRadius: 10, padding: 10, marginTop: 8 },
  noteLabel: { fontSize: 8.5, fontFamily: "Inter_700Bold", color: "#64748B" },
  noteText: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#475569", marginTop: 3 },
  actions: { flexDirection: "row", gap: 9, marginTop: 12 },
  rejectButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#FEF2F2", flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  rejectText: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: "#DC2626" },
  approveButton: { flex: 1.5, minHeight: 42, borderRadius: 12, backgroundColor: GREEN, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  approveText: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: "white" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 430, backgroundColor: "white", borderRadius: 22, padding: 22, alignItems: "center" },
  modalIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 12, textAlign: "center" },
  modalText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", marginTop: 6 },
  approvalWarning: { flexDirection: "row", gap: 8, backgroundColor: "#ECFDF5", borderRadius: 12, padding: 11, marginTop: 13 },
  approvalWarningText: { flex: 1, fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#166534", lineHeight: 16 },
  noteInputLabel: { width: "100%", fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: "#475569", marginTop: 14, marginBottom: 6 },
  noteInput: { width: "100%", minHeight: 84, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 13, padding: 12, fontSize: 12.5, fontFamily: "Inter_400Regular", color: "#0F172A" },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  cancelButton: { flex: 1, minHeight: 45, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#64748B" },
  submitButton: { flex: 1.2, minHeight: 45, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  submitText: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "white" },
});
