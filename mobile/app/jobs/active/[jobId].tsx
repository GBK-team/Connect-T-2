import React, { useMemo, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobs, JobApplication } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

type ApplicantStatus = "pending" | "shortlisted" | "hired" | "rejected";

function cleanPhone(value?: string) { return String(value || "").replace(/\D/g, "").slice(-10); }
function goBack(router: any) { if (router.canGoBack?.()) router.back(); else router.replace("/jobs/(tabs)" as any); }
function statusTheme(status: ApplicantStatus) {
  if (status === "hired") return { label: "Hired", icon: "briefcase" as const, color: ORANGE, bg: "#FFF7ED", border: "#FED7AA" };
  if (status === "shortlisted") return { label: "Shortlisted", icon: "user-check" as const, color: ORANGE, bg: "#FFF7ED", border: "#FED7AA" };
  if (status === "rejected") return { label: "Rejected", icon: "user-x" as const, color: "#DC2626", bg: "#FEE2E2", border: "#FECACA" };
  return { label: "Pending", icon: "clock" as const, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" };
}
function displayName(app: JobApplication) { return app.seekerName || `Applicant ${app.seekerId.replace(/[^0-9]/g, "") || app.seekerId.slice(-4)}`; }
function InfoLine({ icon, text }: { icon: keyof typeof Feather.glyphMap; text?: string }) {
  if (!text) return null;
  return <View style={s.infoLine}><Feather name={icon} size={12} color="#64748B" /><Text style={s.infoText} numberOfLines={2}>{text}</Text></View>;
}

function ApplicantCard({ app, status, jobId, onShortlist, onReject, onHire }: { app: JobApplication; status: ApplicantStatus; jobId: string; onShortlist: () => Promise<void>; onReject: () => Promise<void>; onHire: () => Promise<void> }) {
  const router = useRouter();
  const theme = statusTheme(status);
  const [busy, setBusy] = useState(false);
  const phone = cleanPhone(app.seekerPhone);
  const name = displayName(app);
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (err: any) { Alert.alert("Action failed", err?.message || "Please try again."); } finally { setBusy(false); } };
  const openWhatsApp = async () => {
    if (!phone) { Alert.alert("Phone unavailable", "Applicant contact number is not available."); return; }
    const text = encodeURIComponent(`Hi ${name}, this is regarding your Connect T job application.`);
    await Linking.openURL(`https://wa.me/91${phone}?text=${text}`);
  };
  const openChat = () => router.push({ pathname: "/jobs/chat/[employerId]", params: { employerId: app.seekerId, jobId, peerName: name } } as any);
  return <View style={s.applicantCard}><View style={s.applicantTop}><View style={[s.avatar, { backgroundColor: theme.bg, borderColor: theme.border }]}><Feather name={theme.icon} size={16} color={theme.color} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.userName} numberOfLines={1}>{name}</Text><Text style={s.userSub} numberOfLines={1}>{phone ? `+91 ${phone}` : "Contact not available"}{app.seekerEmail ? ` · ${app.seekerEmail}` : ""}</Text></View><View style={[s.statusPill, { backgroundColor: theme.bg, borderColor: theme.border }]}><Text style={[s.statusPillText, { color: theme.color }]}>{theme.label}</Text></View></View><InfoLine icon="award" text={app.seekerQualification} /><InfoLine icon="tool" text={app.seekerSkills} /><View style={s.actionRow}><TouchableOpacity style={[s.smallBtn, s.orangeBtn]} onPress={openChat} activeOpacity={0.85}><Feather name="message-square" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Chat</Text></TouchableOpacity><TouchableOpacity style={[s.smallBtn, s.whatsappBtn]} onPress={openWhatsApp} activeOpacity={0.85}><Feather name="message-circle" size={13} color="#16A34A" /><Text style={[s.smallBtnText, { color: "#16A34A" }]}>WhatsApp</Text></TouchableOpacity>{status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.orangeBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onHire)} activeOpacity={0.85}><Feather name="check-circle" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Hire</Text></TouchableOpacity>}{status !== "shortlisted" && status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.orangeBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onShortlist)} activeOpacity={0.85}><Feather name="star" size={13} color={ORANGE} /><Text style={[s.smallBtnText, { color: ORANGE }]}>Shortlist</Text></TouchableOpacity>}{status !== "rejected" && status !== "hired" && <TouchableOpacity style={[s.smallBtn, s.rejectBtn, busy && s.disabledBtn]} disabled={busy} onPress={() => run(onReject)} activeOpacity={0.85}><Feather name="x-circle" size={13} color="#DC2626" /><Text style={[s.smallBtnText, { color: "#DC2626" }]}>Reject</Text></TouchableOpacity>}</View></View>;
}

