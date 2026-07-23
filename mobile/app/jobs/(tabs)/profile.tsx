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

import { AppScrollView } from "@/components/AppScrollView";
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
};

function initials(name?: string) {
  return String(name || "CT").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function Input({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#94A3B8"
        style={[s.input, multiline && s.textArea, props.style]}
        returnKeyType={multiline ? "default" : "next"}
        blurOnSubmit={!multiline}
      />
    </View>
  );
}

function Detail({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string }) {
  return (
    <View style={s.detail}>
      <View style={s.detailIcon}><Feather name={icon} size={15} color={ORANGE} /></View>
      <View style={{ flex: 1 }}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{value || "Not added"}</Text></View>
    </View>
  );
}

function Notice({ visible, title, message, tone, onClose }: { visible: boolean; title: string; message: string; tone: "success" | "danger" | "info"; onClose: () => void }) {
  const color = tone === "success" ? "#059669" : tone === "danger" ? "#DC2626" : ORANGE;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}><View style={s.noticeCard}>
        <View style={[s.noticeIcon, { backgroundColor: `${color}14` }]}><Feather name={tone === "success" ? "check-circle" : tone === "danger" ? "alert-circle" : "info"} size={27} color={color} /></View>
        <Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeText}>{message}</Text>
        <TouchableOpacity style={[s.noticeButton, { backgroundColor: color }]} onPress={onClose}><Text style={s.noticeButtonText}>OK</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

