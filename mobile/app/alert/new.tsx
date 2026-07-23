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
import * as ImagePicker from "expo-image-picker";

import { AppScrollView } from "@/components/AppScrollView";
import { AlertMedia, AlertPriority, AlertType, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const DARK = "#052E16";
const BG = "#EBEFFC";
const MAX_VIDEO_MS = 120000;
const CATEGORIES = ["Civic", "Water", "Electricity", "Road", "Health", "Event"];

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

function Notice({ visible, title, message, success, onClose }: { visible: boolean; title: string; message: string; success: boolean; onClose: () => void }) {
  const color = success ? GREEN : "#DC2626";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}><View style={s.noticeCard}>
        <View style={[s.noticeIcon, { backgroundColor: success ? "#DCFCE7" : "#FEE2E2" }]}><Feather name={success ? "check-circle" : "alert-circle"} size={27} color={color} /></View>
        <Text style={s.noticeTitle}>{title}</Text><Text style={s.noticeText}>{message}</Text>
        <TouchableOpacity style={[s.noticeButton, { backgroundColor: color }]} onPress={onClose}><Text style={s.noticeButtonText}>OK</Text></TouchableOpacity>
      </View></View>
    </Modal>
  );
}

export default function NewAlertScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { addAlert } = useAlerts();
  const canPublish = user?.role === "nagarsevak" || user?.role === "super_admin" || !!user?.isSuperAdmin;
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;

  const [type, setType] = useState<AlertType>("news");
  const [priority, setPriority] = useState<AlertPriority>("normal");
  const [category, setCategory] = useState("Civic");
  const [audience, setAudience] = useState(isSuperAdmin ? "All citizens" : "Ward residents");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState(user?.ward || "");
  const [contact, setContact] = useState("");
  const [validTo, setValidTo] = useState(new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [media, setMedia] = useState<AlertMedia | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ visible: false, title: "", message: "", success: false });

  useEffect(() => {
    if (!user) router.replace("/login" as any);
    else if (!canPublish) router.replace("/alert/list" as any);
  }, [canPublish, router, user]);

  const expiresAt = useMemo(() => {
    const date = new Date(`${validTo}T23:59:59`);
    return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() ? date.toISOString() : "";
  }, [validTo]);

  const showError = (titleText: string, message: string) => setNotice({ visible: true, title: titleText, message, success: false });

  const pickMedia = async () => {
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return showError("Permission required", "Allow photo-library access to attach an image or video.");
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.82, videoMaxDuration: 120 });
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;
    const selectedType = asset.type === "video" ? "video" : "image";
    if (selectedType === "video" && Number(asset.duration || 0) > MAX_VIDEO_MS) return showError("Video too long", "Select a video of two minutes or less.");
    setMedia({ uri: asset.uri, type: selectedType, fileName: asset.fileName || undefined, mimeType: asset.mimeType || undefined, duration: asset.duration || undefined });
  };

  const submit = async () => {
    if (submitting) return;
    if (title.trim().length < 3) return showError("Title required", "Enter a clear title of at least three characters.");
    if (body.trim().length < 8) return showError("More details required", "Explain the update clearly so citizens know what action to take.");
    if (!expiresAt) return showError("Invalid expiry date", "Enter a future date in YYYY-MM-DD format.");
    if (audience === "Ward residents" && location.trim().length < 2) return showError("Ward required", "Enter the ward or affected area.");

    setSubmitting(true);
    try {
      await addAlert({
        title: title.trim(),
        body: contact.trim() ? `${body.trim()}\n\nContact: ${contact.trim()}` : body.trim(),
        type,
        priority,
        category,
        targetAudience: audience,
        location: location.trim() || undefined,
        expiresAt,
        validUntil: new Date(expiresAt).toLocaleString("en-IN"),
        media,
      }, user?.name || "Connect-T", user?.id, audience === "Ward residents" ? (isSuperAdmin ? location.trim() : user?.ward) : undefined);
      setNotice({ visible: true, title: "Published successfully", message: "Citizens in the selected audience can now see this alert or news update.", success: true });
    } catch (requestError) {
      showError("Publishing failed", getUserErrorMessage(requestError, "This update could not be published right now."));
    } finally {
      setSubmitting(false);
    }
  };

  const closeNotice = () => {
    const shouldLeave = notice.success;
    setNotice((current) => ({ ...current, visible: false }));
    if (shouldLeave) router.replace("/alert/list" as any);
  };

  if (!canPublish) return null;

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, "#166534", GREEN]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={s.headerRow}><TouchableOpacity style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/alert/list" as any)}><Feather name="chevron-left" size={20} color="white" /><Text style={s.backText}>Back</Text></TouchableOpacity><View style={s.rolePill}><Feather name="shield" size={12} color="#BBF7D0" /><Text style={s.roleText}>{isSuperAdmin ? "SUPER ADMIN" : "NAGARSEVAK"}</Text></View></View>
        <Text style={s.headerTitle}>Post Alert / News</Text><Text style={s.headerSub}>Publish an official update to all citizens or your ward.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <AppScrollView
          style={s.flex}
          contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 12) + 150 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}><Text style={s.sectionTitle}>Update Type</Text><View style={s.segmentRow}>{(["news", "alert", "emergency"] as AlertType[]).map((item) => { const active = type === item; return <TouchableOpacity key={item} onPress={() => setType(item)} style={[s.segment, active && s.segmentActive]}><Feather name={item === "news" ? "radio" : item === "emergency" ? "alert-octagon" : "alert-triangle"} size={14} color={active ? "white" : GREEN} /><Text style={[s.segmentText, active && s.segmentTextActive]}>{item === "emergency" ? "Emergency" : item === "alert" ? "Alert" : "News"}</Text></TouchableOpacity>; })}</View><Text style={s.label}>Priority</Text><View style={s.chips}>{(["normal", "important", "urgent", "high"] as AlertPriority[]).map((item) => <TouchableOpacity key={item} onPress={() => setPriority(item)} style={[s.chip, priority === item && s.chipActive]}><Text style={[s.chipText, priority === item && s.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View></View>

          <View style={s.card}><Text style={s.sectionTitle}>Public Message</Text><Input label="Title *" value={title} onChangeText={setTitle} placeholder="Example: Water supply interruption tomorrow" maxLength={255} /><Input label="Detailed message *" value={body} onChangeText={setBody} placeholder="Mention affected area, date, time, reason and citizen instructions." multiline maxLength={5000} /><Input label="Helpline / Office Contact" value={contact} onChangeText={setContact} placeholder="Optional contact number" keyboardType="phone-pad" /></View>

          <View style={s.card}><Text style={s.sectionTitle}>Audience & Validity</Text><Text style={s.label}>Audience</Text><View style={s.segmentRow}><TouchableOpacity onPress={() => setAudience("Ward residents")} style={[s.audience, audience === "Ward residents" && s.audienceActive]}><Feather name="map-pin" size={15} color={audience === "Ward residents" ? "white" : GREEN} /><Text style={[s.segmentText, audience === "Ward residents" && s.segmentTextActive]}>Ward residents</Text></TouchableOpacity>{isSuperAdmin ? <TouchableOpacity onPress={() => setAudience("All citizens")} style={[s.audience, audience === "All citizens" && s.audienceActive]}><Feather name="users" size={15} color={audience === "All citizens" ? "white" : GREEN} /><Text style={[s.segmentText, audience === "All citizens" && s.segmentTextActive]}>All citizens</Text></TouchableOpacity> : null}</View>{audience === "Ward residents" ? <Input label={isSuperAdmin ? "Target Ward / Area *" : "Your Ward"} value={location} onChangeText={setLocation} editable={isSuperAdmin} placeholder="Ward or affected area" /> : null}<Input label="Valid Until *" value={validTo} onChangeText={setValidTo} placeholder="YYYY-MM-DD" autoCapitalize="none" /><Text style={s.help}>Expired updates are automatically hidden from citizens.</Text></View>

          <View style={s.card}><Text style={s.sectionTitle}>Category & Attachment</Text><Text style={s.label}>Category</Text><View style={s.chips}>{CATEGORIES.map((item) => <TouchableOpacity key={item} onPress={() => setCategory(item)} style={[s.chip, category === item && s.chipActive]}><Text style={[s.chipText, category === item && s.chipTextActive]}>{item}</Text></TouchableOpacity>)}</View>{media ? <View style={s.preview}>{media.type === "image" ? <Image source={{ uri: media.uri }} style={s.previewImage} /> : <View style={s.videoPreview}><Feather name="play-circle" size={38} color={GREEN} /><Text style={s.videoText}>Video selected</Text></View>}<TouchableOpacity style={s.remove} onPress={() => setMedia(null)}><Feather name="x" size={14} color="#DC2626" /><Text style={s.removeText}>Remove</Text></TouchableOpacity></View> : <TouchableOpacity style={s.upload} onPress={pickMedia}><Feather name="upload-cloud" size={25} color={GREEN} /><Text style={s.uploadTitle}>Add photo or video</Text><Text style={s.uploadText}>Optional · Video up to 2 minutes</Text></TouchableOpacity>}</View>

          <TouchableOpacity style={[s.publish, submitting && { opacity: 0.65 }]} onPress={submit} disabled={submitting} activeOpacity={0.88}>{submitting ? <ActivityIndicator color="white" /> : <><Feather name="send" size={16} color="white" /><Text style={s.publishText}>Publish to Citizens</Text></>}</TouchableOpacity>
        </AppScrollView>
      </KeyboardAvoidingView>
      <Notice visible={notice.visible} title={notice.title} message={notice.message} success={notice.success} onClose={closeNotice} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, flex: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7 }, backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  rolePill: { flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)" }, roleText: { color: "#BBF7D0", fontSize: 9, letterSpacing: 0.8, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 22, color: "white", fontFamily: "Inter_700Bold" }, headerSub: { marginTop: 4, fontSize: 11.5, color: "rgba(255,255,255,0.74)", fontFamily: "Inter_400Regular" },
  content: { padding: 14, gap: 12 },
  card: { padding: 15, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  sectionTitle: { marginBottom: 12, fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold" },
  inputGroup: { marginBottom: 12 }, label: { marginBottom: 6, fontSize: 10.5, color: "#475569", fontFamily: "Inter_700Bold" },
  input: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingHorizontal: 12, color: "#0F172A", fontSize: 12.5, fontFamily: "Inter_500Medium" }, textArea: { minHeight: 115, paddingTop: 12 },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 13 }, segment: { flexGrow: 1, minWidth: 88, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" }, segmentActive: { backgroundColor: GREEN, borderColor: GREEN }, segmentText: { color: "#166534", fontSize: 10.5, fontFamily: "Inter_700Bold" }, segmentTextActive: { color: "white" },
  audience: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" }, audienceActive: { backgroundColor: GREEN, borderColor: GREEN },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 10 }, chip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#F1F5F9" }, chipActive: { backgroundColor: "#DCFCE7", borderWidth: 1, borderColor: "#86EFAC" }, chipText: { fontSize: 9.8, color: "#64748B", textTransform: "capitalize", fontFamily: "Inter_600SemiBold" }, chipTextActive: { color: "#166534" },
  help: { marginTop: -3, fontSize: 9.8, lineHeight: 14, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  upload: { marginTop: 8, minHeight: 105, alignItems: "center", justifyContent: "center", borderRadius: 15, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#86EFAC", backgroundColor: "#F0FDF4" }, uploadTitle: { marginTop: 6, color: "#166534", fontSize: 12, fontFamily: "Inter_700Bold" }, uploadText: { marginTop: 2, color: "#94A3B8", fontSize: 9.8, fontFamily: "Inter_400Regular" },
  preview: { marginTop: 8, borderRadius: 15, overflow: "hidden", backgroundColor: "#F8FAFC" }, previewImage: { width: "100%", height: 180, resizeMode: "cover" }, videoPreview: { height: 125, alignItems: "center", justifyContent: "center" }, videoText: { marginTop: 5, color: "#166534", fontFamily: "Inter_700Bold" }, remove: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, backgroundColor: "#FEF2F2" }, removeText: { color: "#DC2626", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  publish: { minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 15, backgroundColor: GREEN }, publishText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, padding: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.48)" }, noticeCard: { width: "100%", maxWidth: 360, padding: 22, borderRadius: 22, alignItems: "center", backgroundColor: "white" }, noticeIcon: { width: 56, height: 56, borderRadius: 19, alignItems: "center", justifyContent: "center" }, noticeTitle: { marginTop: 11, fontSize: 17, color: "#0F172A", textAlign: "center", fontFamily: "Inter_700Bold" }, noticeText: { marginTop: 6, fontSize: 11.5, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" }, noticeButton: { marginTop: 16, minWidth: 100, paddingVertical: 10, borderRadius: 13, alignItems: "center" }, noticeButtonText: { color: "white", fontFamily: "Inter_700Bold" },
});
