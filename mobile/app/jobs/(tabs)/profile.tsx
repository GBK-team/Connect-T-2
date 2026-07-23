import { AppScrollView } from "@/components/AppScrollView";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useAuth } from "@/context/AuthContext";
import { CurrentStatus, JobsUser, useJobsAuth } from "@/context/JobsAuthContext";
import { apiGet, apiPost, getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";

type RoleRequest = {
  id: string;
  currentRole: "seeker" | "employer";
  targetRole: "seeker" | "employer";
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
};

function initials(name?: string) {
  return String(name || "CT").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function Input({ label, value, onChangeText, placeholder, multiline = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[s.input, multiline && s.textArea]}
      />
    </View>
  );
}

function DetailRow({ icon, label, value, border = true }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string; border?: boolean }) {
  return (
    <View style={[s.detailRow, border && s.rowBorder]}>
      <View style={s.detailIcon}><Feather name={icon} size={15} color={ORANGE} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value || "Not added"}</Text>
      </View>
    </View>
  );
}

function NoticeModal({ visible, title, message, tone = "info", onClose }: { visible: boolean; title: string; message: string; tone?: "info" | "success" | "danger"; onClose: () => void }) {
  const color = tone === "danger" ? "#DC2626" : tone === "success" ? "#059669" : ORANGE;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.noticeCard}>
          <View style={[s.noticeIcon, { backgroundColor: `${color}14` }]}><Feather name={tone === "success" ? "check-circle" : tone === "danger" ? "alert-circle" : "info"} size={26} color={color} /></View>
          <Text style={s.noticeTitle}>{title}</Text>
          <Text style={s.noticeMessage}>{message}</Text>
          <TouchableOpacity onPress={onClose} style={[s.noticeButton, { backgroundColor: color }]}><Text style={s.noticeButtonText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function JobPortalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { logout } = useAuth();
  const { jobsUser, updateJobsUser } = useJobsAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [reason, setReason] = useState("");
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", tone: "info" as "info" | "success" | "danger" });

  const [name, setName] = useState(jobsUser?.name || "");
  const [email, setEmail] = useState(jobsUser?.email || "");
  const [location, setLocation] = useState(jobsUser?.location || jobsUser?.address || "");
  const [qualification, setQualification] = useState(jobsUser?.qualification || "");
  const [skills, setSkills] = useState(jobsUser?.skills || "");
  const [experience, setExperience] = useState(jobsUser?.experience || "");
  const [languages, setLanguages] = useState(jobsUser?.languages || "");
  const [about, setAbout] = useState(jobsUser?.about || "");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>(jobsUser?.currentStatus || "unemployed");
  const [company, setCompany] = useState(jobsUser?.company || "");
  const [industry, setIndustry] = useState(jobsUser?.industry || "");
  const [companyDescription, setCompanyDescription] = useState(jobsUser?.companyDescription || "");
  const [whatsapp, setWhatsapp] = useState(jobsUser?.whatsapp || jobsUser?.phone || "");

  const isEmployer = jobsUser?.role === "employer";
  const activeRoleLabel = isEmployer ? "Employer" : "Job Seeker";
  const targetRoleLabel = isEmployer ? "Job Seeker" : "Employer";

  useEffect(() => {
    if (!jobsUser) return;
    apiGet<{ request: RoleRequest | null }>("/api/job-portal/role-change-requests/me")
      .then((res) => setRoleRequest(res.request || null))
      .catch(() => undefined);
  }, [jobsUser?.id]);

  useEffect(() => {
    if (!jobsUser) return;
    setName(jobsUser.name || "");
    setEmail(jobsUser.email || "");
    setLocation(jobsUser.location || jobsUser.address || "");
    setQualification(jobsUser.qualification || "");
    setSkills(jobsUser.skills || "");
    setExperience(jobsUser.experience || "");
    setLanguages(jobsUser.languages || "");
    setAbout(jobsUser.about || "");
    setCurrentStatus(jobsUser.currentStatus || "unemployed");
    setCompany(jobsUser.company || "");
    setIndustry(jobsUser.industry || "");
    setCompanyDescription(jobsUser.companyDescription || "");
    setWhatsapp(jobsUser.whatsapp || jobsUser.phone || "");
  }, [jobsUser?.id]);

  const profileRows = useMemo(() => {
    if (!jobsUser) return [];
    return isEmployer ? [
      { icon: "user" as const, label: "Owner / HR Name", value: jobsUser.name },
      { icon: "briefcase" as const, label: "Company", value: jobsUser.company },
      { icon: "phone" as const, label: "Verified Mobile", value: `+91 ${jobsUser.phone}` },
      { icon: "map-pin" as const, label: "Business Location", value: jobsUser.address || jobsUser.location },
    ] : [
      { icon: "user" as const, label: "Full Name", value: jobsUser.name },
      { icon: "phone" as const, label: "Verified Mobile", value: `+91 ${jobsUser.phone}` },
      { icon: "award" as const, label: "Qualification", value: jobsUser.qualification },
      { icon: "tool" as const, label: "Skills", value: jobsUser.skills },
      { icon: "map-pin" as const, label: "Preferred Location", value: jobsUser.location },
    ];
  }, [jobsUser, isEmployer]);

  if (!jobsUser) return null;

  const showNotice = (title: string, message: string, tone: "info" | "success" | "danger" = "info") => setNotice({ visible: true, title, message, tone });

  const saveProfile = async () => {
    if (saving) return;
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      showNotice("Check profile", "Enter your full name, including surname.", "danger");
      return;
    }
    setSaving(true);
    try {
      const common: Partial<JobsUser> = { name: name.trim(), email: email.trim() || undefined };
      if (isEmployer) {
        await updateJobsUser({
          ...common,
          company: company.trim(),
          contactPerson: name.trim(),
          industry: industry.trim() || undefined,
          companyDescription: companyDescription.trim() || undefined,
          address: location.trim() || undefined,
          location: location.trim() || undefined,
          whatsapp: whatsapp.replace(/\D/g, "").slice(-10) || jobsUser.phone,
        });
      } else {
        await updateJobsUser({
          ...common,
          qualification: qualification.trim() || undefined,
          skills: skills.trim() || undefined,
          experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined,
          languages: languages.trim() || undefined,
          about: about.trim() || undefined,
          currentStatus,
          location: location.trim() || undefined,
        });
      }
      setEditing(false);
      showNotice("Profile saved", "Your Job Portal profile has been updated.", "success");
    } catch (err) {
      showNotice("Save failed", getUserErrorMessage(err, "Please try again after some time."), "danger");
    } finally {
      setSaving(false);
    }
  };

  const submitRoleRequest = async () => {
    if (reason.trim().length < 10) {
      showNotice("More detail needed", "Explain the genuine reason for this role correction in at least 10 characters.", "danger");
      return;
    }
    setRequestLoading(true);
    try {
      const res = await apiPost<{ request: RoleRequest; message?: string }>("/api/job-portal/role-change-requests", {
        targetRole: isEmployer ? "seeker" : "employer",
        reason: reason.trim(),
      });
      setRoleRequest(res.request);
      setShowRequest(false);
      setReason("");
      showNotice("Request submitted", res.message || "Your request was sent to the Super Admin for review.", "success");
    } catch (err) {
      showNotice("Request not submitted", getUserErrorMessage(err, "Please try again after some time."), "danger");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login" as any);
  };

  const requestTone = roleRequest?.status === "approved" ? "#059669" : roleRequest?.status === "rejected" ? "#DC2626" : "#D97706";

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: topPad + 12 }]}>
        <TopShade height={112} />
        <DecorativeCircles />
        <View style={s.headerContent}>
          <View style={s.avatar}>
            {jobsUser.profilePhoto ? <Image source={{ uri: jobsUser.profilePhoto }} style={s.avatarImage} /> : <Text style={s.avatarText}>{initials(jobsUser.name)}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.userName} numberOfLines={1}>{jobsUser.name}</Text>
            <View style={s.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={s.rolePillText}>{activeRoleLabel}</Text><Feather name="lock" size={10} color="rgba(255,255,255,0.8)" /></View>
            <Text style={s.phone}>+91 {jobsUser.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => setEditing((value) => !value)} style={s.editButton}><Feather name={editing ? "x" : "edit-2"} size={17} color={ORANGE} /></TouchableOpacity>
        </View>
        <View style={s.lockSummary}><Feather name="shield" size={15} color="#FDE68A" /><Text style={s.lockSummaryText}>One verified account · One active Job Portal role</Text></View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AppScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 96 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {!editing ? (
            <>
              <View style={s.section}>
                <View style={s.sectionHeader}><Text style={s.sectionTitle}>PROFILE DETAILS</Text><TouchableOpacity onPress={() => setEditing(true)}><Text style={s.editLink}>Edit Profile</Text></TouchableOpacity></View>
                <View style={s.card}>{profileRows.map((row, index) => <DetailRow key={row.label} {...row} border={index < profileRows.length - 1} />)}</View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>JOB PORTAL ROLE</Text>
                <View style={s.roleLockCard}>
                  <View style={s.roleLockTop}><View style={s.roleLockIcon}><Feather name="lock" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.roleLockLabel}>ACTIVE ROLE</Text><Text style={s.roleLockTitle}>{activeRoleLabel}</Text></View><View style={s.lockedBadge}><Text style={s.lockedBadgeText}>LOCKED</Text></View></View>
                  <Text style={s.roleLockText}>Direct role switching is disabled to protect jobs, applications, employer records, and account identity.</Text>
                  {roleRequest ? (
                    <View style={[s.requestStatus, { borderColor: `${requestTone}40`, backgroundColor: `${requestTone}0D` }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Feather name={roleRequest.status === "approved" ? "check-circle" : roleRequest.status === "rejected" ? "x-circle" : "clock"} size={15} color={requestTone} /><Text style={[s.requestStatusTitle, { color: requestTone }]}>Request {roleRequest.status}</Text></View>
                      <Text style={s.requestStatusText}>{activeRoleLabel} → {targetRoleLabel}</Text>
                      {roleRequest.adminNote ? <Text style={s.adminNote}>Admin note: {roleRequest.adminNote}</Text> : null}
                      {roleRequest.status === "approved" ? <Text style={s.reopenText}>Reopen the Job Portal to load your approved role.</Text> : null}
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setShowRequest(true)} style={s.requestButton} activeOpacity={0.85}><Feather name="send" size={15} color="white" /><Text style={s.requestButtonText}>Request change to {targetRoleLabel}</Text></TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>ACCOUNT ACTIONS</Text>
                <View style={s.card}>
                  <TouchableOpacity style={[s.actionRow, s.rowBorder]} onPress={() => router.replace("/portal-select" as any)}><View style={s.actionIcon}><Feather name="repeat" size={16} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.actionTitle}>Switch Civic / Job Portal</Text><Text style={s.actionSub}>Keep the same verified login session</Text></View><Feather name="chevron-right" size={17} color="#94A3B8" /></TouchableOpacity>
                  <TouchableOpacity style={s.actionRow} onPress={handleLogout}><View style={[s.actionIcon, { backgroundColor: "#FEF2F2" }]}><Feather name="log-out" size={16} color="#DC2626" /></View><View style={{ flex: 1 }}><Text style={[s.actionTitle, { color: "#DC2626" }]}>Logout from Connect T</Text><Text style={s.actionSub}>Clear all sessions and return to login</Text></View><Feather name="chevron-right" size={17} color="#94A3B8" /></TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={s.section}>
              <Text style={s.sectionTitle}>EDIT {activeRoleLabel.toUpperCase()} PROFILE</Text>
              <View style={s.formCard}>
                <Input label="Full Name" value={name} onChangeText={setName} placeholder="Full name" />
                <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" />
                {isEmployer ? (
                  <>
                    <Input label="Company / Business Name" value={company} onChangeText={setCompany} placeholder="Business name" />
                    <Input label="Industry" value={industry} onChangeText={setIndustry} placeholder="Retail, Restaurant, Construction..." />
                    <Input label="Business Description" value={companyDescription} onChangeText={setCompanyDescription} placeholder="About your company" multiline />
                    <Input label="Business Location" value={location} onChangeText={setLocation} placeholder="Complete business address" multiline />
                    <Input label="WhatsApp Number" value={whatsapp} onChangeText={setWhatsapp} placeholder="10 digit number" />
                  </>
                ) : (
                  <>
                    <Input label="Qualification" value={qualification} onChangeText={setQualification} placeholder="Highest qualification" />
                    <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Your key skills" multiline />
                    <View style={s.inputGroup}><Text style={s.label}>Current Status</Text><View style={s.chips}>{(["fresher", "student", "unemployed", "employed"] as CurrentStatus[]).map((status) => <TouchableOpacity key={status} onPress={() => setCurrentStatus(status)} style={[s.chip, currentStatus === status && s.chipActive]}><Text style={[s.chipText, currentStatus === status && s.chipTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></TouchableOpacity>)}</View></View>
                    {currentStatus !== "fresher" && <Input label="Experience" value={experience} onChangeText={setExperience} placeholder="Work experience" multiline />}
                    <Input label="Preferred Job Category / Objective" value={about} onChangeText={setAbout} placeholder="Preferred work" multiline />
                    <Input label="Languages" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English" />
                    <Input label="Preferred Location" value={location} onChangeText={setLocation} placeholder="Badlapur East / West" />
                  </>
                )}
                <View style={s.formActions}><TouchableOpacity onPress={() => setEditing(false)} style={s.cancelEdit}><Text style={s.cancelEditText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={saveProfile} disabled={saving} style={[s.saveButton, saving && { opacity: 0.65 }]}>{saving ? <ActivityIndicator color="white" /> : <><Feather name="check" size={16} color="white" /><Text style={s.saveButtonText}>Save Profile</Text></>}</TouchableOpacity></View>
              </View>
            </View>
          )}
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRequest} transparent animationType="slide" onRequestClose={() => setShowRequest(false)}>
        <View style={[s.modalOverlay, { justifyContent: "flex-end", padding: 0 }]}>
          <View style={s.requestSheet}>
            <View style={s.handle} />
            <View style={s.requestHeader}><View style={s.requestHeaderIcon}><Feather name="repeat" size={21} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.requestTitle}>Request Role Correction</Text><Text style={s.requestSub}>{activeRoleLabel} → {targetRoleLabel}</Text></View><TouchableOpacity onPress={() => setShowRequest(false)} style={s.closeButton}><Feather name="x" size={18} color="#64748B" /></TouchableOpacity></View>
            <View style={s.warningBox}><Feather name="alert-triangle" size={16} color="#D97706" /><Text style={s.warningText}>Super Admin approval is required. Existing records are protected and reviewed before the active role changes.</Text></View>
            <Input label="Reason for role change *" value={reason} onChangeText={setReason} placeholder="Explain why this correction is required" multiline />
            <View style={s.formActions}><TouchableOpacity onPress={() => setShowRequest(false)} style={s.cancelEdit}><Text style={s.cancelEditText}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={submitRoleRequest} disabled={requestLoading} style={[s.saveButton, requestLoading && { opacity: 0.65 }]}>{requestLoading ? <ActivityIndicator color="white" /> : <><Feather name="send" size={15} color="white" /><Text style={s.saveButtonText}>Submit Request</Text></>}</TouchableOpacity></View>
          </View>
        </View>
      </Modal>

      <NoticeModal visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice((prev) => ({ ...prev, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 15, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "white" },
  userName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "white" },
  rolePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginTop: 5 },
  rolePillText: { fontSize: 10.5, fontFamily: "Inter_700Bold", color: "white" },
  phone: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", marginTop: 5 },
  editButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  lockSummary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 9, marginTop: 13 },
  lockSummaryText: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.86)" },
  content: { padding: 16 },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Inter_700Bold", color: "#94A3B8", letterSpacing: 1.2, marginBottom: 8 },
  editLink: { fontSize: 11.5, fontFamily: "Inter_700Bold", color: ORANGE },
  card: { backgroundColor: "white", borderRadius: 18, overflow: "hidden", shadowColor: "#B45309", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#94A3B8" },
  detailValue: { fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 2 },
  roleLockCard: { backgroundColor: "white", borderRadius: 18, padding: 15, shadowColor: "#B45309", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  roleLockTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  roleLockIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  roleLockLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#94A3B8", letterSpacing: 1 },
  roleLockTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 1 },
  lockedBadge: { backgroundColor: "#FFF7ED", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  lockedBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: ORANGE },
  roleLockText: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#64748B", lineHeight: 17, marginTop: 12 },
  requestButton: { marginTop: 13, minHeight: 44, borderRadius: 13, backgroundColor: ORANGE, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  requestButtonText: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "white" },
  requestStatus: { marginTop: 13, borderWidth: 1, borderRadius: 13, padding: 12 },
  requestStatusTitle: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  requestStatusText: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", color: "#334155", marginTop: 6 },
  adminNote: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 5 },
  reopenText: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: "#059669", marginTop: 6 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 13.5, fontFamily: "Inter_700Bold", color: "#0F172A" },
  actionSub: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 2 },
  formCard: { backgroundColor: "white", borderRadius: 18, padding: 15, shadowColor: "#B45309", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  inputGroup: { marginBottom: 13 },
  label: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: "#475569", marginBottom: 6 },
  input: { minHeight: 47, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 13, paddingHorizontal: 13, fontSize: 13.5, fontFamily: "Inter_400Regular", color: "#0F172A" },
  textArea: { minHeight: 90, paddingTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#F8FAFC" },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  chipTextActive: { color: "white" },
  formActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelEdit: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelEditText: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#64748B" },
  saveButton: { flex: 1.4, minHeight: 46, borderRadius: 13, backgroundColor: ORANGE, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  saveButtonText: { fontSize: 12.5, fontFamily: "Inter_700Bold", color: "white" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.58)", padding: 24, alignItems: "center", justifyContent: "center" },
  requestSheet: { width: "100%", backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 16 },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 14 },
  requestHeaderIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  requestTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" },
  requestSub: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  warningBox: { flexDirection: "row", gap: 9, backgroundColor: "#FFFBEB", borderRadius: 13, borderWidth: 1, borderColor: "#FDE68A", padding: 12, marginBottom: 14 },
  warningText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 16 },
  noticeCard: { width: "100%", maxWidth: 410, backgroundColor: "white", borderRadius: 22, padding: 22, alignItems: "center" },
  noticeIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  noticeTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 12, textAlign: "center" },
  noticeMessage: { fontSize: 12.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 19, marginTop: 7 },
  noticeButton: { minWidth: 120, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 18 },
  noticeButtonText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "white" },
});