export default function JobPortalProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { jobsUser, updateJobsUser } = useJobsAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", tone: "info" as "success" | "danger" | "info" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [about, setAbout] = useState("");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>("unemployed");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const isEmployer = jobsUser?.role === "employer";
  const roleLabel = isEmployer ? "Employer" : "Job Seeker";
  const targetRoleLabel = isEmployer ? "Job Seeker" : "Employer";

  useEffect(() => {
    if (!jobsUser) return;
    setName(jobsUser.name || "");
    setEmail(jobsUser.email || "");
    setLocation(jobsUser.address || jobsUser.location || "");
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
    void apiGet<{ request: RoleRequest | null }>("/api/job-portal/role-change-requests/me")
      .then((result) => setRoleRequest(result.request || null))
      .catch(() => undefined);
  }, [jobsUser?.id]);

  const details = useMemo(() => {
    if (!jobsUser) return [];
    return isEmployer ? [
      { icon: "briefcase" as const, label: "Company / Business", value: jobsUser.company },
      { icon: "user" as const, label: "Owner / HR Name", value: jobsUser.name },
      { icon: "map-pin" as const, label: "Business Location", value: jobsUser.address || jobsUser.location },
      { icon: "phone" as const, label: "Verified Mobile", value: `+91 ${jobsUser.phone}` },
    ] : [
      { icon: "user" as const, label: "Full Name", value: jobsUser.name },
      { icon: "award" as const, label: "Qualification", value: jobsUser.qualification },
      { icon: "tool" as const, label: "Skills", value: jobsUser.skills },
      { icon: "map-pin" as const, label: "Preferred Location", value: jobsUser.location },
      { icon: "phone" as const, label: "Verified Mobile", value: `+91 ${jobsUser.phone}` },
    ];
  }, [isEmployer, jobsUser]);

  if (!jobsUser) return <View style={s.center}><ActivityIndicator color={ORANGE} /><Text style={s.loadingText}>Loading profile...</Text></View>;

  const showNotice = (title: string, message: string, tone: "success" | "danger" | "info" = "info") => setNotice({ visible: true, title, message, tone });

  const save = async () => {
    if (saving) return;
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return showNotice("Check full name", "Enter your full name, including surname.", "danger");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return showNotice("Check email", "Enter a valid email address.", "danger");
    if (isEmployer && company.trim().length < 2) return showNotice("Company required", "Enter your company, shop or business name.", "danger");
    if (!isEmployer && qualification.trim().length < 2) return showNotice("Qualification required", "Add your highest qualification.", "danger");

    setSaving(true);
    try {
      const common: Partial<JobsUser> = { name: name.trim(), email: email.trim() || undefined };
      await updateJobsUser(isEmployer ? {
        ...common,
        company: company.trim(),
        contactPerson: name.trim(),
        industry: industry.trim() || undefined,
        companyDescription: companyDescription.trim() || undefined,
        address: location.trim() || undefined,
        location: location.trim() || undefined,
        whatsapp: whatsapp.replace(/\D/g, "").slice(-10) || jobsUser.phone,
      } : {
        ...common,
        qualification: qualification.trim(),
        skills: skills.trim() || undefined,
        experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined,
        languages: languages.trim() || undefined,
        about: about.trim() || undefined,
        currentStatus,
        location: location.trim() || undefined,
      });
      setEditing(false);
      showNotice("Profile saved", "Your Job Portal profile has been updated successfully.", "success");
    } catch (error) {
      showNotice("Profile not saved", getUserErrorMessage(error, "Please try again after some time."), "danger");
    } finally {
      setSaving(false);
    }
  };

  const submitRoleRequest = async () => {
    if (reason.trim().length < 10) return showNotice("More detail required", "Explain the genuine reason for this role correction in at least 10 characters.", "danger");
    setRequestLoading(true);
    try {
      const result = await apiPost<{ request: RoleRequest; message?: string }>("/api/job-portal/role-change-requests", { targetRole: isEmployer ? "seeker" : "employer", reason: reason.trim() });
      setRoleRequest(result.request);
      setShowRequest(false);
      setReason("");
      showNotice("Request submitted", result.message || "Your request was sent to the Super Admin.", "success");
    } catch (error) {
      showNotice("Request not submitted", getUserErrorMessage(error, "Please try again after some time."), "danger");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login" as any);
  };

  const requestColor = roleRequest?.status === "approved" ? "#059669" : roleRequest?.status === "rejected" ? "#DC2626" : "#D97706";

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.profileRow}><View style={s.avatar}>{jobsUser.profilePhoto ? <Image source={{ uri: jobsUser.profilePhoto }} style={s.avatarImage} /> : <Text style={s.avatarText}>{initials(jobsUser.name)}</Text>}</View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.name} numberOfLines={1}>{jobsUser.name}</Text><View style={s.rolePill}><Feather name={isEmployer ? "briefcase" : "user"} size={11} color="white" /><Text style={s.rolePillText}>{roleLabel}</Text><Feather name="lock" size={10} color="rgba(255,255,255,0.8)" /></View><Text style={s.phone}>+91 {jobsUser.phone}</Text></View><TouchableOpacity style={s.editButton} onPress={() => setEditing((value) => !value)}><Feather name={editing ? "x" : "edit-2"} size={17} color={ORANGE} /></TouchableOpacity></View>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <AppScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 120 }]} automaticallyAdjustKeyboardInsets keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          {editing ? (
            <View style={s.formCard}>
              <Text style={s.sectionTitle}>EDIT {roleLabel.toUpperCase()} PROFILE</Text>
              <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Full name" autoCapitalize="words" />
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
              {isEmployer ? <>
                <Input label="Company / Business Name *" value={company} onChangeText={setCompany} placeholder="Business name" />
                <Input label="Industry" value={industry} onChangeText={setIndustry} placeholder="Retail, Restaurant, Construction..." />
                <Input label="Business Description" value={companyDescription} onChangeText={setCompanyDescription} placeholder="About your business" multiline />
                <Input label="Business Location" value={location} onChangeText={setLocation} placeholder="Complete business address" multiline />
                <Input label="WhatsApp Number" value={whatsapp} onChangeText={setWhatsapp} placeholder="10 digit number" keyboardType="phone-pad" />
              </> : <>
                <Input label="Qualification *" value={qualification} onChangeText={setQualification} placeholder="Highest qualification" />
                <Input label="Skills" value={skills} onChangeText={setSkills} placeholder="Your key skills" multiline />
                <Text style={s.label}>Current Status</Text><View style={s.chips}>{(["fresher", "student", "unemployed", "employed"] as CurrentStatus[]).map((status) => <TouchableOpacity key={status} style={[s.chip, currentStatus === status && s.chipActive]} onPress={() => setCurrentStatus(status)}><Text style={[s.chipText, currentStatus === status && s.chipTextActive]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></TouchableOpacity>)}</View>
                {currentStatus !== "fresher" ? <Input label="Experience" value={experience} onChangeText={setExperience} placeholder="Work experience" multiline /> : null}
                <Input label="Preferred Job / Objective" value={about} onChangeText={setAbout} placeholder="Preferred work" multiline />
                <Input label="Languages" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English" />
                <Input label="Preferred Location" value={location} onChangeText={setLocation} placeholder="Badlapur East / West" />
              </>}
              <View style={s.actions}><TouchableOpacity style={s.secondary} onPress={() => setEditing(false)}><Text style={s.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.primary, saving && { opacity: 0.65 }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <><Feather name="check" size={15} color="white" /><Text style={s.primaryText}>Save Profile</Text></>}</TouchableOpacity></View>
            </View>
          ) : <>
            <Text style={s.sectionTitle}>PROFILE DETAILS</Text><View style={s.card}>{details.map((item) => <Detail key={item.label} {...item} />)}</View>
            <Text style={s.sectionTitle}>JOB PORTAL ROLE</Text><View style={s.roleCard}><View style={s.roleTop}><View style={s.lockIcon}><Feather name="lock" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.roleSmall}>ACTIVE ROLE</Text><Text style={s.roleTitle}>{roleLabel}</Text></View><View style={s.lockBadge}><Text style={s.lockBadgeText}>LOCKED</Text></View></View><Text style={s.roleDescription}>Direct switching is disabled to protect jobs, applications and verified identity.</Text>{roleRequest ? <View style={[s.requestStatus, { borderColor: `${requestColor}40`, backgroundColor: `${requestColor}0D` }]}><Text style={[s.requestTitle, { color: requestColor }]}>Role request {roleRequest.status}</Text><Text style={s.requestText}>{roleLabel} → {targetRoleLabel}</Text>{roleRequest.adminNote ? <Text style={s.adminNote}>Admin note: {roleRequest.adminNote}</Text> : null}</View> : <TouchableOpacity style={s.requestButton} onPress={() => setShowRequest(true)}><Feather name="send" size={14} color="white" /><Text style={s.requestButtonText}>Request change to {targetRoleLabel}</Text></TouchableOpacity>}</View>
            <Text style={s.sectionTitle}>ACCOUNT ACTIONS</Text><View style={s.card}><TouchableOpacity style={s.actionRow} onPress={() => router.replace("/portal-select" as any)}><Feather name="repeat" size={16} color={ORANGE} /><View style={{ flex: 1 }}><Text style={s.actionTitle}>Switch Civic / Job Portal</Text><Text style={s.actionSub}>Keep the same verified login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity><TouchableOpacity style={s.actionRow} onPress={handleLogout}><Feather name="log-out" size={16} color="#DC2626" /><View style={{ flex: 1 }}><Text style={[s.actionTitle, { color: "#DC2626" }]}>Logout from Connect T</Text><Text style={s.actionSub}>Clear all sessions and return to login</Text></View><Feather name="chevron-right" size={17} color="#CBD5E1" /></TouchableOpacity></View>
          </>}
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showRequest} transparent animationType="slide" onRequestClose={() => setShowRequest(false)}>
        <KeyboardAvoidingView style={s.modalFlex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
          <View style={s.sheetOverlay}><View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <View style={s.handle} /><View style={s.sheetHeader}><View><Text style={s.sheetTitle}>Request Role Correction</Text><Text style={s.sheetSub}>{roleLabel} → {targetRoleLabel}</Text></View><TouchableOpacity style={s.close} onPress={() => setShowRequest(false)}><Feather name="x" size={18} color="#64748B" /></TouchableOpacity></View>
            <AppScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 30 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
              <View style={s.warning}><Feather name="alert-triangle" size={15} color="#D97706" /><Text style={s.warningText}>Super Admin approval is required. Existing records remain protected.</Text></View>
              <Input label="Reason for role change *" value={reason} onChangeText={setReason} placeholder="Explain why this correction is required" multiline autoFocus />
              <View style={s.actions}><TouchableOpacity style={s.secondary} onPress={() => setShowRequest(false)}><Text style={s.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[s.primary, requestLoading && { opacity: 0.65 }]} onPress={submitRoleRequest} disabled={requestLoading}>{requestLoading ? <ActivityIndicator color="white" /> : <><Feather name="send" size={14} color="white" /><Text style={s.primaryText}>Submit Request</Text></>}</TouchableOpacity></View>
            </AppScrollView>
          </View></View>
        </KeyboardAvoidingView>
      </Modal>
      <Notice visible={notice.visible} title={notice.title} message={notice.message} tone={notice.tone} onClose={() => setNotice((current) => ({ ...current, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, flex: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG }, loadingText: { marginTop: 8, color: "#64748B", fontFamily: "Inter_500Medium" },
  header: { paddingHorizontal: 18, paddingBottom: 17, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" }, profileRow: { flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }, avatarImage: { width: 58, height: 58, borderRadius: 29 }, avatarText: { color: "white", fontSize: 21, fontFamily: "Inter_700Bold" }, name: { color: "white", fontSize: 19, fontFamily: "Inter_700Bold" }, rolePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" }, rolePillText: { color: "white", fontSize: 10, fontFamily: "Inter_700Bold" }, phone: { marginTop: 4, color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontFamily: "Inter_400Regular" }, editButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  content: { padding: 15, gap: 11 }, sectionTitle: { marginTop: 4, marginBottom: -2, color: "#94A3B8", fontSize: 9.8, letterSpacing: 1.1, fontFamily: "Inter_700Bold" }, card: { borderRadius: 18, overflow: "hidden", backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, detail: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" }, detailIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" }, detailLabel: { color: "#94A3B8", fontSize: 9.8, fontFamily: "Inter_400Regular" }, detailValue: { marginTop: 2, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_700Bold" },
  formCard: { padding: 15, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, inputGroup: { marginBottom: 12 }, label: { marginBottom: 6, color: "#475569", fontSize: 10.5, fontFamily: "Inter_700Bold" }, input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_500Medium" }, textArea: { minHeight: 102, paddingTop: 12 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 }, chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F1F5F9" }, chipActive: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, chipText: { color: "#64748B", fontSize: 9.8, fontFamily: "Inter_600SemiBold" }, chipTextActive: { color: ORANGE }, actions: { flexDirection: "row", gap: 8, marginTop: 2 }, secondary: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#F1F5F9" }, secondaryText: { color: "#64748B", fontSize: 11.5, fontFamily: "Inter_700Bold" }, primary: { flex: 1.4, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, backgroundColor: ORANGE }, primaryText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  roleCard: { padding: 15, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, roleTop: { flexDirection: "row", alignItems: "center", gap: 10 }, lockIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" }, roleSmall: { color: "#94A3B8", fontSize: 8.8, letterSpacing: 1, fontFamily: "Inter_700Bold" }, roleTitle: { marginTop: 2, color: "#0F172A", fontSize: 15, fontFamily: "Inter_700Bold" }, lockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F1F5F9" }, lockBadgeText: { color: "#64748B", fontSize: 8.5, fontFamily: "Inter_700Bold" }, roleDescription: { marginTop: 10, color: "#64748B", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular" }, requestButton: { marginTop: 12, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 13, backgroundColor: ORANGE }, requestButtonText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" }, requestStatus: { marginTop: 12, padding: 11, borderRadius: 13, borderWidth: 1 }, requestTitle: { fontSize: 11, textTransform: "capitalize", fontFamily: "Inter_700Bold" }, requestText: { marginTop: 3, color: "#475569", fontSize: 10.5, fontFamily: "Inter_500Medium" }, adminNote: { marginTop: 5, color: "#64748B", fontSize: 10, fontFamily: "Inter_400Regular" }, actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" }, actionTitle: { color: "#0F172A", fontSize: 12, fontFamily: "Inter_700Bold" }, actionSub: { marginTop: 2, color: "#94A3B8", fontSize: 9.8, fontFamily: "Inter_400Regular" },
  modalFlex: { flex: 1 }, sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.48)" }, sheet: { maxHeight: "82%", padding: 17, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: "white" }, handle: { width: 42, height: 4, marginBottom: 14, alignSelf: "center", borderRadius: 2, backgroundColor: "#CBD5E1" }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, sheetTitle: { color: "#0F172A", fontSize: 17, fontFamily: "Inter_700Bold" }, sheetSub: { marginTop: 2, color: ORANGE, fontSize: 10.5, fontFamily: "Inter_600SemiBold" }, close: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" }, warning: { marginBottom: 12, flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 10, borderRadius: 12, backgroundColor: "#FFFBEB" }, warningText: { flex: 1, color: "#92400E", fontSize: 10.5, lineHeight: 15, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, padding: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.48)" }, noticeCard: { width: "100%", maxWidth: 360, padding: 22, alignItems: "center", borderRadius: 22, backgroundColor: "white" }, noticeIcon: { width: 56, height: 56, borderRadius: 19, alignItems: "center", justifyContent: "center" }, noticeTitle: { marginTop: 11, color: "#0F172A", fontSize: 17, textAlign: "center", fontFamily: "Inter_700Bold" }, noticeText: { marginTop: 6, color: "#64748B", fontSize: 11.5, lineHeight: 17, textAlign: "center", fontFamily: "Inter_400Regular" }, noticeButton: { marginTop: 16, minWidth: 100, paddingVertical: 10, alignItems: "center", borderRadius: 13 }, noticeButtonText: { color: "white", fontFamily: "Inter_700Bold" },
});
