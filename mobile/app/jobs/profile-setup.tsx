import { AppScrollView } from "@/components/AppScrollView";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { CurrentStatus, JobsUserRole, useJobsAuth } from "@/context/JobsAuthContext";
import { apiPost, clearJobsAuthToken, getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";

const STATUS_OPTIONS: Array<{ value: CurrentStatus; label: string }> = [
  { value: "fresher", label: "Fresher" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Looking for work" },
  { value: "employed", label: "Currently employed" },
];

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

function RoleCard({ role, selected, onPress }: { role: JobsUserRole; selected: boolean; onPress: () => void }) {
  const employer = role === "employer";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.roleCard, selected && s.roleCardSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[s.roleIcon, selected && s.roleIconSelected]}>
        <Feather name={employer ? "briefcase" : "user"} size={22} color={selected ? "white" : ORANGE} />
      </View>
      <Text style={[s.roleTitle, selected && s.roleTitleSelected]}>{employer ? "Employer" : "Job Seeker"}</Text>
      <Text style={s.roleSub}>{employer ? "Post jobs and hire talent" : "Find verified local jobs"}</Text>
    </TouchableOpacity>
  );
}

export default function JobProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activateJobs } = useJobsAuth();

  const [role, setRole] = useState<JobsUserRole | null>(null);
  const [pendingRole, setPendingRole] = useState<JobsUserRole | null>(null);
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.address || "");
  const [qualification, setQualification] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [preferredCategory, setPreferredCategory] = useState("");
  const [languages, setLanguages] = useState("");
  const [currentStatus, setCurrentStatus] = useState<CurrentStatus>("fresher");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [hiringCategories, setHiringCategories] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.replace("/login" as any);
      return;
    }
    setName((value) => value || user.name || "");
    setLocation((value) => value || user.address || "");
  }, [user?.id, router]);

  const chooseRole = (nextRole: JobsUserRole) => {
    setPendingRole(nextRole);
    setShowConfirm(true);
    setError("");
  };

  const confirmRole = () => {
    if (!pendingRole) return;
    setRole(pendingRole);
    setRoleConfirmed(true);
    setShowConfirm(false);
  };

  const resetRole = () => {
    setRole(null);
    setPendingRole(null);
    setRoleConfirmed(false);
    setError("");
  };

  const validate = () => {
    if (!roleConfirmed || !role) return "Confirm Job Seeker or Employer before continuing.";
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return "Enter your full name, including surname.";
    if (location.trim().length < 3) return role === "employer" ? "Enter your business location." : "Enter your preferred work location.";
    if (role === "seeker") {
      if (qualification.trim().length < 2) return "Add your highest qualification.";
      if (skills.trim().length < 2) return "Add at least one skill.";
      if (preferredCategory.trim().length < 2) return "Add your preferred job category.";
    } else {
      if (company.trim().length < 2) return "Enter your company, shop, or business name.";
      if (industry.trim().length < 2) return "Add your business type or industry.";
      if (hiringCategories.trim().length < 2) return "Add the job categories you plan to hire for.";
      if (companyDescription.trim().length < 10) return "Add a short description of your business.";
    }
    return "";
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!role || loading) return;

    setLoading(true);
    setError("");
    try {
      await clearJobsAuthToken();
      const common = {
        role,
        name: name.trim(),
        location: location.trim(),
        address: location.trim(),
      };
      await apiPost("/api/job-portal/onboarding", role === "seeker" ? {
        ...common,
        qualification: qualification.trim(),
        skills: skills.trim(),
        experience: currentStatus === "fresher" ? undefined : experience.trim() || undefined,
        about: preferredCategory.trim(),
        languages: languages.trim() || undefined,
        currentStatus,
      } : {
        ...common,
        company: company.trim(),
        contactPerson: name.trim(),
        industry: industry.trim(),
        about: hiringCategories.trim(),
        companyDescription: companyDescription.trim(),
        whatsapp: user?.mobile,
      });
      await activateJobs(role);
      router.replace("/jobs/(tabs)" as any);
    } catch (err) {
      setError(getUserErrorMessage(err, "Your Job Portal profile could not be saved. Please try again after some time."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TopShade height={130} />
        <DecorativeCircles />
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/portal-select" as any)} activeOpacity={0.84}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <View style={s.headCenter}>
          <View style={s.headIcon}><Feather name="briefcase" size={23} color={ORANGE} /></View>
          <Text style={s.title}>Set Up Your Job Profile</Text>
          <Text style={s.sub}>One verified Connect T account. No second login, registration, or OTP.</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <AppScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={s.notice}>
            <View style={s.noticeIcon}><Feather name="shield" size={16} color={ORANGE} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>One active Job Portal role</Text>
              <Text style={s.noticeText}>Your selected role is locked after profile creation. A later correction requires Super Admin approval.</Text>
            </View>
          </View>

          <View style={s.card}>
            {!roleConfirmed ? (
              <>
                <Text style={s.sectionTitle}>How will you use the Job Portal?</Text>
                <Text style={s.sectionHelp}>Choose carefully. You can go back before saving.</Text>
                <View style={s.roleRow}>
                  <RoleCard role="seeker" selected={pendingRole === "seeker"} onPress={() => chooseRole("seeker")} />
                  <RoleCard role="employer" selected={pendingRole === "employer"} onPress={() => chooseRole("employer")} />
                </View>
              </>
            ) : (
              <View style={s.lockedRoleBox}>
                <View style={s.lockedRoleIcon}><Feather name="lock" size={20} color={ORANGE} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lockedRoleLabel}>CONFIRMED ROLE</Text>
                  <Text style={s.lockedRoleTitle}>{role === "employer" ? "Employer" : "Job Seeker"}</Text>
                  <Text style={s.lockedRoleText}>This becomes your active Job Portal role after saving.</Text>
                </View>
                <TouchableOpacity onPress={resetRole} style={s.changeBtn}><Text style={s.changeBtnText}>Change</Text></TouchableOpacity>
              </View>
            )}

            {roleConfirmed && role ? (
              <>
                <Text style={s.formHeading}>{role === "seeker" ? "Job Seeker Details" : "Employer Details"}</Text>
                <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />
                <View style={s.inputGroup}>
                  <Text style={s.label}>Verified Mobile Number</Text>
                  <View style={s.readonlyField}><Feather name="lock" size={14} color="#94A3B8" /><Text style={s.readonlyText}>+91 {user?.mobile || ""}</Text></View>
                  <Text style={s.help}>Managed by your main Connect T citizen account.</Text>
                </View>

                {role === "seeker" ? (
                  <>
                    <Input label="Highest Qualification *" value={qualification} onChangeText={setQualification} placeholder="HSC, ITI, Diploma, Graduate..." />
                    <Input label="Skills *" value={skills} onChangeText={setSkills} placeholder="Sales, Tally, Driving, MS Office..." multiline />
                    <Input label="Preferred Job Category *" value={preferredCategory} onChangeText={setPreferredCategory} placeholder="Office, Retail, Delivery, Technician..." />
                    <View style={s.inputGroup}>
                      <Text style={s.label}>Current Status *</Text>
                      <View style={s.chipWrap}>{STATUS_OPTIONS.map((option) => {
                        const active = currentStatus === option.value;
                        return <TouchableOpacity key={option.value} onPress={() => setCurrentStatus(option.value)} style={[s.chip, active && s.chipActive]}><Text style={[s.chipText, active && s.chipTextActive]}>{option.label}</Text></TouchableOpacity>;
                      })}</View>
                    </View>
                    {currentStatus !== "fresher" && <Input label="Work Experience" value={experience} onChangeText={setExperience} placeholder="Example: 2 years as restaurant manager" multiline />}
                    <Input label="Languages Known" value={languages} onChangeText={setLanguages} placeholder="Marathi, Hindi, English" />
                    <Input label="Preferred Work Location *" value={location} onChangeText={setLocation} placeholder="Badlapur East / West" />
                  </>
                ) : (
                  <>
                    <Input label="Company / Shop / Business Name *" value={company} onChangeText={setCompany} placeholder="Business name" />
                    <Input label="Business Type / Industry *" value={industry} onChangeText={setIndustry} placeholder="Retail, Restaurant, Construction..." />
                    <Input label="Hiring Categories *" value={hiringCategories} onChangeText={setHiringCategories} placeholder="Sales staff, Helpers, Drivers..." multiline />
                    <Input label="Business Description *" value={companyDescription} onChangeText={setCompanyDescription} placeholder="Describe your business and hiring needs" multiline />
                    <Input label="Business Location *" value={location} onChangeText={setLocation} placeholder="Complete business area or address" multiline />
                  </>
                )}

                {error ? <View style={s.errorBox}><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={s.errorText}>{error}</Text></View> : null}
                <TouchableOpacity onPress={submit} disabled={loading} style={[s.primaryBtn, loading && { opacity: 0.65 }]} activeOpacity={0.88}>
                  <LinearGradient colors={[DARK, ORANGE]} style={s.primaryGrad}>
                    {loading ? <ActivityIndicator color="white" /> : <><Text style={s.primaryText}>Save Profile and Continue</Text><Feather name="arrow-right" size={18} color="white" /></>}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Feather name="alert-triangle" size={26} color={ORANGE} /></View>
            <Text style={s.modalTitle}>Confirm {pendingRole === "employer" ? "Employer" : "Job Seeker"}</Text>
            <Text style={s.modalText}>This role cannot be changed directly after profile creation. A future correction must be requested and approved by the Super Admin.</Text>
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setShowConfirm(false)} style={s.cancelBtn}><Text style={s.cancelText}>Go Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmRole} style={s.confirmBtn}><Text style={s.confirmText}>Confirm Role</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 2 },
  headCenter: { alignItems: "center", marginTop: -28, paddingHorizontal: 36 },
  headIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "white", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 21, color: "white", fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 5, lineHeight: 17 },
  content: { padding: 16 },
  notice: { flexDirection: "row", gap: 12, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", padding: 14, marginBottom: 14 },
  noticeIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  noticeTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#9A3412" },
  noticeText: { fontSize: 11.5, fontFamily: "Inter_400Regular", color: "#9A3412", marginTop: 3, lineHeight: 17 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 16, shadowColor: "#B45309", shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A" },
  sectionHelp: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginTop: 3, marginBottom: 12 },
  roleRow: { flexDirection: "row", gap: 10 },
  roleCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: "#E2E8F0", padding: 14, alignItems: "center", minHeight: 142 },
  roleCardSelected: { borderColor: ORANGE, backgroundColor: "#FFF7ED" },
  roleIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 9 },
  roleIconSelected: { backgroundColor: ORANGE },
  roleTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" },
  roleTitleSelected: { color: "#9A3412" },
  roleSub: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", marginTop: 4, lineHeight: 15 },
  lockedRoleBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF7ED", borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", padding: 14 },
  lockedRoleIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  lockedRoleLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#C2410C", letterSpacing: 1 },
  lockedRoleTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#9A3412", marginTop: 1 },
  lockedRoleText: { fontSize: 10.5, fontFamily: "Inter_400Regular", color: "#9A3412", marginTop: 2 },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: "white" },
  changeBtnText: { fontSize: 11, fontFamily: "Inter_700Bold", color: ORANGE },
  formHeading: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 20, marginBottom: 12 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#475569", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", borderRadius: 13, paddingHorizontal: 13, minHeight: 48, color: "#0F172A", fontFamily: "Inter_400Regular", fontSize: 14 },
  textArea: { minHeight: 92, paddingTop: 12 },
  readonlyField: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 13, paddingHorizontal: 13, minHeight: 48 },
  readonlyText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#475569" },
  help: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 5 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  chipTextActive: { color: "white" },
  errorBox: { flexDirection: "row", gap: 8, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#B91C1C", lineHeight: 17 },
  primaryBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  primaryGrad: { minHeight: 50, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "white" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "white", borderRadius: 22, padding: 22, alignItems: "center" },
  modalIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", textAlign: "center" },
  modalText: { fontSize: 12.5, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", lineHeight: 19, marginTop: 8 },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  cancelBtn: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#64748B" },
  confirmBtn: { flex: 1.2, minHeight: 46, borderRadius: 13, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "white" },
});