function Metric({ value, label, color = ORANGE, bg = "#FFF7ED", border = "#FED7AA" }: { value: number; label: string; color?: string; bg?: string; border?: string }) {
  return <View style={[s.metricBox, { backgroundColor: bg, borderColor: border }]}><Text style={[s.metricNum, { color }]}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}

export default function ActiveJobDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs, shortlistApplicant, rejectApplicant, hireApplicant } = useJobs();
  const job = useMemo(() => jobs.find((j) => j.id === params.jobId) ?? null, [jobs, params.jobId]);
  const topPad = (Platform.OS === "web" ? 54 : insets.top) + 14;

  if (!job) return <View style={s.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} style={[s.header, { paddingTop: topPad }]}><TopShade height={110} /><DecorativeCircles /><View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="briefcase" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Active Job</Text></View></View><View style={s.notFoundHero}><View style={s.heroIcon}><Feather name="alert-circle" size={28} color={ORANGE} /></View><Text style={s.headerTitle}>Active Job</Text><Text style={s.headerSub}>Job not found</Text></View></LinearGradient></View>;

  const applications = (job.applications || []) as JobApplication[];
  const appMap = new Map(applications.map((app) => [app.seekerId, app]));
  const applicantIds = Array.from(new Set([...job.applicants, ...applications.map((app) => app.seekerId)]));
  const allApplicants: JobApplication[] = applicantIds.map((id) => appMap.get(id) || { id: `${job.id}_${id}`, jobId: job.id, seekerId: id, status: "applied" });
  const grouped = { hired: allApplicants.filter((app) => job.hired.includes(app.seekerId)), shortlisted: allApplicants.filter((app) => !job.hired.includes(app.seekerId) && job.shortlisted.includes(app.seekerId)), rejected: allApplicants.filter((app) => !job.hired.includes(app.seekerId) && job.rejected.includes(app.seekerId)), pending: allApplicants.filter((app) => !job.hired.includes(app.seekerId) && !job.shortlisted.includes(app.seekerId) && !job.rejected.includes(app.seekerId)) };
  const fillRate = job.openings > 0 ? Math.min(100, Math.round((grouped.hired.length / job.openings) * 100)) : 0;

  const renderGroup = (title: string, subtitle: string, status: ApplicantStatus, items: JobApplication[]) => { const theme = statusTheme(status); return <View style={s.card}><View style={s.cardHeader}><View style={[s.sectionIcon, { backgroundColor: theme.bg, borderColor: theme.border }]}><Feather name={theme.icon} size={18} color={theme.color} /></View><View style={{ flex: 1 }}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{subtitle}</Text></View><Text style={[s.countText, { color: theme.color }]}>{items.length}</Text></View>{items.length === 0 ? <View style={s.emptyInline}><Feather name="users" size={30} color="#CBD5E1" /><Text style={s.emptyText}>No applicants in this section</Text></View> : items.map((app) => <ApplicantCard key={`${status}-${app.seekerId}`} app={app} status={status} jobId={job.id} onShortlist={() => shortlistApplicant(job.id, app.seekerId)} onReject={() => rejectApplicant(job.id, app.seekerId)} onHire={() => hireApplicant(job.id, app.seekerId)} />)}</View>; };

  return <View style={s.root}><LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}><TopShade height={120} /><DecorativeCircles /><View style={s.headerTop}><TouchableOpacity onPress={() => goBack(router)} style={s.backBtn} activeOpacity={0.84}><Feather name="chevron-left" size={22} color="white" /></TouchableOpacity><View style={s.headerBadge}><Feather name="zap" size={11} color="rgba(255,255,255,0.86)" /><Text style={s.headerBadgeText}>Hiring Pipeline</Text></View></View><View style={s.heroRow}><View style={s.heroIcon}><Feather name="briefcase" size={27} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.headerTitle} numberOfLines={2}>{job.title}</Text><Text style={s.headerSub} numberOfLines={2}>{job.company} · {job.location}</Text></View></View><View style={s.headerStats}><HeaderStat value={job.openings} label="Openings" /><View style={s.headerStatDivider} /><HeaderStat value={allApplicants.length} label="Applicants" /><View style={s.headerStatDivider} /><HeaderStat value={grouped.hired.length} label="Hired" /></View></LinearGradient><ScrollView contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 86 }]} showsVerticalScrollIndicator={false}><View style={s.card}><View style={s.cardHeader}><View style={s.sectionIcon}><Feather name="bar-chart-2" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.sectionTitle}>Hiring Progress</Text><Text style={s.sectionSub}>Applicant pipeline connected to MySQL</Text></View><Text style={s.fillPercent}>{fillRate}%</Text></View><View style={s.progressTrack}><View style={[s.progressFill, { width: `${fillRate}%` as any }]} /></View><View style={s.metricGrid}><Metric value={allApplicants.length} label="Applied" color="#2563EB" bg="#EFF6FF" border="#BFDBFE" /><Metric value={grouped.pending.length} label="Pending" /><Metric value={grouped.shortlisted.length} label="Shortlisted" /><Metric value={grouped.hired.length} label="Hired" /><Metric value={grouped.rejected.length} label="Rejected" color="#DC2626" bg="#FEE2E2" border="#FECACA" /></View></View>{renderGroup("Pending Review", `${grouped.pending.length} applications waiting`, "pending", grouped.pending)}{renderGroup("Shortlisted", `${grouped.shortlisted.length} candidates shortlisted`, "shortlisted", grouped.shortlisted)}{renderGroup("Hired Users", `${grouped.hired.length} selected candidates`, "hired", grouped.hired)}{renderGroup("Rejected", `${grouped.rejected.length} rejected applications`, "rejected", grouped.rejected)}</ScrollView></View>;
}

