import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { useJobs, categoryConfig, typeConfig, Job } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#ebeffc";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function isNearby(jobLocation: string, userLocation?: string): boolean {
  if (!userLocation) return false;
  const location = jobLocation.toLowerCase();
  const parts = userLocation.toLowerCase().split(/[\s,]+/);
  return parts.some((part) => part.length > 3 && location.includes(part));
}

function getIcon(job: Job) {
  const cfg: any = categoryConfig[job.category];
  return cfg?.icon || "briefcase";
}

function getTypeLabel(job: Job) {
  const cfg: any = typeConfig[job.type];
  return cfg?.label || job.type || "Job";
}

function StatCard({ icon, label, value, tone = "orange" }: { icon: any; label: string; value: string | number; tone?: "orange" | "blue" | "red" | "slate" }) {
  const tones = {
    orange: { bg: "#FFF7ED", color: ORANGE, border: "#FED7AA" },
    blue: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    red: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
    slate: { bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" },
  }[tone];
  return (
    <View style={[s.statCard, { backgroundColor: tones.bg, borderColor: tones.border }]}> 
      <View style={[s.statIcon, { backgroundColor: "rgba(255,255,255,0.75)" }]}><Feather name={icon} size={17} color={tones.color} /></View>
      <Text style={[s.statNum, { color: tones.color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function JobCard({ job, applied, near, onApply, onOpen }: { job: Job; applied: boolean; near?: boolean; onApply: () => void; onOpen: () => void }) {
  return (
    <TouchableOpacity style={s.jobCard} activeOpacity={0.88} onPress={onOpen}>
      <View style={s.jobTop}>
        <View style={s.jobIcon}><Feather name={getIcon(job) as any} size={18} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.jobCompany} numberOfLines={1}>{job.company}</Text>
        </View>
        {near ? <View style={s.nearPill}><Feather name="map-pin" size={10} color={ORANGE} /><Text style={s.nearText}>Near</Text></View> : <Feather name="chevron-right" size={18} color="#CBD5E1" />}
      </View>

      <View style={s.metaWrap}>
        <View style={s.meta}><Feather name="map-pin" size={12} color="#64748B" /><Text style={s.metaText} numberOfLines={1}>{job.location}</Text></View>
        <View style={[s.meta, s.typeMeta]}><Text style={s.typeText}>{getTypeLabel(job)}</Text></View>
        <View style={s.meta}><Feather name="users" size={12} color="#64748B" /><Text style={s.metaText}>{job.openings}</Text></View>
      </View>

      <View style={s.jobBottom}>
        <View style={{ flex: 1 }}>
          <Text style={s.salary}>{job.salary}</Text>
          <Text style={s.applicants}>{job.applicants.length} applicants · {timeAgo(job.createdAt)}</Text>
        </View>
        {applied ? <View style={s.appliedBtn}><Feather name="check" size={13} color={ORANGE} /><Text style={s.appliedText}>Applied</Text></View> : (
          <TouchableOpacity style={s.applyBtn} activeOpacity={0.9} onPress={(e) => { e.stopPropagation(); onApply(); }}>
            <Text style={s.applyText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function NotificationsModal({ visible, onClose, jobs }: { visible: boolean; onClose: () => void; jobs: Job[] }) {
  const insets = useSafeAreaInsets();
  const recentJobs = [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}> 
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}><View><Text style={s.sheetTitle}>Job Updates</Text><Text style={s.sheetSub}>Latest openings near you</Text></View><TouchableOpacity style={s.sheetClose} onPress={onClose}><Feather name="x" size={18} color="#64748B" /></TouchableOpacity></View>
          {recentJobs.length === 0 ? <Empty icon="bell-off" title="No updates yet" sub="New job notifications will appear here." /> : (
            <ScrollView showsVerticalScrollIndicator={false}>{recentJobs.map((job) => <View key={job.id} style={s.notificationItem}><View style={s.notificationIcon}><Feather name={getIcon(job) as any} size={15} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.notificationTitle} numberOfLines={1}>{job.title}</Text><Text style={s.notificationSub} numberOfLines={1}>{job.company} · {job.location}</Text></View><Text style={s.notificationTime}>{timeAgo(job.createdAt)}</Text></View>)}</ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Empty({ icon, title, sub }: { icon: any; title: string; sub: string }) {
  return <View style={s.emptyBox}><Feather name={icon} size={38} color="#CBD5E1" /><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptySub}>{sub}</Text></View>;
}

function EmployerDashboard({ jobs, employerId, onPostJob, onToggle, onDelete }: { jobs: Job[]; employerId: string; onPostJob: () => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const router = useRouter();
  const myJobs = jobs.filter((job) => job.employerId === employerId);
  const activeJobs = myJobs.filter((job) => job.active);
  const totalApplicants = myJobs.reduce((sum, job) => sum + job.applicants.length, 0);
  const totalShortlisted = myJobs.reduce((sum, job) => sum + job.shortlisted.length, 0);
  const totalRejected = myJobs.reduce((sum, job) => sum + job.rejected.length, 0);
  const pending = Math.max(totalApplicants - totalShortlisted - totalRejected, 0);
  const shortlistRate = totalApplicants > 0 ? Math.round((totalShortlisted / totalApplicants) * 100) : 0;

  const confirmDelete = (job: Job) => {
    Alert.alert("Delete job posting?", `${job.title} will be removed from the job portal.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(job.id) },
    ]);
  };

  return (
    <View style={s.employerWrap}>
      <View style={s.employerHero}>
        <View style={s.sectionTop}><View><Text style={s.eyebrow}>EMPLOYER COMMAND CENTER</Text><Text style={s.bigTitle}>Hiring Overview</Text><Text style={s.muted}>Track openings, applicants and hiring status.</Text></View><View style={s.heroIcon}><Feather name="briefcase" size={20} color={ORANGE} /></View></View>
        <View style={s.heroStats}><HeroStat value={myJobs.length} label="Jobs" /><View style={s.heroDivider} /><HeroStat value={totalApplicants} label="Applicants" /><View style={s.heroDivider} /><HeroStat value={`${shortlistRate}%`} label="Shortlist" /></View>
      </View>

      <TouchableOpacity style={s.postJobButton} onPress={onPostJob} activeOpacity={0.9}>
        <LinearGradient colors={[DARK, ORANGE, "#F97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.postJobGrad}>
          <View style={s.postJobIcon}><Feather name="plus" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.postTitle}>Post a New Job</Text><Text style={s.postSub}>Create vacancy and receive applicants</Text></View><Feather name="arrow-right" size={18} color="rgba(255,255,255,0.85)" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.statGrid}><StatCard icon="zap" label="Active" value={activeJobs.length} /><StatCard icon="users" label="Pending" value={pending} tone="blue" /><StatCard icon="user-check" label="Shortlisted" value={totalShortlisted} /><StatCard icon="x-circle" label="Rejected" value={totalRejected} tone="red" /></View>
      <SectionHeader title="Job Performance" sub="Manage posted jobs and applicants" count={myJobs.length} />
      {myJobs.length === 0 ? <Empty icon="inbox" title="No jobs posted yet" sub="Post your first job to start receiving applicants." /> : myJobs.map((job) => (
        <View key={job.id} style={s.employerJobCard}>
          <View style={s.jobTop}><View style={s.jobIcon}><Feather name={getIcon(job) as any} size={18} color={ORANGE} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text><Text style={s.jobCompany} numberOfLines={1}>{job.location} · {job.salary}</Text></View><Switch value={job.active} onValueChange={() => onToggle(job.id)} trackColor={{ false: "#E2E8F0", true: "#FED7AA" }} thumbColor={job.active ? ORANGE : "#94A3B8"} style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }} /></View>
          <View style={s.performanceRow}><Perf value={job.applicants.length} label="Applied" /><View style={s.perfLine} /><Perf value={job.shortlisted.length} label="Shortlisted" tone="orange" /><View style={s.perfLine} /><Perf value={Math.max(job.applicants.length - job.shortlisted.length - job.rejected.length, 0)} label="Pending" /></View>
          <View style={s.employerActions}><TouchableOpacity style={s.openJobBtn} onPress={() => router.push(`/jobs/active/${job.id}` as any)}><Feather name="bar-chart-2" size={14} color={ORANGE} /><Text style={s.openJobText}>Open Dashboard</Text><Feather name="chevron-right" size={14} color={ORANGE} /></TouchableOpacity><TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(job)}><Feather name="trash-2" size={15} color="#DC2626" /></TouchableOpacity></View>
        </View>
      ))}
    </View>
  );
}

function HeroStat({ value, label }: { value: string | number; label: string }) { return <View style={s.heroStat}><Text style={s.heroValue}>{value}</Text><Text style={s.heroLabel}>{label}</Text></View>; }
function Perf({ value, label, tone = "slate" }: { value: string | number; label: string; tone?: "orange" | "slate" }) { return <View style={s.perfItem}><Text style={[s.perfValue, tone === "orange" && { color: ORANGE }]}>{value}</Text><Text style={s.perfLabel}>{label}</Text></View>; }
function SectionHeader({ title, sub, count }: { title: string; sub: string; count?: number }) { return <View style={s.sectionRow}><View><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionSub}>{sub}</Text></View>{count !== undefined && <View style={s.countPill}><Text style={s.countText}>{count}</Text></View>}</View>; }

export default function JobsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 66 : insets.top;
  const { jobsUser } = useJobsAuth();
  const { jobs, applyJob, hasApplied, toggleJobActive, deleteJob } = useJobs();
  const [showNotifications, setShowNotifications] = useState(false);
  const isEmployer = jobsUser?.role === "employer";
  const activeJobs = useMemo(() => jobs.filter((job) => job.active), [jobs]);
  const visibleJobs = useMemo(() => !jobsUser || jobsUser.role !== "seeker" ? activeJobs : activeJobs.filter((job) => !job.applicants.includes(jobsUser.id)), [activeJobs, jobsUser]);
  const nearbyJobs = useMemo(() => activeJobs.filter((job) => isNearby(job.location, jobsUser?.location)), [activeJobs, jobsUser?.location]);
  const appliedCount = useMemo(() => jobsUser ? jobs.filter((job) => job.applicants.includes(jobsUser.id)).length : 0, [jobs, jobsUser]);

  const handleApply = (job: Job) => {
    if (!jobsUser) return;
    if (isEmployer) { Alert.alert("Not allowed", "Employers cannot apply for jobs."); return; }
    if (hasApplied(job.id, jobsUser.id)) return;
    applyJob(job.id, jobsUser.id);
    Alert.alert("Application sent", `You have applied for ${job.title} at ${job.company}.`);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#F97316", "#FB923C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad + 12 }]}> 
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerRow}><View style={{ flex: 1 }}><View style={s.headerPill}><Feather name="briefcase" size={10} color="rgba(255,255,255,0.9)" /><Text style={s.headerPillText}>{isEmployer ? "EMPLOYER PORTAL" : "LOCAL JOBS"}</Text></View><Text style={s.headerTitle}>{isEmployer ? "Employer Dashboard" : "Connect T Jobs"}</Text><Text style={s.headerSub} numberOfLines={2}>{isEmployer ? `${jobsUser?.company || jobsUser?.name || "Company"} · Hiring workspace` : `Hello, ${jobsUser?.name?.split(" ")[0] || "there"} · Find trusted local work`}</Text></View>{!isEmployer && <TouchableOpacity style={s.headerIcon} onPress={() => setShowNotifications(true)}><Feather name="bell" size={18} color="white" />{activeJobs.length > 0 && <View style={s.headerDot} />}</TouchableOpacity>}</View>
        {!isEmployer && <TouchableOpacity style={s.searchCard} activeOpacity={0.9} onPress={() => router.push("/jobs/search" as any)}><View style={s.searchIcon}><Feather name="search" size={18} color={ORANGE} /></View><View style={{ flex: 1 }}><Text style={s.searchTitle}>Search jobs, companies, locations</Text><Text style={s.searchSub}>Tap to explore all available work</Text></View><Feather name="sliders" size={18} color="#94A3B8" /></TouchableOpacity>}
      </LinearGradient>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 92 }]}> 
        {isEmployer ? <EmployerDashboard jobs={jobs} employerId={jobsUser?.id || ""} onPostJob={() => router.push("/jobs/(tabs)/post" as any)} onToggle={toggleJobActive} onDelete={deleteJob} /> : <>
          <View style={s.quickStats}><StatCard icon="briefcase" label="Open Jobs" value={activeJobs.length} /><StatCard icon="map-pin" label="Nearby" value={nearbyJobs.length} tone="blue" /><StatCard icon="check-circle" label="Applied" value={appliedCount} /></View>
          <View style={s.actionGrid}><Action icon="search" title="Find Jobs" sub="Search openings" onPress={() => router.push("/jobs/search" as any)} /><Action icon="clipboard" title="Applications" sub="Track status" onPress={() => router.push("/jobs/(tabs)/applied" as any)} /><Action icon="file-text" title="Resume" sub="Build profile" onPress={() => router.push("/jobs/resume" as any)} /></View>
          {nearbyJobs.length > 0 && <View style={s.sectionBlock}><SectionHeader title="Near You" sub="Jobs matching your location" count={nearbyJobs.length} />{nearbyJobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} near applied={!!jobsUser && hasApplied(job.id, jobsUser.id)} onOpen={() => router.push(`/jobs/detail/${job.id}` as any)} onApply={() => handleApply(job)} />)}</View>}
          <View style={s.sectionBlock}><SectionHeader title="Recommended Jobs" sub="Fresh openings from local employers" /><TouchableOpacity onPress={() => router.push("/jobs/search" as any)} style={s.seeAllBtn}><Text style={s.seeAllText}>See all jobs</Text><Feather name="arrow-right" size={13} color={ORANGE} /></TouchableOpacity>{visibleJobs.length === 0 ? <Empty icon="briefcase" title="No new jobs right now" sub="New verified local jobs will appear here." /> : visibleJobs.slice(0, 8).map((job) => <JobCard key={job.id} job={job} applied={!!jobsUser && hasApplied(job.id, jobsUser.id)} near={nearbyJobs.some((j) => j.id === job.id)} onOpen={() => router.push(`/jobs/detail/${job.id}` as any)} onApply={() => handleApply(job)} />)}</View>
        </>}
      </ScrollView>
      <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} jobs={activeJobs} />
    </View>
  );
}

function Action({ icon, title, sub, onPress }: { icon: any; title: string; sub: string; onPress: () => void }) { return <TouchableOpacity style={s.actionCard} activeOpacity={0.9} onPress={onPress}><View style={s.actionIcon}><Feather name={icon} size={19} color={ORANGE} /></View><Text style={s.actionTitle}>{title}</Text><Text style={s.actionSub}>{sub}</Text></TouchableOpacity>; }

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  headerPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", marginBottom: 9 },
  headerPillText: { fontSize: 9, letterSpacing: 0.9, color: "white", fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 22, lineHeight: 28, color: "white", fontWeight: "900", fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSub: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular" },
  headerIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerDot: { position: "absolute", top: 7, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: "#FDE68A" },
  searchCard: { marginTop: 18, backgroundColor: "white", borderRadius: 18, padding: 13, flexDirection: "row", alignItems: "center", gap: 11, shadowColor: DARK, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  searchIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  searchTitle: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, searchSub: { marginTop: 2, fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 16 }, quickStats: { flexDirection: "row", gap: 9 },
  statCard: { flex: 1, minHeight: 82, borderRadius: 16, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", gap: 3, shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  statIcon: { width: 30, height: 30, borderRadius: 11, alignItems: "center", justifyContent: "center" }, statNum: { fontSize: 18, fontWeight: "900", fontFamily: "Inter_700Bold" }, statLabel: { fontSize: 9, color: "#64748B", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  actionGrid: { flexDirection: "row", gap: 9 }, actionCard: { flex: 1, backgroundColor: "white", borderRadius: 18, padding: 12, minHeight: 112, justifyContent: "space-between", borderWidth: 1, borderColor: "rgba(254,215,170,0.9)", shadowColor: DARK, shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, actionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, actionTitle: { fontSize: 12.5, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, actionSub: { fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  sectionBlock: { gap: 11 }, sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, sectionTitle: { fontSize: 14, color: "#0F172A", fontWeight: "900", fontFamily: "Inter_700Bold" }, sectionSub: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 1 }, countPill: { minWidth: 32, height: 26, borderRadius: 999, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", paddingHorizontal: 9, borderWidth: 1, borderColor: "#FED7AA" }, countText: { fontSize: 11, color: ORANGE, fontFamily: "Inter_700Bold" }, seeAllBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, seeAllText: { fontSize: 11, color: ORANGE, fontFamily: "Inter_700Bold" },
  jobCard: { backgroundColor: "white", borderRadius: 18, padding: 13, gap: 11, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: DARK, shadowOpacity: 0.055, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, jobTop: { flexDirection: "row", alignItems: "center", gap: 11 }, jobIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, jobTitle: { fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, jobCompany: { marginTop: 2, fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" }, nearPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, nearText: { fontSize: 9.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, meta: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F8FAFC" }, metaText: { fontSize: 10.5, color: "#64748B", fontFamily: "Inter_500Medium" }, typeMeta: { backgroundColor: "#FFF7ED" }, typeText: { fontSize: 10.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  jobBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, salary: { fontSize: 14, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" }, applicants: { marginTop: 1, fontSize: 10.5, color: "#94A3B8", fontFamily: "Inter_400Regular" }, applyBtn: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9, backgroundColor: ORANGE }, applyText: { fontSize: 11.5, color: "white", fontFamily: "Inter_700Bold" }, appliedBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, appliedText: { fontSize: 11.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  emptyBox: { backgroundColor: "white", borderRadius: 18, padding: 24, alignItems: "center", gap: 7, borderWidth: 1, borderColor: "rgba(226,232,240,0.92)", shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, emptyTitle: { fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900", textAlign: "center" }, emptySub: { fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
  employerWrap: { gap: 14 }, employerHero: { backgroundColor: "white", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#FED7AA", shadowColor: DARK, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, sectionTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }, eyebrow: { fontSize: 9, color: ORANGE, fontFamily: "Inter_700Bold", letterSpacing: 0.8, marginBottom: 4 }, bigTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, muted: { marginTop: 3, fontSize: 11, color: "#64748B", lineHeight: 16, fontFamily: "Inter_400Regular", maxWidth: 240 }, heroIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" }, heroStats: { marginTop: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF7ED", borderRadius: 16, padding: 12 }, heroStat: { flex: 1, alignItems: "center" }, heroValue: { fontSize: 21, color: ORANGE, fontFamily: "Inter_700Bold", fontWeight: "900" }, heroLabel: { marginTop: 2, fontSize: 9.5, color: "#64748B", fontFamily: "Inter_600SemiBold" }, heroDivider: { width: 1, height: 34, backgroundColor: "#FED7AA" },
  postJobButton: { borderRadius: 20, overflow: "hidden", shadowColor: DARK, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, postJobGrad: { padding: 15, flexDirection: "row", alignItems: "center", gap: 12 }, postJobIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "white", alignItems: "center", justifyContent: "center" }, postTitle: { fontSize: 14, color: "white", fontFamily: "Inter_700Bold", fontWeight: "900" }, postSub: { marginTop: 1, fontSize: 10.5, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular" }, statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  employerJobCard: { backgroundColor: "white", borderRadius: 18, padding: 13, gap: 12, borderWidth: 1, borderColor: "rgba(226,232,240,0.95)", shadowColor: "#0F172A", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, performanceRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 16, paddingVertical: 10, alignItems: "center" }, perfItem: { flex: 1, alignItems: "center" }, perfValue: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, perfLabel: { marginTop: 1, fontSize: 9.5, color: "#64748B", fontFamily: "Inter_500Medium" }, perfLine: { width: 1, height: 30, backgroundColor: "#E2E8F0" }, employerActions: { flexDirection: "row", gap: 9 }, openJobBtn: { flex: 1, minHeight: 42, borderRadius: 15, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, openJobText: { fontSize: 11.5, color: ORANGE, fontFamily: "Inter_700Bold" }, deleteBtn: { width: 44, minHeight: 42, borderRadius: 15, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "flex-end" }, sheet: { maxHeight: "78%", backgroundColor: "#F8FAFC", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 18 }, sheetHandle: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, backgroundColor: "#CBD5E1", marginBottom: 16 }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, sheetTitle: { fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold", fontWeight: "900" }, sheetSub: { marginTop: 2, fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" }, sheetClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: "white", alignItems: "center", justifyContent: "center" }, notificationItem: { backgroundColor: "white", borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" }, notificationIcon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" }, notificationTitle: { fontSize: 12.5, color: "#0F172A", fontFamily: "Inter_700Bold" }, notificationSub: { marginTop: 2, fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular" }, notificationTime: { fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_600SemiBold" },
});
