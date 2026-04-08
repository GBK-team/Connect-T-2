import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Modal, TextInput, FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useComplaints, Complaint, ComplaintStatus } from "@/context/ComplaintContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useLanguage } from "@/context/LanguageContext";

const statusLabelKeys: Record<ComplaintStatus, string> = {
  submitted: "submitted",
  assigned: "assigned",
  in_progress: "inProgress",
  resolved: "resolved",
  rejected: "rejected",
};

const statusConfig: Record<ComplaintStatus, { color: string; bg: string; icon: string }> = {
  submitted: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  assigned: { color: "#2563EB", bg: "#DBEAFE", icon: "user-check" },
  in_progress: { color: "#7C3AED", bg: "#EDE9FE", icon: "tool" },
  resolved: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  rejected: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

const categoryConfig: Record<string, { icon: string; color: string }> = {
  roads: { icon: "truck", color: "#92400E" },
  water: { icon: "droplet", color: "#0369A1" },
  electricity: { icon: "zap", color: "#D97706" },
  garbage: { icon: "trash-2", color: "#059669" },
  drainage: { icon: "git-merge", color: "#0EA5E9" },
  streetlight: { icon: "sun", color: "#7C3AED" },
  encroachment: { icon: "alert-triangle", color: "#DC2626" },
  other: { icon: "more-horizontal", color: "#475569" },
};

const nextStatusLabelKeys: Record<ComplaintStatus, string[]> = {
  submitted: ["assignToTeam", "reject"],
  assigned: ["markInProgress", "reject"],
  in_progress: ["markResolved", "reject"],
  resolved: [],
  rejected: [],
};

const nextStatusOptions: Record<ComplaintStatus, { status: ComplaintStatus; color: string }[]> = {
  submitted: [{ status: "assigned", color: "#2563EB" }, { status: "rejected", color: "#DC2626" }],
  assigned: [{ status: "in_progress", color: "#7C3AED" }, { status: "rejected", color: "#DC2626" }],
  in_progress: [{ status: "resolved", color: "#059669" }, { status: "rejected", color: "#DC2626" }],
  resolved: [],
  rejected: [],
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

function ActionModal({ complaint, onClose, onUpdate }: { complaint: Complaint; onClose: () => void; onUpdate: (s: ComplaintStatus, note: string) => void }) {
  const [note, setNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | null>(null);
  const { t } = useLanguage();
  const options = nextStatusOptions[complaint.status] || [];
  const optionLabelKeys = nextStatusLabelKeys[complaint.status] || [];

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <Text style={modalStyles.title}>{t("updateComplaint")}</Text>
        <Text style={modalStyles.cmpId}># {complaint.id}</Text>
        <Text style={modalStyles.cmpName} numberOfLines={2}>{complaint.title}</Text>
        <View style={modalStyles.cmpLocation}>
          <Feather name="map-pin" size={12} color="#94A3B8" />
          <Text style={modalStyles.cmpLocationText}>{complaint.location}</Text>
        </View>

        <Text style={modalStyles.label}>{t("selectAction")}</Text>
        <View style={modalStyles.optionRow}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={opt.status}
              style={[modalStyles.optionBtn, { borderColor: opt.color + "40" }, selectedStatus === opt.status && { backgroundColor: opt.color, borderColor: opt.color }]}
              onPress={() => setSelectedStatus(opt.status)}
              activeOpacity={0.8}
            >
              <Feather name={statusConfig[opt.status].icon as any} size={14} color={selectedStatus === opt.status ? "white" : opt.color} />
              <Text style={[modalStyles.optionText, { color: selectedStatus === opt.status ? "white" : opt.color }]}>{t(optionLabelKeys[idx])}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={modalStyles.label}>{t("noteResolution")}</Text>
        <TextInput style={modalStyles.noteInput} value={note} onChangeText={setNote} placeholder={t("addNoteForCitizen")} placeholderTextColor="#CBD5E1" multiline numberOfLines={3} textAlignVertical="top" />

        <View style={modalStyles.btnRow}>
          <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={modalStyles.cancelBtnText}>{t("cancel")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.confirmBtn, !selectedStatus && { opacity: 0.5 }]}
            onPress={() => { if (!selectedStatus) return; onUpdate(selectedStatus, note); onClose(); }}
            disabled={!selectedStatus}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#1E40AF", "#2563EB"]} style={modalStyles.confirmBtnGrad}>
              <Text style={modalStyles.confirmBtnText}>{t("updateStatus")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DetailedComplaintCard({ complaint, onAction }: { complaint: Complaint; onAction: () => void }) {
  const { t } = useLanguage();
  const st = statusConfig[complaint.status];
  const cat = categoryConfig[complaint.category] || categoryConfig.other;
  const hasActions = (nextStatusOptions[complaint.status] || []).length > 0;
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/complaint/[id]", params: { id: complaint.id } })}
      activeOpacity={0.92}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.catDot, { backgroundColor: cat.color + "20" }]}>
          <Feather name={cat.icon as any} size={14} color={cat.color} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cmpTitle} numberOfLines={1}>{complaint.title}</Text>
          <Text style={styles.cmpMeta}>{timeAgo(complaint.createdAt)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Feather name={st.icon as any} size={9} color={st.color} />
          <Text style={[styles.statusPillText, { color: st.color }]}>{t(statusLabelKeys[complaint.status])}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={11} color="#94A3B8" />
          <Text style={styles.metaText} numberOfLines={1}>{complaint.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="home" size={11} color="#94A3B8" />
          <Text style={styles.metaText}>{complaint.ward}</Text>
        </View>
        <Text style={styles.descText} numberOfLines={2}>{complaint.description}</Text>

        <View style={styles.citizenInfoRow}>
          <View style={styles.citizenInfoChip}>
            <Feather name="user" size={10} color="#2563EB" />
            <Text style={styles.citizenInfoText}>{(complaint as any).userName || t("citizen")}</Text>
          </View>
          <View style={styles.citizenInfoChip}>
            <Feather name="calendar" size={10} color="#64748B" />
            <Text style={styles.citizenInfoText}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>
      {hasActions && (
        <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation?.(); onAction(); }} activeOpacity={0.85}>
          <LinearGradient colors={["#065F46", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionBtnGrad}>
            <Feather name="edit-3" size={13} color="white" />
            <Text style={styles.actionBtnText}>{t("updateStatus")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {complaint.status === "resolved" && (
        <View style={styles.resolvedBar}>
          <Feather name="check-circle" size={12} color="#059669" />
          <Text style={styles.resolvedBarText}>{complaint.resolvedNote || t("issueResolved")}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();
  const { complaints, updateStatus } = useComplaints();
  const router = useRouter();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const [active, setActive] = useState<Complaint | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!user || user.role !== "nagarsevak") {
    return (
      <View style={{ flex: 1, backgroundColor: "#ebeffc", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Feather name="lock" size={48} color="#CBD5E1" />
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#475569", marginTop: 16, fontFamily: "Inter_700Bold" }}>{t("nagarsevakOnly")}</Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 8, textAlign: "center", fontFamily: "Inter_400Regular" }}>{t("nagarsevakOnlyDesc")}</Text>
        <TouchableOpacity onPress={() => router.push("/login")} style={{ backgroundColor: "#1E40AF", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 24 }} activeOpacity={0.85}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" }}>{t("loginBtn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const wardComplaints = user?.ward ? complaints.filter((c) => c.ward === user.ward) : complaints;
  const filtered = filter === "all" ? wardComplaints : wardComplaints.filter((c) => c.status === filter);
  const pending = wardComplaints.filter((c) => c.status === "submitted").length;
  const activeCount = wardComplaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length;
  const resolvedCount = wardComplaints.filter((c) => c.status === "resolved").length;

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#ebeffc" }}>
      <LinearGradient colors={["#065F46", "#047857", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <View style={styles.adminBadge}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={[styles.adminBadgeText, { color: "#6EE7B7" }]}>NAGARSEVAK</Text>
            </View>
            <Text style={styles.headerTitle}>{user?.name}</Text>
            <Text style={styles.headerSub}>{user?.ward || "Ulhasnagar"}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowLogoutModal(true)} style={styles.logoutBtn} activeOpacity={0.8}>
            <Feather name="log-out" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        <View style={styles.statPills}>
          {[
            { label: t("pending"), count: pending, color: "#FDE68A", icon: "clock" },
            { label: t("active"), count: activeCount, color: "#C4B5FD", icon: "tool" },
            { label: t("resolved"), count: resolvedCount, color: "#6EE7B7", icon: "check-circle" },
            { label: t("total"), count: wardComplaints.length, color: "#93C5FD", icon: "list" },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <Feather name={s.icon as any} size={14} color={s.color} />
              <Text style={[styles.statPillNum, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statPillLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 2 }}>
          {(["all", "submitted", "assigned", "in_progress", "resolved"] as const).map((s) => (
            <TouchableOpacity key={s} style={[styles.filterChip, filter === s && styles.filterChipActive]} onPress={() => setFilter(s)} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === s && { color: "white" }]}>
                {s === "all" ? t("viewAll") : t(statusLabelKeys[s])}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {pending > 0 && (
        <View style={styles.urgentBanner}>
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.urgentText}>{pending} {t("complaints")} — {t("needsAttention")}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <DetailedComplaintCard complaint={item} onAction={() => setActive(item)} />}
        contentContainerStyle={[{ padding: 14 }, { paddingBottom: Math.max(insets.bottom, 8) + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>{t("noComplaintsInCategory")}</Text>
          </View>
        }
      />

      {active && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setActive(null)}>
          <ActionModal complaint={active} onClose={() => setActive(null)} onUpdate={(st, note) => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            updateStatus(active.id, st, note, user?.name || "Nagarsevak");
          }} />
        </Modal>
      )}

      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalSheet}>
            <View style={styles.logoutModalIconWrap}>
              <Feather name="log-out" size={28} color="#DC2626" />
            </View>
            <Text style={styles.logoutModalTitle}>{t("logout")}</Text>
            <Text style={styles.logoutModalBody}>{t("logoutConfirm")}</Text>
            <View style={styles.logoutModalBtnRow}>
              <TouchableOpacity style={styles.logoutModalCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={styles.logoutModalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutModalConfirmBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Feather name="log-out" size={15} color="white" />
                <Text style={styles.logoutModalConfirmText}>{t("yesLogout")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(110,231,183,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  adminBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  statPills: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 10, marginBottom: 12, alignItems: "center", gap: 0 },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statPillNum: { fontSize: 20, fontWeight: "900", fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)" },
  filterChipActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", fontFamily: "Inter_600SemiBold" },
  urgentBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEE2E2", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#FECACA" },
  urgentText: { fontSize: 12, fontWeight: "700", color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  card: { backgroundColor: "white", borderRadius: 16, marginBottom: 10, overflow: "hidden", shadowColor: "#065F46", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  catDot: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardHeaderText: { flex: 1 },
  cmpTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  cmpMeta: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusPillText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", flex: 1 },
  descText: { fontSize: 12, color: "#475569", fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 4 },
  citizenInfoRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  citizenInfoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  citizenInfoText: { fontSize: 10, color: "#475569", fontFamily: "Inter_400Regular" },
  actionBtn: { marginHorizontal: 14, marginBottom: 14, borderRadius: 12, overflow: "hidden" },
  actionBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  resolvedBar: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D1FAE5", paddingHorizontal: 14, paddingVertical: 8 },
  resolvedBarText: { fontSize: 11, color: "#065F46", fontFamily: "Inter_400Regular", flex: 1 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  logoutModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 },
  logoutModalSheet: { backgroundColor: "white", borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 10 },
  logoutModalIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  logoutModalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  logoutModalBody: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  logoutModalBtnRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  logoutModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  logoutModalCancelText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  logoutModalConfirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#DC2626" },
  logoutModalConfirmText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 4 },
  cmpId: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", marginBottom: 2 },
  cmpName: { fontSize: 13, color: "#475569", fontFamily: "Inter_400Regular", marginBottom: 4, lineHeight: 18 },
  cmpLocation: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  cmpLocationText: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  optionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  optionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, backgroundColor: "white" },
  optionText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  noteInput: { borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: "#0F172A", fontFamily: "Inter_400Regular", height: 90, marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", backgroundColor: "#F1F5F9" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B", fontFamily: "Inter_700Bold" },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  confirmBtnGrad: { paddingVertical: 14, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
});
