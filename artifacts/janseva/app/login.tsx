import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView,
  Image, Animated, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth, UserRole } from "@/context/AuthContext";

const { width } = Dimensions.get("window");

const WARDS = [
  "Ward 1 — Colaba", "Ward 2 — Mazagaon", "Ward 3 — Byculla",
  "Ward 4 — Parel", "Ward 5 — Dharavi", "Ward 6 — Sion",
  "Ward 7 — Mahim", "Ward 8 — Dadar", "Ward 9 — Worli",
  "Ward 10 — Lower Parel", "Ward 11 — Kurla", "Ward 12 — Ghatkopar",
  "Ward 13 — Andheri", "Ward 14 — Borivali", "Ward 15 — Kandivali",
];

const roleCards = [
  {
    role: "citizen" as UserRole,
    title: "Citizen",
    subtitle: "नागरिक",
    desc: "Submit complaints, access services & track status",
    icon: "user" as const,
    color: "#2563EB",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    role: "nagarsevak" as UserRole,
    title: "Nagarsevak",
    subtitle: "नगरसेवक",
    desc: "Ward officer — manage & resolve ward complaints",
    icon: "briefcase" as const,
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  {
    role: "head_admin" as UserRole,
    title: "Head Admin",
    subtitle: "मुख्य प्रशासक",
    desc: "Full control — all wards, services & users",
    icon: "shield" as const,
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#C4B5FD",
  },
];

type Step = "phone" | "welcome_back" | "select_role" | "details";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { checkPhone, register, loginWithPhone } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedWard, setSelectedWard] = useState(WARDS[7]);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingUser, setExistingUser] = useState<{ name: string; role: UserRole } | null>(null);
  const [error, setError] = useState("");

  const haptic = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
  const hapticSuccess = () => { if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); };

  const selectedRoleCard = roleCards.find((r) => r.role === selectedRole);

  const handlePhoneSubmit = async () => {
    const cleaned = mobile.trim().replace(/\D/g, "");
    if (cleaned.length !== 10) { setError("Please enter a valid 10-digit number"); return; }
    setError("");
    setLoading(true);
    haptic();
    try {
      const found = await checkPhone(cleaned);
      if (found) {
        setExistingUser({ name: found.name, role: found.role });
        setStep("welcome_back");
      } else {
        setStep("select_role");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginExisting = async () => {
    setLoading(true);
    hapticSuccess();
    try {
      await loginWithPhone(mobile.trim().replace(/\D/g, ""));
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (role: UserRole) => {
    haptic();
    setSelectedRole(role);
    setStep("details");
  };

  const handleRegister = async () => {
    if (!name.trim() || !selectedRole) return;
    setLoading(true);
    hapticSuccess();
    try {
      await register({
        name: name.trim(),
        mobile: mobile.trim().replace(/\D/g, ""),
        role: selectedRole,
        ward: selectedRole === "nagarsevak" ? selectedWard : "Ward 8 — Dadar",
        wardNumber: selectedRole === "nagarsevak" ? selectedWard.split(" ")[1] : "8",
      });
      router.replace("/(tabs)");
    } finally {
      setLoading(false);
    }
  };

  const roleOfExisting = existingUser ? roleCards.find((r) => r.role === existingUser.role) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* ─── Header gradient ─── */}
      <LinearGradient
        colors={["#0C1A3A", "#1E3A8A", "#1E40AF", "#2563EB"]}
        locations={[0, 0.35, 0.7, 1]}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 52 : insets.top) + 24 }]}
      >
        <View style={styles.logoRow}>
          <View style={styles.logoImgWrap}>
            <Image
              source={require("../assets/images/logo_transparent.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.logoTitle}>JanSeva</Text>
            <Text style={styles.logoSub}>Citizen Services Platform</Text>
          </View>
        </View>
        <View style={styles.headerMeta}>
          <View style={styles.flagRow}>
            <View style={[styles.flagStripe, { backgroundColor: "#F97316" }]} />
            <View style={[styles.flagStripe, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
            <View style={[styles.flagStripe, { backgroundColor: "#22C55E" }]} />
          </View>
          <Text style={styles.headerTagline}>नागरिकों की सेवा में</Text>
        </View>
      </LinearGradient>

      {/* ─── Card sheet ─── */}
      <View style={styles.card}>
        {step === "phone" && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
            <View style={{ gap: 4 }}>
              <Text style={styles.stepTitle}>Welcome to JanSeva</Text>
              <Text style={styles.stepSub}>Enter your mobile number to get started</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={mobile}
                  onChangeText={(t) => { setMobile(t); setError(""); }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#CBD5E1"
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                  onSubmitEditing={handlePhoneSubmit}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <View style={styles.infoBox}>
              <Feather name="info" size={14} color="#2563EB" />
              <Text style={styles.infoText}>
                Existing users will be logged in automatically. New users will be guided through registration.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!mobile.trim() || mobile.trim().length < 10) && { opacity: 0.5 }]}
              onPress={handlePhoneSubmit}
              disabled={!mobile.trim() || mobile.trim().length < 10 || loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#1E3A8A", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <>
                    <Text style={styles.primaryBtnText}>Continue</Text>
                    <Feather name="arrow-right" size={18} color="white" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy. Mumbai BMC · JanSeva 2025
            </Text>
          </ScrollView>
        )}

        {step === "welcome_back" && existingUser && roleOfExisting && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20 }}>
            <TouchableOpacity onPress={() => { setStep("phone"); setExistingUser(null); }} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={16} color="#475569" />
              <Text style={styles.backText}>Change number</Text>
            </TouchableOpacity>

            <View style={styles.welcomeCard}>
              <View style={[styles.welcomeAvatar, { backgroundColor: roleOfExisting.color + "20" }]}>
                <Text style={[styles.welcomeAvatarText, { color: roleOfExisting.color }]}>
                  {existingUser.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.welcomeCheck}>
                <Feather name="check" size={12} color="white" />
              </View>
              <Text style={styles.welcomeGreet}>Welcome back!</Text>
              <Text style={styles.welcomeName}>{existingUser.name}</Text>
              <View style={[styles.welcomeRolePill, { backgroundColor: roleOfExisting.bg, borderColor: roleOfExisting.border }]}>
                <Feather name={roleOfExisting.icon} size={12} color={roleOfExisting.color} />
                <Text style={[styles.welcomeRoleText, { color: roleOfExisting.color }]}>{roleOfExisting.title}</Text>
              </View>
              <View style={styles.welcomePhone}>
                <Feather name="phone" size={13} color="#64748B" />
                <Text style={styles.welcomePhoneText}>+91 {mobile}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleLoginExisting} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={["#1E3A8A", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <>
                    <Feather name="log-in" size={18} color="white" />
                    <Text style={styles.primaryBtnText}>Login to JanSeva</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setStep("select_role"); setExistingUser(null); }}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Not you? Register new account</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {step === "select_role" && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setStep("phone")} style={styles.backBtnIcon} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color="#475569" />
              </TouchableOpacity>
              <View style={{ gap: 2 }}>
                <Text style={styles.stepTitle}>Create Account</Text>
                <Text style={styles.stepSub}>Select your role to continue</Text>
              </View>
            </View>

            <View style={styles.newBadge}>
              <Feather name="user-plus" size={13} color="#059669" />
              <Text style={styles.newBadgeText}>New user — +91 {mobile}</Text>
            </View>

            {roleCards.map((rc) => (
              <TouchableOpacity
                key={rc.role}
                style={[styles.roleCard, { borderColor: rc.border, backgroundColor: rc.bg }]}
                onPress={() => handleSelectRole(rc.role)}
                activeOpacity={0.85}
              >
                <View style={[styles.roleCardIcon, { backgroundColor: rc.color + "22" }]}>
                  <Feather name={rc.icon} size={24} color={rc.color} />
                </View>
                <View style={styles.roleCardText}>
                  <View style={styles.roleCardTitleRow}>
                    <Text style={[styles.roleCardTitle, { color: rc.color }]}>{rc.title}</Text>
                    <Text style={styles.roleCardHindi}>{rc.subtitle}</Text>
                  </View>
                  <Text style={styles.roleCardDesc}>{rc.desc}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={rc.color} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {step === "details" && selectedRoleCard && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setStep("select_role")} style={styles.backBtnIcon} activeOpacity={0.7}>
                <Feather name="arrow-left" size={16} color="#475569" />
              </TouchableOpacity>
              <View style={[styles.rolePill, { backgroundColor: selectedRoleCard.bg, borderColor: selectedRoleCard.border }]}>
                <Feather name={selectedRoleCard.icon} size={12} color={selectedRoleCard.color} />
                <Text style={[styles.rolePillText, { color: selectedRoleCard.color }]}>{selectedRoleCard.title}</Text>
              </View>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={styles.stepTitle}>Your Details</Text>
              <Text style={styles.stepSub}>Almost done — fill in your information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <Feather name="user" size={16} color="#2563EB" />
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#CBD5E1"
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={[styles.inputRow, { backgroundColor: "#F8FAFC" }]}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <Text style={[styles.input, { color: "#475569", lineHeight: 48 }]}>{mobile}</Text>
                <View style={{ paddingRight: 14 }}>
                  <Feather name="lock" size={14} color="#94A3B8" />
                </View>
              </View>
            </View>

            {selectedRole === "nagarsevak" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ASSIGNED WARD</Text>
                <TouchableOpacity
                  style={styles.wardPicker}
                  onPress={() => setShowWardPicker(!showWardPicker)}
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={16} color="#2563EB" />
                  <Text style={styles.wardPickerText}>{selectedWard}</Text>
                  <Feather name={showWardPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                </TouchableOpacity>
                {showWardPicker && (
                  <View style={styles.wardDropdown}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {WARDS.map((w) => (
                        <TouchableOpacity
                          key={w}
                          style={[styles.wardOption, w === selectedWard && styles.wardOptionSelected]}
                          onPress={() => { setSelectedWard(w); setShowWardPicker(false); }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.wardOptionText, w === selectedWard && { color: "#2563EB", fontFamily: "Inter_700Bold" }]}>
                            {w}
                          </Text>
                          {w === selectedWard && <Feather name="check" size={14} color="#2563EB" />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            <View style={styles.secureBox}>
              <Feather name="shield" size={14} color="#059669" />
              <Text style={styles.secureText}>Your information is securely stored. OTP verification active.</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !name.trim() && { opacity: 0.5 }]}
              onPress={handleRegister}
              disabled={!name.trim() || loading}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#1E3A8A", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtnGrad}>
                {loading ? <ActivityIndicator color="white" /> : (
                  <>
                    <Feather name="user-check" size={18} color="white" />
                    <Text style={styles.primaryBtnText}>Create Account & Enter</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By registering, you agree to our Terms of Service and Privacy Policy. Mumbai BMC · JanSeva 2025
            </Text>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 52,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  logoImgWrap: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  logoImg: { width: 56, height: 56 },
  logoTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "white",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  logoSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  flagRow: { flexDirection: "row", gap: 2 },
  flagStripe: { width: 18, height: 3, borderRadius: 2 },
  headerTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  stepSub: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },

  inputGroup: { gap: 8 },
  label: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1.2, fontFamily: "Inter_600SemiBold" },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14, overflow: "hidden",
    backgroundColor: "white",
  },
  inputRowError: { borderColor: "#EF4444" },
  inputIcon: { width: 46, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FF" },
  countryCode: {
    paddingHorizontal: 12, height: 48, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8FAFC", borderRightWidth: 1, borderRightColor: "#E2E8F0",
  },
  countryCodeText: { fontSize: 13, fontWeight: "700", color: "#1E40AF", fontFamily: "Inter_700Bold" },
  input: {
    flex: 1, height: 48, paddingHorizontal: 14,
    fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 12, color: "#EF4444", fontFamily: "Inter_400Regular" },

  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EFF6FF", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  infoText: { fontSize: 12, color: "#1E40AF", fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },

  primaryBtn: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  primaryBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "white", fontFamily: "Inter_700Bold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 12 },
  secondaryBtnText: { fontSize: 13, color: "#2563EB", fontFamily: "Inter_500Medium", textDecorationLine: "underline" },

  termsText: {
    fontSize: 11, color: "#94A3B8", textAlign: "center",
    fontFamily: "Inter_400Regular", lineHeight: 16,
  },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtnIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },
  newBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#ECFDF5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#A7F3D0", alignSelf: "flex-start",
  },
  newBadgeText: { fontSize: 12, color: "#065F46", fontFamily: "Inter_500Medium" },

  roleCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 18, borderWidth: 1.5,
  },
  roleCardIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roleCardText: { flex: 1 },
  roleCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  roleCardTitle: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  roleCardHindi: { fontSize: 12, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  roleCardDesc: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 17 },

  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  rolePillText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_600SemiBold" },

  wardPicker: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: "white",
  },
  wardPickerText: { flex: 1, fontSize: 14, color: "#0F172A", fontFamily: "Inter_400Regular" },
  wardDropdown: {
    borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 14,
    backgroundColor: "white", overflow: "hidden", marginTop: -4,
  },
  wardOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
  },
  wardOptionSelected: { backgroundColor: "#EFF6FF" },
  wardOptionText: { fontSize: 13, color: "#334155", fontFamily: "Inter_400Regular" },

  secureBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  secureText: { fontSize: 12, color: "#065F46", fontFamily: "Inter_400Regular", flex: 1 },

  welcomeCard: {
    backgroundColor: "#F8FAFC", borderRadius: 20, padding: 28,
    alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#E2E8F0",
  },
  welcomeAvatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  welcomeAvatarText: { fontSize: 32, fontWeight: "900", fontFamily: "Inter_700Bold" },
  welcomeCheck: {
    position: "absolute",
    top: 28 + 80 - 16,
    right: (width - 80) / 2 - 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#059669",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "white",
  },
  welcomeGreet: { fontSize: 14, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 8 },
  welcomeName: { fontSize: 24, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  welcomeRolePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  welcomeRoleText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_600SemiBold" },
  welcomePhone: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  welcomePhoneText: { fontSize: 13, color: "#64748B", fontFamily: "Inter_400Regular" },
});