function HeaderStat({ value, label }: { value: number; label: string }) { return <View style={s.headerStatItem}><Text style={s.headerStatNum}>{value}</Text><Text style={s.headerStatLabel}>{label}</Text></View>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerTop: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, backBtn: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }, headerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, headerBadgeText: { fontSize: 10.5, color: "white", fontFamily: "Inter_700Bold" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 18 }, notFoundHero: { alignItems: "center", paddingTop: 20 }, heroIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: "white", alignItems: "center", justifyContent: "center", shadowColor: DARK, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 }, headerTitle: { fontSize: 22, fontWeight: "900", color: "white", fontFamily: "Inter_700Bold", letterSpacing: -0.35 }, headerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.78)", marginTop: 4, fontFamily: "Inter_400Regular", lineHeight: 16 },
  headerStats: { marginTop: 16, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, headerStatItem: { flex: 1, alignItems: "center" }, headerStatNum: { fontSize: 20, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" }, headerStatLabel: { fontSize: 9.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 2 }, headerStatDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  content: { padding: 16, gap: 12 }, card: { backgroundColor: "white", borderRadius: 18, padding: 14, gap: 12, shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: "rgba(254,215,170,0.9)" }, cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, sectionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, sectionTitle: { fontSize: 14, fontWeight: "900", color: "#0F172A", fontFamily: "Inter_700Bold" }, sectionSub: { fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular", marginTop: 1 }, countText: { fontSize: 18, fontFamily: "Inter_700Bold", fontWeight: "900" }, fillPercent: { fontSize: 18, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" },
  progressTrack: { height: 9, borderRadius: 999, backgroundColor: "#F1F5F9", overflow: "hidden" }, progressFill: { height: 9, borderRadius: 999, backgroundColor: ORANGE }, metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metricBox: { flexBasis: "48%", flexGrow: 1, borderRadius: 15, borderWidth: 1, paddingVertical: 11, alignItems: "center" }, metricNum: { fontSize: 18, fontWeight: "900", fontFamily: "Inter_700Bold" }, metricLabel: { fontSize: 9.5, color: "#64748B", fontFamily: "Inter_500Medium", marginTop: 1 },
  applicantCard: { borderTopWidth: 1, borderTopColor: "#F8FAFC", paddingTop: 12, gap: 9 }, applicantTop: { flexDirection: "row", alignItems: "center", gap: 11 }, avatar: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 }, userName: { fontSize: 13.5, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" }, userSub: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 }, statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 }, statusPillText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  infoLine: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }, infoText: { flex: 1, fontSize: 10.5, color: "#475569", fontFamily: "Inter_600SemiBold" }, actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, smallBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, smallBtnText: { fontSize: 10.5, fontFamily: "Inter_700Bold" }, disabledBtn: { opacity: 0.55 }, orangeBtn: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }, whatsappBtn: { backgroundColor: "#ECFDF5", borderColor: "#BBF7D0" }, rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }, emptyInline: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 22, backgroundColor: "#F8FAFC", borderRadius: 16 }, emptyText: { fontSize: 11.5, color: "#64748B", fontFamily: "Inter_600SemiBold" },
});
