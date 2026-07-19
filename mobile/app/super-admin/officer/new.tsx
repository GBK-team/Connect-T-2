import { AppScrollView } from "@/components/AppScrollView";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DobDatePicker from "@/components/DobDatePicker";
import { NAGARSEVAK_WARDS } from "@/data/wards";
import { apiPost, getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";

export default function CreateNagarsevakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [mobile, setMobile] = useState("");
  const [officeContact, setOfficeContact] = useState("");
  const [ward, setWard] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [residenceAddress, setResidenceAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const save = async () => {
    const phone = mobile.replace(/\D/g, "").slice(-10);
    const contact = (officeContact || mobile).replace(/\D/g, "").slice(-10);
    if (name.trim().split(/\s+/).length < 2) return setMessage("Enter the officer's full name, including surname.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return setMessage("Select a valid date of birth.");
    if (phone.length !== 10 || contact.length !== 10) return setMessage("Enter valid 10-digit mobile and office contact numbers.");
    if (!ward) return setMessage("Select a ward.");

    setSaving(true);
    setMessage("");
    try {
      const wardCode = String(Number(ward.match(/\d+/)?.[0] || 0));
      const officerId = `NS${Date.now()}`;
      await apiPost("/api/users", {
        id: officerId,
        name: name.trim(),
        dob,
        mobile: phone,
        role: "nagarsevak",
        ward,
        ward_code: wardCode,
        ward_number: wardCode,
        nagarsevak_id: officerId,
        approval_status: "approved",
        contact_name: name.trim(),
        contact_number: contact,
        office_address: officeAddress.trim() || null,
        residence_address: residenceAddress.trim() || null,
        address: residenceAddress.trim() || null,
      });
      setSuccess(true);
      setMessage("Nagarsevak account created and approved successfully.");
    } catch (error) {
      setSuccess(false);
      setMessage(getUserErrorMessage(error, "The Nagarsevak account could not be created. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return <View style={s.root}><LinearGradient colors={["#052E16", "#166534", GREEN]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 12 }]}><TouchableOpacity style={s.back} onPress={() => router.back()}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View><Text style={s.title}>Create Nagarsevak</Text><Text style={s.sub}>Create an approved ward officer account</Text></View></LinearGradient><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}><AppScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled"><View style={s.card}><Input label="Full Name *" value={name} onChangeText={setName} placeholder="Official full name" /><View style={s.field}><DobDatePicker label="Date of Birth" required value={dob} onChange={setDob} placeholder="Select date of birth" /></View><Input label="Login Mobile *" value={mobile} onChangeText={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile" /><Input label="Office Contact *" value={officeContact} onChangeText={(v) => setOfficeContact(v.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" maxLength={10} placeholder="Office contact number" /><Text style={s.label}>Ward *</Text><View style={s.wardGrid}>{NAGARSEVAK_WARDS.map((item) => <TouchableOpacity key={item} style={[s.ward, ward === item && s.wardActive]} onPress={() => setWard(item)}><Text style={[s.wardText, ward === item && s.wardTextActive]}>{item}</Text></TouchableOpacity>)}</View><Input label="Office Address" value={officeAddress} onChangeText={setOfficeAddress} placeholder="Ward office address" multiline /><Input label="Residence Address" value={residenceAddress} onChangeText={setResidenceAddress} placeholder="Residence address" multiline />{message ? <View style={[s.notice, success ? s.noticeSuccess : s.noticeError]}><Feather name={success ? "check-circle" : "alert-circle"} size={16} color={success ? "#059669" : "#DC2626"} /><Text style={[s.noticeText, { color: success ? "#047857" : "#B91C1C" }]}>{message}</Text></View> : null}{success ? <TouchableOpacity style={s.button} onPress={() => router.replace("/super-admin/officers" as any)}><Text style={s.buttonText}>Back to Officers</Text></TouchableOpacity> : <TouchableOpacity style={[s.button, saving && { opacity: 0.65 }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <><Feather name="user-plus" size={17} color="white" /><Text style={s.buttonText}>Create & Approve</Text></>}</TouchableOpacity>}</View></AppScrollView></KeyboardAvoidingView></View>;
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, multiline, style, ...rest } = props; return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...rest} multiline={multiline} style={[s.input, multiline && s.multiline, style]} placeholderTextColor="#94A3B8" /></View>; }

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: "#F0F4F8" }, header: { paddingHorizontal: 18, paddingBottom: 20, flexDirection: "row", alignItems: "center", gap: 12 }, back: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }, title: { fontSize: 21, color: "white", fontFamily: "Inter_700Bold" }, sub: { fontSize: 11.5, color: "rgba(255,255,255,0.68)", fontFamily: "Inter_400Regular", marginTop: 2 }, content: { padding: 16 }, card: { backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#DCFCE7" }, field: { marginBottom: 13 }, label: { fontSize: 11, color: "#334155", fontFamily: "Inter_700Bold", marginBottom: 6 }, input: { minHeight: 48, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 13, color: "#0F172A", fontFamily: "Inter_500Medium" }, multiline: { minHeight: 74, paddingTop: 12, textAlignVertical: "top" }, wardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 }, ward: { width: "22.8%", borderRadius: 10, paddingVertical: 9, alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" }, wardActive: { backgroundColor: GREEN, borderColor: GREEN }, wardText: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_700Bold" }, wardTextActive: { color: "white" }, notice: { flexDirection: "row", gap: 8, padding: 11, borderRadius: 13, marginBottom: 12 }, noticeSuccess: { backgroundColor: "#ECFDF5" }, noticeError: { backgroundColor: "#FEF2F2" }, noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontFamily: "Inter_600SemiBold" }, button: { minHeight: 52, borderRadius: 15, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, buttonText: { color: "white", fontSize: 14, fontFamily: "Inter_700Bold" } });
