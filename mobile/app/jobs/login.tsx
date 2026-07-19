import { AppScrollView } from "@/components/AppScrollView";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useAuth } from "@/context/AuthContext";
import { JobsUserRole, useJobsAuth } from "@/context/JobsAuthContext";
import { getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

export default function JobPortalProfileSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activateJobs } = useJobsAuth();
  const [role, setRole] = useState<JobsUserRole>("seeker");
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.address || "");
  const [company, setCompany] = useState("");
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

  const submit = async () => {
    if (name.trim().split(/\s+/).length < 2) {
      setError("Enter your full name, including surname.");
      return;
    }
    if (location.trim().length < 3) {
      setError(role === "employer" ? "Enter your business location." : "Enter your preferred work location.");
      return;
    }
    if (role === "employer" && company.trim().length < 2) {
      setError("Enter your company, shop, or business name.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await activateJobs(role, {
        name: name.trim(),
        location: location.trim(),
        address: location.trim(),
        company: role === "employer" ? company.trim() : undefined,
        contactPerson: role === "employer" ? name.trim() : undefined,
        currentStatus: role === "seeker" ? "unemployed" : undefined,
      });
      router.replace("/jobs/(tabs)" as any);
    } catch (err) {
      setError(getUserErrorMessage(err, "Job Portal could not be opened. Please try again after some time."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TopShade height={120} /><DecorativeCircles />
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/portal-select" as any)} activeOpacity={0.84}><Feather name="arrow-left" size={18} color="white" /></TouchableOpacity>
        <View style={s.headCenter}>
          <View style={s.headIcon}><Feather name="briefcase" size={22} color={ORANGE} /></View>
          <Text style={s.title}>Set Up Job Profile</Text>
          <Text style={s.sub}>Your verified Connect T login works for both Civic Services and Job Portal.</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <AppScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>How will you use the Job Portal?</Text>
            <View style={s.segment}>{(["seeker", "employer"] as JobsUserRole[]).map((item) => <TouchableOpacity key={item} style={[s.segmentBtn, role === item && s.segmentActive]} onPress={() => { setRole(item); setError(""); }} activeOpacity={0.9}><Feather name={item === "seeker" ? "user" : "briefcase"} size={15} color={role === item ? "white" : ORANGE} /><Text style={[s.segmentText, role === item && s.segmentTextActive]}>{item === "seeker" ? "Job Seeker" : "Employer"}</Text></TouchableOpacity>)}</View>

            <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your full name" />
            <View style={s.inputGroup}><Text style={s.label}>Verified Mobile Number</Text><View style={s.readonlyField}><Feather name="lock" size={14} color="#94A3B8" /><Text style={s.readonlyText}>+91 {user?.mobile || ""}</Text></View><Text style={s.help}>Mobile number is linked to your main Connect T account and cannot be changed here.</Text></View>
            {role === "employer" ? <Input label="Company / Shop / Business Name *" value={company} onChangeText={setCompany} placeholder="Business name" /> : null}
            <Input label={role === "employer" ? "Business Location *" : "Preferred Work Location *"} value={location} onChangeText={setLocation} placeholder="Ambernath East / West" />

            <View style={s.infoBox}><Feather name="info" size={15} color={ORANGE} /><Text style={s.infoText}>{role === "seeker" ? "Add skills, qualification, availability and resume from Profile after entering." : "Add company details, verification information and job listings from Profile after entering."}</Text></View>
            {error ? <View style={s.errorBox}><Feather name="alert-circle" size={16} color="#DC2626" /><Text style={s.errorText}>{error}</Text></View> : null}
            <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={submit} disabled={loading} activeOpacity={0.88}>{loading ? <ActivityIndicator color="white" /> : <><Text style={s.primaryText}>Continue to Job Portal</Text><Feather name="arrow-right" size={18} color="white" /></>}</TouchableOpacity>
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return <View style={s.inputGroup}><Text style={s.label}>{label}</Text><TextInput {...rest} style={[s.input, style]} placeholderTextColor="#94A3B8" /></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  backBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  headCenter: { alignItems: "center" },
  headIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 12 },
  title: { fontSize: 24, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900", marginBottom: 5 },
  sub: { maxWidth: 330, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.78)", textAlign: "center", fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#FED7AA", shadowColor: DARK, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sectionTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 10 },
  segment: { flexDirection: "row", backgroundColor: "#FFF7ED", padding: 4, borderRadius: 16, borderWidth: 1, borderColor: "#FED7AA", marginBottom: 16 },
  segmentBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  segmentActive: { backgroundColor: ORANGE },
  segmentText: { fontSize: 12, color: ORANGE, fontFamily: "Inter_700Bold" },
  segmentTextActive: { color: "white" },
  inputGroup: { marginBottom: 13 },
  label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 6 },
  input: { height: 49, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 13, color: "#0F172A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  readonlyField: { height: 49, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#F1F5F9", borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 13 },
  readonlyText: { fontSize: 13, color: "#475569", fontFamily: "Inter_700Bold" },
  help: { marginTop: 5, fontSize: 10.5, lineHeight: 15, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", padding: 11, borderRadius: 14, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 11, color: "#9A3412", fontFamily: "Inter_500Medium", lineHeight: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 10, borderRadius: 14, marginBottom: 11 },
  errorText: { flex: 1, fontSize: 12, color: "#DC2626", fontFamily: "Inter_600SemiBold" },
  primaryBtn: { height: 52, backgroundColor: ORANGE, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  disabled: { opacity: 0.65 },
  primaryText: { fontSize: 14, color: "white", fontFamily: "Inter_700Bold" },
});
