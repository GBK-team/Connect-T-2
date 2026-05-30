import React, { useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useJobsAuth } from "@/context/JobsAuthContext";

type TemplateId = "classic" | "modern" | "minimal";
const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

const TEMPLATES: { id: TemplateId; name: string; desc: string; accent: string }[] = [
  { id: "classic", name: "Classic", desc: "Orange civic header, clean sections", accent: ORANGE },
  { id: "modern", name: "Modern", desc: "Dark header with orange accents", accent: DARK },
  { id: "minimal", name: "Minimal", desc: "Simple profile-first format", accent: "#92400E" },
];

function initials(name?: string) {
  return String(name || "CT").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
function splitList(value?: string) { return String(value || "").split(",").map((i) => i.trim()).filter(Boolean); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)/resume" as any); }

function HeaderAvatar({ user, dark = false }: { user: any; dark?: boolean }) {
  return <View style={[r.avatar, dark && r.avatarDark]}>{user.profilePhoto ? <Image source={{ uri: user.profilePhoto }} style={r.avatarImg} /> : <Text style={r.avatarText}>{initials(user.name)}</Text>}</View>;
}
function ResumeSection({ title, color = ORANGE, children }: { title: string; color?: string; children: React.ReactNode }) {
  return <View style={r.section}><View style={[r.sectionTitleRow, { borderBottomColor: color }]}><Text style={[r.sectionTitle, { color }]}>{title}</Text></View><View style={r.sectionBody}>{children}</View></View>;
}
function Skills({ skills, tone = "orange" }: { skills?: string; tone?: "orange" | "slate" }) {
  const list = splitList(skills);
  if (!list.length) return <Text style={r.bodyText}>—</Text>;
  return <View style={r.skillsWrap}>{list.map((skill, index) => <View key={`${skill}-${index}`} style={[r.skillChip, tone === "slate" && r.skillChipSlate]}><Text style={[r.skillText, tone === "slate" && r.skillTextSlate]}>{skill}</Text></View>)}</View>;
}
function Experience({ user }: { user: any }) {
  if (!user.experience && !user.currentCompany && !user.previousCompany) return <Text style={r.bodyText}>—</Text>;
  return <View style={{ gap: 8 }}>{!!user.experience && <Text style={r.bodyText}>Total Experience: {user.experience}</Text>}{!!user.currentCompany && <View style={r.expEntry}><Text style={r.expRole}>{user.currentRole || "Employee"}</Text><Text style={r.expCompany}>{user.currentCompany} · Current</Text></View>}{!!user.previousCompany && <View style={r.expEntry}><Text style={r.expRole}>{user.previousRole || "Employee"}</Text><Text style={r.expCompany}>{user.previousCompany} · Previous</Text></View>}</View>;
}
function ClassicResume({ user }: { user: any }) {
  return <View style={r.page}><LinearGradient colors={[DARK, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={r.classicHeader}><HeaderAvatar user={user} /><View style={{ flex: 1 }}><Text style={r.classicName}>{user.name}</Text><Text style={r.classicRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.classicContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View></LinearGradient><ResumeBody user={user} /></View>;
}
function ModernResume({ user }: { user: any }) {
  return <View style={r.page}><View style={r.modHeader}><HeaderAvatar user={user} dark /><View style={{ flex: 1 }}><Text style={r.modName}>{user.name}</Text><Text style={r.modRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.modContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View></View><View style={r.modAccentBar} /><ResumeBody user={user} /></View>;
}
function MinimalResume({ user }: { user: any }) {
  return <View style={r.page}><View style={r.minimalHeader}><Text style={r.minimalName}>{user.name}</Text><View style={r.minimalAccentLine} /><Text style={r.minimalRole}>{user.currentRole || user.qualification || "Job Seeker"}</Text><Text style={r.minimalContact}>+91 {user.phone}{user.email ? ` · ${user.email}` : ""}{user.location ? ` · ${user.location}` : ""}</Text></View><ResumeBody user={user} minimal /></View>;
}
function ResumeBody({ user, minimal = false }: { user: any; minimal?: boolean }) {
  const color = minimal ? "#92400E" : ORANGE;
  return <View style={r.body}>{!!user.about && <ResumeSection title={minimal ? "Career Objective" : "OBJECTIVE"} color={color}><Text style={r.bodyText}>{user.about}</Text></ResumeSection>}<ResumeSection title={minimal ? "Education" : "EDUCATION"} color={color}><Text style={r.bodyText}>{user.qualification || "—"}</Text>{user.collegeName ? <Text style={r.mutedText}>{user.collegeName}{user.fieldOfStudy ? ` · ${user.fieldOfStudy}` : ""}</Text> : null}</ResumeSection><ResumeSection title={minimal ? "Work Experience" : "WORK EXPERIENCE"} color={color}><Experience user={user} /></ResumeSection><ResumeSection title={minimal ? "Skills" : "SKILLS"} color={color}><Skills skills={user.skills} tone={minimal ? "slate" : "orange"} /></ResumeSection>{!!user.languages && <ResumeSection title={minimal ? "Languages" : "LANGUAGES"} color={color}><Text style={r.bodyText}>{user.languages}</Text></ResumeSection>}</View>;
}

export default function ResumeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 44 : insets.top;
  const router = useRouter();
  const { jobsUser } = useJobsAuth();
  const [selected, setSelected] = useState<TemplateId>("classic");
  if (!jobsUser) return null;

  const exportHint = (type: "PDF" | "Image") => Alert.alert(`${type} export`, "Resume export is prepared in this screen. For this APK build, use phone screenshot/share. Native PDF/image file export will be added with a safe export package after UI QA so the build remains stable.");

  if (jobsUser.role === "employer") {
    return <View style={styles.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} style={[styles.header, { paddingTop: topPad + 10 }]}><View style={styles.headerRow}><TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn}><Feather name="x" size={20} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Company Profile</Text><Text style={styles.headerSub}>Resume builder is for job seekers</Text></View></View></LinearGradient><View style={styles.employerBox}><Feather name="briefcase" size={38} color={ORANGE} /><Text style={styles.employerTitle}>Employer profile ready</Text><Text style={styles.employerText}>Use Profile tab to maintain company details visible to applicants.</Text><TouchableOpacity style={styles.updateBtn} onPress={() => goBack(router)}><Feather name="edit-2" size={16} color={ORANGE} /><Text style={styles.updateBtnText}>Go Back</Text></TouchableOpacity></View></View>;
  }

  return <View style={styles.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: topPad + 10 }]}><View style={styles.headerRow}><TouchableOpacity onPress={() => goBack(router)} style={styles.backBtn} activeOpacity={0.84}><Feather name="x" size={20} color="white" /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.headerTitle}>Your Resume</Text><Text style={styles.headerSub}>Generated from your Job Portal profile</Text></View><TouchableOpacity onPress={() => exportHint("Image")} style={styles.shareBtn} activeOpacity={0.85}><Feather name="image" size={16} color="white" /><Text style={styles.shareBtnText}>Image</Text></TouchableOpacity><TouchableOpacity onPress={() => exportHint("PDF")} style={styles.shareBtn} activeOpacity={0.85}><Feather name="file" size={16} color="white" /><Text style={styles.shareBtnText}>PDF</Text></TouchableOpacity></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>{TEMPLATES.map((template) => <TouchableOpacity key={template.id} style={[styles.templateChip, selected === template.id && styles.templateChipActive]} onPress={() => setSelected(template.id)} activeOpacity={0.8}><View style={[styles.templateDot, { backgroundColor: template.accent }]} /><View><Text style={[styles.templateName, selected === template.id && { color: ORANGE }]}>{template.name}</Text><Text style={styles.templateDesc}>{template.desc}</Text></View></TouchableOpacity>)}</ScrollView></LinearGradient><ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.preview, { paddingBottom: Math.max(insets.bottom, 16) + 20 }]} showsVerticalScrollIndicator={false}><View style={styles.paperShadow}>{selected === "classic" && <ClassicResume user={jobsUser} />}{selected === "modern" && <ModernResume user={jobsUser} />}{selected === "minimal" && <MinimalResume user={jobsUser} />}</View><View style={styles.hint}><Feather name="info" size={14} color={ORANGE} /><Text style={styles.hintText}>Use Image/PDF buttons above. Screenshot/share is safe in this test APK while native export package is added after QA.</Text></View><TouchableOpacity style={styles.updateBtn} onPress={() => router.replace("/jobs/(tabs)/profile" as any)} activeOpacity={0.85}><Feather name="edit-2" size={16} color={ORANGE} /><Text style={styles.updateBtnText}>Update Profile to Refresh Resume</Text></TouchableOpacity></ScrollView></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular", marginTop: 3 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  shareBtnText: { fontSize: 10, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  templateRow: { gap: 10, paddingBottom: 4 },
  templateChip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: "transparent", minWidth: 168 },
  templateChipActive: { borderColor: "white", backgroundColor: "white" },
  templateDot: { width: 13, height: 13, borderRadius: 7 },
  templateName: { fontSize: 13, fontWeight: "900", color: "#334155", fontFamily: "Inter_700Bold" },
  templateDesc: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_400Regular", maxWidth: 135, lineHeight: 14 },
  preview: { padding: 16 },
  paperShadow: { shadowColor: DARK, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 8, borderRadius: 16, backgroundColor: "white" },
  hint: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16, padding: 14, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: "#FED7AA" },
  hintText: { flex: 1, fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", lineHeight: 18 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", backgroundColor: "white", borderRadius: 18, padding: 15, marginTop: 12, borderWidth: 1.5, borderColor: "#FED7AA", shadowColor: DARK, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  updateBtnText: { fontSize: 13, fontWeight: "900", color: ORANGE, fontFamily: "Inter_700Bold" },
  employerBox: { margin: 16, backgroundColor: "white", borderRadius: 24, padding: 26, alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#FED7AA" },
  employerTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" },
  employerText: { fontSize: 13, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular", lineHeight: 19 },
});
const r = StyleSheet.create({
  page: { backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  classicHeader: { padding: 20, flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 74, height: 74, borderRadius: 37, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.55)" },
  avatarDark: { backgroundColor: ORANGE, borderColor: "#FB923C" }, avatarImg: { width: 74, height: 74, borderRadius: 37 }, avatarText: { fontSize: 26, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold" },
  classicName: { fontSize: 21, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, classicRole: { fontSize: 13, color: "rgba(255,255,255,0.86)", fontFamily: "Inter_400Regular", marginTop: 3 }, classicContact: { fontSize: 10, color: "rgba(255,255,255,0.82)", fontFamily: "Inter_400Regular", marginTop: 9, lineHeight: 15 },
  body: { padding: 17 }, modHeader: { backgroundColor: "#0F172A", padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }, modName: { fontSize: 22, color: "white", fontWeight: "900", fontFamily: "Inter_700Bold" }, modRole: { fontSize: 13, color: "#FDBA74", fontFamily: "Inter_600SemiBold", marginTop: 3 }, modContact: { fontSize: 10, color: "#CBD5E1", fontFamily: "Inter_400Regular", marginTop: 8, lineHeight: 15 }, modAccentBar: { height: 5, backgroundColor: ORANGE },
  minimalHeader: { padding: 22, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }, minimalName: { fontSize: 24, color: "#0F172A", fontWeight: "900", fontFamily: "Inter_700Bold" }, minimalAccentLine: { width: 64, height: 3, borderRadius: 999, backgroundColor: ORANGE, marginVertical: 9 }, minimalRole: { fontSize: 13, color: ORANGE, fontFamily: "Inter_700Bold" }, minimalContact: { marginTop: 8, fontSize: 10, color: "#64748B", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 15 },
  section: { marginBottom: 15 }, sectionTitleRow: { borderBottomWidth: 2, paddingBottom: 5, marginBottom: 8 }, sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, sectionBody: { gap: 6 }, bodyText: { fontSize: 12, color: "#334155", lineHeight: 18, fontFamily: "Inter_400Regular" }, mutedText: { fontSize: 11, color: "#64748B", lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 3 },
  expEntry: { paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: "#FED7AA" }, expRole: { fontSize: 12, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" }, expCompany: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, skillChip: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }, skillChipSlate: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }, skillText: { fontSize: 10, color: ORANGE, fontFamily: "Inter_700Bold" }, skillTextSlate: { color: "#334155" },
});
