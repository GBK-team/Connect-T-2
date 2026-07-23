import { AppScrollView } from "@/components/AppScrollView";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function JobPortalOnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activateJobs } = useJobsAuth();

  const [role, setRole] = useState<JobsUserRole>("seeker");
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

  useEffect(() => {
    if (params.role === "employer" || params.role === "seeker") setRole(params.role);
  }, [params.role]);

  const selectRole = (nextRole: JobsUserRole) => {
    setRole(nextRole);
    setError("");
  };

  const validate = () => {
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      return "Enter your full name, including surname.";
    }
    if (location.trim().length < 3) {
      return role === "employer"
        ? "Enter your business location."
        : "Enter your preferred work location.";
    }

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

      if (role === "seeker") {
        await apiPost("/api/job-portal/onboarding", {
          ...common,
          qualification: qualification.trim(),
          skills: skills.trim(),
          experience: experience.trim() || undefined,
          about: preferredCategory.trim(),
          languages: languages.trim() || undefined,
          currentStatus,
        });
      } else {
        await apiPost("/api/job-portal/onboarding", {
          ...common,
          company: company.trim(),
          contactPerson: name.trim(),
          industry: industry.trim(),
          about: hiringCategories.trim(),
          companyDescription: companyDescription.trim(),
          whatsapp: user?.mobile,
        });
      }

      await activateJobs(role);
      router.replace("/jobs/(tabs)" as any);
    } catch (err) {
      setError(
        getUserErrorMessage(
          err,
          "Your Job Portal profile could not be saved. Please try again after some time.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[DARK, ORANGE, "#F97316", "#FB923C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <TopShade height={130} />
        <DecorativeCircles />
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.replace("/portal-select" as any)}
          activeOpacity={0.84}
          accessibilityRole="button"
          accessibilityLabel="Back to service selection"
        >
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <View style={s.headCenter}>
          <View style={s.headIcon}>
            <Feather name="briefcase" size={23} color={ORANGE} />
          </View>
          <Text style={s.title}>Complete Your Job Profile</Text>
          <Text style={s.sub}>
            Use your verified Connect T account. There is no second login, registration, or OTP.
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <AppScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={s.notice}>
            <View style={s.noticeIcon}>
              <Feather name="shield" size={16} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>One account for both services</Text>
              <Text style={s.noticeText}>
                Your name and mobile number remain linked to your main citizen account. This step only creates your professional profile.
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.sectionTitle}>How will you use the Job Portal?</Text>
            <View style={s.roleRow}>
              <RoleCard
                active={role === "seeker"}
                icon="user"
                title="Job Seeker"
                subtitle="Find suitable local jobs"
                onPress={() => selectRole("seeker")}
              />
              <RoleCard
                active={role === "employer"}
                icon="briefcase"
                title="Employer"
                subtitle="Post jobs and hire talent"
                onPress={() => selectRole("employer")}
              />
            </View>

            <Text style={s.formHeading}>
              {role === "seeker" ? "Job Seeker Details" : "Employer Details"}
            </Text>

            <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />

            <View style={s.inputGroup}>
              <Text style={s.label}>Verified Mobile Number</Text>
              <View style={s.readonlyField}>
                <Feather name="lock" size={14} color="#94A3B8" />
                <Text style={s.readonlyText}>+91 {user?.mobile || ""}</Text>
              </View>
              <Text style={s.help}>Managed through your main Connect T citizen account.</Text>
            </View>

            {role === "seeker" ? (
              <>
                <Input
                  label="Highest Qualification *"
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="Example: HSC, ITI, Diploma, B.Com"
                />
                <Input
                  label="Skills *"
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="Example: Sales, Tally, Driving, MS Office"
                  multiline
                />
                <Input
                  label="Preferred Job Category *"
                  value={preferredCategory}
                  onChangeText={setPreferredCategory}
                  placeholder="Example: Office, Retail, Delivery, Technician"
                />

                <View style={s.inputGroup}>
                  <Text style={s.label}>Current Status *</Text>
                  <View style={s.chipWrap}>
                    {STATUS_OPTIONS.map((option) => {
                      const active = currentStatus === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[s.chip, active && s.chipActive]}
                          onPress={() => setCurrentStatus(option.value)}
                          activeOpacity={0.86}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[s.chipText, active && s.chipTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <Input
                  label="Work Experience"
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="Example: 2 years as restaurant manager"
                  multiline
                />
                <Input
                  label="Languages Known"
                  value={languages}
                  onChangeText={setLanguages}
                  placeholder="Example: Marathi, Hindi, English"
                />
                <Input
                  label="Preferred Work Location *"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Badlapur East / West"
                />
              </>
            ) : (
              <>
                <Input
                  label="Company / Shop / Business Name *"
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Business name"
                />
                <Input
                  label="Business Type / Industry *"
                  value={industry}
                  onChangeText={setIndustry}
                  placeholder="Example: Retail, Restaurant, Construction"
                />
                <Input
                  label="Hiring Categories *"
                  value={hiringCategories}
                  onChangeText={setHiringCategories}
                  placeholder="Example: Sales staff, Helpers, Drivers"
                  multiline
                />
                <Input
                  label="Business Description *"
                  value={companyDescription}
                  onChangeText={setCompanyDescription}
                  placeholder="Briefly describe your business and hiring needs"
                  multiline
                />
                <Input
                  label="Business Location *"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Complete business area or address"
                  multiline
                />
              </>
            )}

            <View style={s.infoBox}>
              <Feather name="info" size={15} color={ORANGE} />
              <Text style={s.infoText}>
                {role === "seeker"
                  ? "After setup, you can add a photo, resume and more profile details from the Profile tab."
                  : "After setup, you can complete verification details, manage company information and publish jobs."}
              </Text>
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={16} color="#DC2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.primaryBtn, loading && s.disabled]}
              onPress={submit}
              disabled={loading}
              activeOpacity={0.88}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={s.primaryText}>Save Profile and Continue</Text>
                  <Feather name="arrow-right" size={18} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoleCard({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.roleCard, active && s.roleCardActive]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[s.roleIcon, active && s.roleIconActive]}>
        <Feather name={icon} size={18} color={active ? "white" : ORANGE} />
      </View>
      <Text style={[s.roleTitle, active && s.roleTitleActive]}>{title}</Text>
      <Text style={[s.roleSubtitle, active && s.roleSubtitleActive]}>{subtitle}</Text>
      {active ? (
        <View style={s.selectedMark}>
          <Feather name="check" size={11} color="white" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Input({
  label,
  style,
  multiline,
  ...rest
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        style={[s.input, multiline && s.inputMultiline, style]}
        placeholderTextColor="#94A3B8"
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  headCenter: { alignItems: "center" },
  headIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: DARK,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 11,
  },
  title: {
    fontSize: 23,
    color: "white",
    fontFamily: "Inter_700Bold",
    fontWeight: "900",
    marginBottom: 5,
    textAlign: "center",
  },
  sub: {
    maxWidth: 340,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  content: { padding: 16 },
  notice: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#FED7AA",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitle: { fontSize: 12, color: "#9A3412", fontFamily: "Inter_700Bold", marginBottom: 2 },
  noticeText: { fontSize: 10.5, lineHeight: 15, color: "#9A3412", fontFamily: "Inter_400Regular" },
  card: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
    shadowColor: DARK,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 10 },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  roleCard: {
    flex: 1,
    minHeight: 132,
    backgroundColor: "#FFF7ED",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 12,
    alignItems: "flex-start",
  },
  roleCardActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  roleIconActive: { backgroundColor: "rgba(255,255,255,0.20)" },
  roleTitle: { fontSize: 13, color: "#9A3412", fontFamily: "Inter_700Bold", marginBottom: 3 },
  roleTitleActive: { color: "white" },
  roleSubtitle: { fontSize: 10.5, lineHeight: 14, color: "#C2410C", fontFamily: "Inter_400Regular" },
  roleSubtitleActive: { color: "rgba(255,255,255,0.82)" },
  selectedMark: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  formHeading: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
    paddingTop: 2,
  },
  inputGroup: { marginBottom: 13 },
  label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 6 },
  input: {
    minHeight: 49,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#0F172A",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  inputMultiline: { minHeight: 84, lineHeight: 18 },
  readonlyField: {
    height: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 13,
  },
  readonlyText: { fontSize: 13, color: "#475569", fontFamily: "Inter_700Bold" },
  help: { marginTop: 5, fontSize: 10.5, lineHeight: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  chipActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  chipText: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  chipTextActive: { color: "white" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    padding: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  infoText: { flex: 1, fontSize: 11, color: "#9A3412", fontFamily: "Inter_500Medium", lineHeight: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 14,
    marginBottom: 11,
  },
  errorText: { flex: 1, fontSize: 12, color: "#DC2626", fontFamily: "Inter_600SemiBold", lineHeight: 17 },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: ORANGE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.65 },
  primaryText: { fontSize: 14, color: "white", fontFamily: "Inter_700Bold", textAlign: "center" },
});
