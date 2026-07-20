import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { apiPost, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";

export default function CreateNagarsevakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [designation, setDesignation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const save = async () => {
    const phone = mobile.replace(/\D/g, "").slice(-10);
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) return setMessage("Enter the Nagarsevak's full name.");
    if (phone.length !== 10) return setMessage("Enter a valid 10 digit login mobile number.");
    if (!designation) return setMessage("Select the assigned ward or designation.");
    setSaving(true);
    setMessage("");
    try {
      await apiPost("/api/super-admin/nagarsevaks", {
        name: name.trim(),
        mobile: phone,
        wardOrDesignation: designation.replace(/^Ward\s+/i, ""),
      });
      setSuccess(true);
      setMessage("Nagarsevak authorization created. They can now use the main OTP login.");
    } catch (error) {
      setSuccess(false);
      setMessage(getUserErrorMessage(error, "The Nagarsevak could not be added. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[styles.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 12 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity>
        <View><Text style={styles.title}>Add Nagarsevak</Text><Text style={styles.subtitle}>Authorize an official mobile number</Text></View>
      </LinearGradient>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AppScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.infoCard}><Feather name="shield" size={18} color={GREEN} /><Text style={styles.infoText}>No password, access code, or separate registration is needed. The Nagarsevak verifies this mobile number on the main login screen.</Text></View>
          <View style={styles.card}>
            <Text style={styles.label}>Official full name *</Text>
            <View style={styles.inputShell}><Feather name="user" size={16} color="#94A3B8" /><TextInput value={name} onChangeText={setName} placeholder="Full name as per official record" placeholderTextColor="#94A3B8" autoCapitalize="words" style={styles.input} /></View>
            <Text style={styles.label}>Login mobile *</Text>
            <View style={styles.inputShell}><Text style={styles.prefix}>+91</Text><TextInput value={mobile} onChangeText={(value) => setMobile(value.replace(/\D/g, "").slice(0, 10))} placeholder="10 digit mobile number" placeholderTextColor="#94A3B8" keyboardType="number-pad" maxLength={10} style={styles.input} /></View>
            <Text style={styles.label}>Ward / designation *</Text>
            <View style={styles.wardGrid}>{NAGARSEVAK_WARDS.map((item) => <TouchableOpacity key={item} style={[styles.ward, designation === item && styles.wardActive]} onPress={() => setDesignation(item)}><Text style={[styles.wardText, designation === item && styles.wardTextActive]}>{item}</Text></TouchableOpacity>)}</View>
            <Text style={styles.orText}>or enter a special designation</Text>
            <View style={styles.inputShell}><Feather name="award" size={16} color="#94A3B8" /><TextInput value={NAGARSEVAK_WARDS.includes(designation) ? "" : designation} onChangeText={setDesignation} placeholder="Example: Nominated Member" placeholderTextColor="#94A3B8" style={styles.input} /></View>
            {message ? <View style={[styles.notice, success ? styles.noticeSuccess : styles.noticeError]}><Feather name={success ? "check-circle" : "alert-circle"} size={16} color={success ? "#059669" : "#DC2626"} /><Text style={[styles.noticeText, { color: success ? "#047857" : "#B91C1C" }]}>{message}</Text></View> : null}
            {success ? <TouchableOpacity style={styles.button} onPress={() => router.replace("/super-admin/officers" as any)}><Text style={styles.buttonText}>Back to Nagarsevak Management</Text></TouchableOpacity> : <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <><Feather name="user-plus" size={17} color="white" /><Text style={styles.buttonText}>Authorize Nagarsevak</Text></>}</TouchableOpacity>}
          </View>
        </AppScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, root: { flex: 1, backgroundColor: "#F1F5F9" }, header: { paddingHorizontal: 18, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, title: { fontSize: 21, color: "white", fontFamily: "Inter_700Bold" }, subtitle: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginTop: 2 }, content: { padding: 16 }, infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 16, padding: 13, marginBottom: 13 }, infoText: { flex: 1, fontSize: 11, lineHeight: 17, color: "#166534", fontFamily: "Inter_400Regular" }, card: { backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" }, label: { fontSize: 11.5, color: "#334155", fontFamily: "Inter_700Bold", marginTop: 10, marginBottom: 7 }, inputShell: { minHeight: 50, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 }, prefix: { fontSize: 13, color: "#475569", fontFamily: "Inter_700Bold" }, input: { flex: 1, minWidth: 0, color: "#0F172A", fontSize: 13, fontFamily: "Inter_500Medium", paddingVertical: 0 }, wardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, ward: { width: "22.8%", minHeight: 38, borderRadius: 10, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" }, wardActive: { backgroundColor: GREEN, borderColor: GREEN }, wardText: { fontSize: 9.5, color: "#64748B", fontFamily: "Inter_700Bold" }, wardTextActive: { color: "white" }, orText: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center", marginVertical: 10 }, notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11, borderRadius: 13, marginTop: 14, marginBottom: 12 }, noticeSuccess: { backgroundColor: "#ECFDF5" }, noticeError: { backgroundColor: "#FEF2F2" }, noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: "Inter_600SemiBold" }, button: { minHeight: 52, borderRadius: 15, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 }, buttonText: { color: "white", fontSize: 13.5, fontFamily: "Inter_700Bold" }, disabled: { opacity: 0.65 },
});
