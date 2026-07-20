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
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import DobDatePicker from "@/components/DobDatePicker";
import OtpDigitInput from "@/components/OtpDigitInput";
import { useAuth } from "@/context/AuthContext";
import { ambernathWards } from "@/data/mumbaiServices";
import { getUserErrorMessage, isApiError } from "@/lib/api";
import { sendRealOtp, verifyRealOtp } from "@/lib/otpApi";

type Step = "mobile" | "otp" | "profile";

const ORANGE = "#EA580C";
const DARK_ORANGE = "#9A3412";
const RESEND_SECONDS = 45;

function cleanMobile(value: string) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function routeForRole(role: string) {
  if (role === "super_admin") return "/super-admin";
  if (role === "nagarsevak") return "/(tabs)/admin";
  return "/portal-select";
}

export default function UnifiedLoginScreen() {
  const insets = useSafeAreaInsets();
  const { unifiedLogin } = useAuth();
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wardPickerOpen, setWardPickerOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");

  const normalizedMobile = cleanMobile(mobile);
  const wardCode = useMemo(() => ward.match(/\d+/)?.[0] || "", [ward]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const requestOtp = async () => {
    setError("");
    if (normalizedMobile.length !== 10) {
      setError("Enter a valid 10 digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const result = await sendRealOtp(normalizedMobile, "login");
      if (!result.success) {
        setError(result.error || "OTP could not be sent. Please try again.");
        return;
      }
      setOtp("");
      setOtpVerified(false);
      setResendIn(RESEND_SECONDS);
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const finishLogin = async (profile?: { name: string; dob: string; address: string; wardCode: string }) => {
    const user = await unifiedLogin(normalizedMobile, profile);
    router.replace(routeForRole(user.role) as any);
  };

  const verifyOtpAndRoute = async () => {
    setError("");
    if (otp.replace(/\D/g, "").length !== 6) {
      setError("Enter the complete 6 digit OTP.");
      return;
    }
    setLoading(true);
    try {
      if (!otpVerified) {
        const verified = await verifyRealOtp(normalizedMobile, otp, "login");
        if (!verified.success) {
          setError(verified.error || "The OTP is invalid or expired.");
          return;
        }
        setOtpVerified(true);
      }
      try {
        await finishLogin();
      } catch (loginError) {
        if (isApiError(loginError) && loginError.code === "PROFILE_REQUIRED") {
          setError("");
          setStep("profile");
          return;
        }
        throw loginError;
      }
    } catch (loginError) {
      setError(getUserErrorMessage(loginError, "Login could not be completed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const saveCitizenProfile = async () => {
    setError("");
    if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError("Enter your full name, including surname.");
      return;
    }
    if (!dob) {
      setError("Select your date of birth.");
      return;
    }
    if (!address.trim()) {
      setError("Enter your complete address.");
      return;
    }
    if (!wardCode) {
      setError("Select your ward.");
      return;
    }
    setLoading(true);
    try {
      await finishLogin({ name: fullName.trim(), dob, address: address.trim(), wardCode });
    } catch (profileError) {
      setError(getUserErrorMessage(profileError, "Your profile could not be saved. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const changeMobile = () => {
    setStep("mobile");
    setOtp("");
    setOtpVerified(false);
    setResendIn(0);
    setError("");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#7C2D12", DARK_ORANGE, ORANGE, "#FB923C"]}
        locations={[0, 0.33, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AppScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 26 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoShell}>
              <Image source={require("../assets/images/connectt-logo-v2-nobg.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Connect T</Text>
              <Text style={styles.brandTag}>One city. One secure login.</Text>
            </View>
            <View style={styles.securePill}>
              <Feather name="shield" size={12} color="#166534" />
              <Text style={styles.secureText}>OTP</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>AMBERNATH CIVIC PLATFORM</Text>
            <Text style={styles.title}>{step === "profile" ? "Complete your profile" : "Welcome back"}</Text>
            <Text style={styles.subtitle}>
              {step === "mobile"
                ? "Enter your mobile number. Your authorized role will be identified securely after OTP verification."
                : step === "otp"
                  ? `We sent a 6 digit OTP to +91 ${normalizedMobile}.`
                  : "This information is required once for a new citizen account."}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.stepRow}>
              {["Mobile", "OTP", "Profile"].map((label, index) => {
                const activeIndex = step === "mobile" ? 0 : step === "otp" ? 1 : 2;
                const done = index < activeIndex;
                const active = index === activeIndex;
                return (
                  <React.Fragment key={label}>
                    {index > 0 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
                    <View style={styles.stepItem}>
                      <View style={[styles.stepDot, (active || done) && styles.stepDotActive]}>
                        {done ? <Feather name="check" size={12} color="white" /> : <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{index + 1}</Text>}
                      </View>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>

            {step === "mobile" ? (
              <>
                <Text style={styles.label}>Mobile number</Text>
                <View style={[styles.inputShell, error && normalizedMobile.length !== 10 ? styles.inputError : null]}>
                  <View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View>
                  <TextInput
                    value={mobile}
                    onChangeText={(value) => { setMobile(cleanMobile(value)); setError(""); }}
                    placeholder="Enter 10 digit number"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    maxLength={10}
                    autoFocus
                    style={styles.input}
                  />
                  {normalizedMobile.length === 10 ? <Feather name="check-circle" size={18} color="#16A34A" /> : null}
                </View>
                <Text style={styles.helper}>Use the number registered with Connect T.</Text>
              </>
            ) : null}

            {step === "otp" ? (
              <>
                <View style={styles.otpHeader}>
                  <Text style={styles.label}>Verification code</Text>
                  <TouchableOpacity onPress={changeMobile} activeOpacity={0.75}>
                    <Text style={styles.changeText}>Change number</Text>
                  </TouchableOpacity>
                </View>
                <OtpDigitInput value={otp} onChange={(value) => { setOtp(value); setError(""); }} autoFocus />
                <View style={styles.resendRow}>
                  <Text style={styles.resendHint}>Didn&apos;t receive the OTP?</Text>
                  <TouchableOpacity onPress={requestOtp} disabled={resendIn > 0 || loading} activeOpacity={0.75}>
                    <Text style={[styles.resendLink, resendIn > 0 && styles.resendDisabled]}>
                      {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === "profile" ? (
              <>
                <Text style={styles.label}>Full name *</Text>
                <View style={styles.inputShell}>
                  <Feather name="user" size={17} color="#94A3B8" />
                  <TextInput value={fullName} onChangeText={(value) => { setFullName(value); setError(""); }} placeholder="First name and surname" placeholderTextColor="#94A3B8" autoCapitalize="words" style={styles.input} />
                </View>
                <DobDatePicker value={dob} onChange={(value) => { setDob(value); setError(""); }} required />
                <Text style={styles.label}>Complete address *</Text>
                <View style={[styles.inputShell, styles.addressShell]}>
                  <Feather name="home" size={17} color="#94A3B8" style={styles.topIcon} />
                  <TextInput value={address} onChangeText={(value) => { setAddress(value); setError(""); }} placeholder="House, street and area" placeholderTextColor="#94A3B8" multiline textAlignVertical="top" style={[styles.input, styles.addressInput]} />
                </View>
                <Text style={styles.label}>Ward *</Text>
                <TouchableOpacity style={styles.inputShell} onPress={() => setWardPickerOpen(true)} activeOpacity={0.8}>
                  <Feather name="map-pin" size={17} color={ward ? ORANGE : "#94A3B8"} />
                  <Text style={[styles.selectText, !ward && styles.placeholder]}>{ward || "Select your ward"}</Text>
                  <Feather name="chevron-down" size={17} color="#94A3B8" />
                </TouchableOpacity>
              </>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={16} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={step === "mobile" ? requestOtp : step === "otp" ? verifyOtpAndRoute : saveCitizenProfile}
              disabled={loading}
              activeOpacity={0.88}
            >
              <LinearGradient colors={[DARK_ORANGE, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <>
                    <Text style={styles.primaryText}>{step === "mobile" ? "Send OTP" : step === "otp" ? "Verify & continue" : "Save & continue"}</Text>
                    <Feather name="arrow-right" size={17} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.securityNote}>
              <Feather name="lock" size={13} color="#64748B" />
              <Text style={styles.securityNoteText}>Your role is verified by the secure backend. No role selection or access code is required.</Text>
            </View>
          </View>

          <Text style={styles.footer}>By continuing, you agree to use Connect T responsibly.</Text>
        </AppScrollView>
      </KeyboardAvoidingView>

      <Modal visible={wardPickerOpen} transparent animationType="slide" onRequestClose={() => setWardPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.wardSheet}>
            <View style={styles.sheetHeader}>
              <View><Text style={styles.sheetTitle}>Select Ward</Text><Text style={styles.sheetSub}>Choose your civic ward</Text></View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setWardPickerOpen(false)}><Feather name="x" size={19} color="#475569" /></TouchableOpacity>
            </View>
            <AppScrollView style={styles.wardList} contentContainerStyle={styles.wardListContent} showsVerticalScrollIndicator={false}>
              <View style={styles.wardGrid}>
                {ambernathWards.map((item) => (
                  <TouchableOpacity key={item} style={[styles.wardOption, ward === item && styles.wardOptionActive]} onPress={() => { setWard(item); setWardPickerOpen(false); setError(""); }} activeOpacity={0.8}>
                    <Text style={[styles.wardOptionText, ward === item && styles.wardOptionTextActive]}>{item}</Text>
                    {ward === item ? <Feather name="check" size={14} color={ORANGE} /> : null}
                  </TouchableOpacity>
                ))}
              </View>
            </AppScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: DARK_ORANGE },
  content: { flexGrow: 1, paddingHorizontal: 18 },
  glowOne: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.10)", top: -110, right: -80 },
  glowTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,237,213,0.12)", bottom: 40, left: -110 },
  brandRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 },
  logoShell: { width: 50, height: 50, borderRadius: 17, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: "#431407", shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  logo: { width: 43, height: 43 },
  brandCopy: { flex: 1 },
  brandName: { color: "white", fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  brandTag: { color: "rgba(255,255,255,0.72)", fontSize: 10.5, fontFamily: "Inter_400Regular", marginTop: 1 },
  securePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#DCFCE7", borderRadius: 999 },
  secureText: { fontSize: 10, color: "#166534", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  hero: { paddingTop: 44, paddingBottom: 24 },
  eyebrow: { color: "#FFEDD5", fontSize: 10, letterSpacing: 1.3, fontFamily: "Inter_700Bold", marginBottom: 8 },
  title: { color: "white", fontSize: 34, lineHeight: 39, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 8, maxWidth: 440 },
  card: { backgroundColor: "white", borderRadius: 28, padding: 18, shadowColor: "#431407", shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 11 }, elevation: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", marginBottom: 24 },
  stepItem: { alignItems: "center", width: 54 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepNumber: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_700Bold" },
  stepNumberActive: { color: "white" },
  stepLabel: { marginTop: 5, fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
  stepLabelActive: { color: ORANGE },
  stepLine: { height: 2, width: 48, backgroundColor: "#E2E8F0", marginTop: 13, marginHorizontal: -10 },
  stepLineDone: { backgroundColor: ORANGE },
  label: { fontSize: 12, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 8, marginTop: 10 },
  inputShell: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 17, backgroundColor: "#F8FAFC", paddingHorizontal: 13 },
  inputError: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  countryCode: { minWidth: 50, height: 34, borderRadius: 11, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  countryCodeText: { fontSize: 13, color: "#475569", fontFamily: "Inter_700Bold" },
  input: { flex: 1, minWidth: 0, paddingVertical: 0, color: "#0F172A", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  helper: { fontSize: 10.5, color: "#94A3B8", marginTop: 7, fontFamily: "Inter_400Regular" },
  otpHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  changeText: { color: ORANGE, fontSize: 11.5, fontFamily: "Inter_700Bold", marginTop: 10 },
  resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 15 },
  resendHint: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 11.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  resendDisabled: { color: "#94A3B8" },
  addressShell: { minHeight: 86, alignItems: "flex-start", paddingTop: 13 },
  topIcon: { marginTop: 2 },
  addressInput: { minHeight: 62, paddingTop: 0 },
  selectText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_600SemiBold" },
  placeholder: { color: "#94A3B8", fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 14, padding: 11, marginTop: 14 },
  errorText: { flex: 1, color: "#B91C1C", fontSize: 11.5, lineHeight: 17, fontFamily: "Inter_500Medium" },
  primaryButton: { marginTop: 18, borderRadius: 17, overflow: "hidden", shadowColor: ORANGE, shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  buttonDisabled: { opacity: 0.72 },
  primaryGradient: { minHeight: 55, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 },
  primaryText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" },
  securityNote: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 15, paddingHorizontal: 4 },
  securityNoteText: { flex: 1, color: "#64748B", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular" },
  footer: { color: "rgba(255,255,255,0.62)", textAlign: "center", fontSize: 10.5, lineHeight: 16, fontFamily: "Inter_400Regular", paddingTop: 20, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.5)" },
  wardSheet: { maxHeight: "76%", backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 22 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 19, color: "#0F172A", fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  closeButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  wardList: { maxHeight: 470 },
  wardListContent: { paddingBottom: 12 },
  wardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wardOption: { flexBasis: "47%", flexGrow: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wardOptionActive: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
  wardOptionText: { color: "#475569", fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  wardOptionTextActive: { color: ORANGE, fontFamily: "Inter_700Bold" },
});
