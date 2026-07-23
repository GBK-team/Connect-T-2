import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppScrollView } from "@/components/AppScrollView";
import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { categoryConfig, Job, JobApplication, useJobs } from "@/context/JobsContext";
import { getUserErrorMessage } from "@/lib/api";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";

function timeAgo(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function nearby(jobLocation: string, userLocation?: string) {
  if (!jobLocation || !userLocation) return false;
  const job = jobLocation.toLowerCase();
  return userLocation.toLowerCase().split(/[\s,/-]+/).some((part) => part.length > 3 && job.includes(part));
}

function EmptyState({ icon, title, text, action, onAction }: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIcon}><Feather name={icon} size={28} color={ORANGE} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {action && onAction ? <TouchableOpacity style={s.emptyAction} onPress={onAction}><Text style={s.emptyActionText}>{action}</Text></TouchableOpacity> : null}
    </View>
  );
}

function Notice({ visible, title, message, onClose }: { visible: boolean; title: string; message: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.noticeCard}>
          <View style={s.noticeIcon}><Feather name="info" size={24} color={ORANGE} /></View>
          <Text style={s.noticeTitle}>{title}</Text>
          <Text style={s.noticeMessage}>{message}</Text>
          <TouchableOpacity style={s.noticeButton} onPress={onClose}><Text style={s.noticeButtonText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ApplicantRow({ application, jobId }: { application: JobApplication; jobId: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={s.applicantRow} onPress={() => router.push(`/jobs/active/${jobId}?seekerId=${application.seekerId}` as any)} activeOpacity={0.84}>
      <View style={s.applicantAvatar}><Text style={s.applicantInitial}>{String(application.seekerName || "A").charAt(0).toUpperCase()}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.applicantName} numberOfLines={1}>{application.seekerName || "Applicant"}</Text>
        <Text style={s.applicantMeta} numberOfLines={1}>{application.seekerQualification || application.seekerSkills || "Profile details"}</Text>
      </View>
      <View style={s.statusPill}><Text style={s.statusText}>{application.status}</Text></View>
      <Feather name="chevron-right" size={15} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

function EmployerJobCard({ job, onToggle, onDelete }: { job: Job; onToggle: () => void; onDelete: () => void }) {
  const router = useRouter();
  const applications = job.applications || [];
  return (
    <View style={s.employerJobCard}>
      <TouchableOpacity style={s.jobTop} onPress={() => router.push(`/jobs/active/${job.id}` as any)} activeOpacity={0.84}>
        <View style={s.jobIcon}><Feather name={(categoryConfig[job.category]?.icon || "briefcase") as any} size={18} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
          <Text style={s.jobCompany} numberOfLines={1}>{job.location} · {job.salary}</Text>
        </View>
        <Switch value={job.active} onValueChange={onToggle} trackColor={{ false: "#E2E8F0", true: "#FED7AA" }} thumbColor={job.active ? ORANGE : "#94A3B8"} />
      </TouchableOpacity>
      <View style={s.performanceRow}>
        <Metric label="Applied" value={job.applicantsCount ?? job.applicants.length} />
        <Metric label="Shortlisted" value={job.shortlisted.length} accent />
        <Metric label="Hired" value={job.hired.length} />
      </View>
      {applications.length ? (
        <View style={{ gap: 7 }}>{applications.slice(0, 3).map((application) => <ApplicantRow key={application.id} application={application} jobId={job.id} />)}</View>
      ) : <Text style={s.noApplicants}>No applicants yet</Text>}
      <View style={s.jobActions}>
        <TouchableOpacity style={s.viewButton} onPress={() => router.push(`/jobs/active/${job.id}` as any)}><Feather name="users" size={14} color={ORANGE} /><Text style={s.viewButtonText}>Manage Applicants</Text></TouchableOpacity>
        <TouchableOpacity style={s.deleteButton} onPress={onDelete}><Feather name="trash-2" size={15} color="#DC2626" /></TouchableOpacity>
      </View>
    </View>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <View style={s.metric}><Text style={[s.metricValue, accent && { color: ORANGE }]}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}

function SeekerJobCard({ job, applied, isNear, onApply }: { job: Job; applied: boolean; isNear: boolean; onApply: () => void }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={s.seekerCard} onPress={() => router.push(`/jobs/detail/${job.id}` as any)} activeOpacity={0.86}>
      <View style={s.jobTop}>
        <View style={s.jobIcon}><Feather name={(categoryConfig[job.category]?.icon || "briefcase") as any} size={18} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text><Text style={s.jobCompany} numberOfLines={1}>{job.company}</Text></View>
        {isNear ? <View style={s.nearPill}><Feather name="map-pin" size={10} color={ORANGE} /><Text style={s.nearText}>Nearby</Text></View> : <Feather name="chevron-right" size={18} color="#CBD5E1" />}
      </View>
      <View style={s.chips}><View style={s.chip}><Feather name="map-pin" size={11} color="#64748B" /><Text style={s.chipText}>{job.location}</Text></View><View style={s.chip}><Feather name="clock" size={11} color="#64748B" /><Text style={s.chipText}>{timeAgo(job.createdAt)}</Text></View></View>
      <View style={s.salaryRow}>
        <View><Text style={s.salary}>{job.salary}</Text><Text style={s.salarySub}>{job.openings} opening{job.openings === 1 ? "" : "s"}</Text></View>
        {applied ? <View style={s.appliedPill}><Feather name="check" size={13} color={ORANGE} /><Text style={s.appliedText}>Applied</Text></View> : <TouchableOpacity style={s.applyButton} onPress={(event) => { event.stopPropagation(); onApply(); }}><Text style={s.applyText}>Apply</Text></TouchableOpacity>}
      </View>
    </TouchableOpacity>
  );
}

export default function JobsHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobsUser, loading: authLoading } = useJobsAuth();
  const { jobs, loading, error, refreshJobs, applyJob, hasApplied, toggleJobActive, deleteJob } = useJobs();
  const [notice, setNotice] = useState({ visible: false, title: "", message: "" });
  const isEmployer = jobsUser?.role === "employer";
  const isSeeker = jobsUser?.role === "seeker";

  useFocusEffect(useCallback(() => {
    if (jobsUser) void refreshJobs().catch(() => undefined);
  }, [jobsUser?.id, jobsUser?.role, refreshJobs]));

  const employerJobs = useMemo(() => isEmployer ? jobs.filter((job) => job.employerId === jobsUser?.id) : [], [isEmployer, jobs, jobsUser?.id]);
  const activeJobs = useMemo(() => jobs.filter((job) => job.active), [jobs]);
  const nearbyJobs = useMemo(() => isSeeker ? activeJobs.filter((job) => nearby(job.location, jobsUser?.location)) : [], [activeJobs, isSeeker, jobsUser?.location]);
  const seekerJobs = nearbyJobs.length ? nearbyJobs : activeJobs;

  const showError = (title: string, requestError: unknown, fallback: string) => setNotice({ visible: true, title, message: getUserErrorMessage(requestError, fallback) });

  const handleApply = async (job: Job) => {
    if (!jobsUser || jobsUser.role !== "seeker" || hasApplied(job.id, jobsUser.id)) return;
    try {
      await applyJob(job.id, jobsUser.id);
      setNotice({ visible: true, title: "Application sent", message: `Your application for ${job.title} has been submitted.` });
    } catch (requestError) {
      showError("Application not sent", requestError, "Please try again after some time.");
    }
  };

  const handleToggle = async (job: Job) => {
    try { await toggleJobActive(job.id); }
    catch (requestError) { showError("Status not updated", requestError, "The job status could not be changed."); }
  };

  const confirmDelete = (job: Job) => Alert.alert("Delete job?", `Delete ${job.title}? Existing application history will remain protected.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => void deleteJob(job.id).catch((requestError) => showError("Job not deleted", requestError, "Please try again.")) },
  ]);

  if (authLoading || (loading && !jobs.length)) {
    return <View style={s.loadingRoot}><ActivityIndicator size="large" color={ORANGE} /><Text style={s.loadingText}>Loading your Job Portal dashboard...</Text></View>;
  }

  if (!jobsUser) {
    return <View style={s.loadingRoot}><EmptyState icon="lock" title="Job profile required" text="Complete your Job Seeker or Employer profile to open the dashboard." action="Set Up Profile" onAction={() => router.replace("/jobs/profile-setup" as any)} /></View>;
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 66 : insets.top) + 12 }]}>
        <TopShade height={110} /><DecorativeCircles />
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}><Text style={s.kicker}>{isEmployer ? "EMPLOYER WORKSPACE" : "JOB SEEKER DASHBOARD"}</Text><Text style={s.headerTitle}>{isEmployer ? "Manage Hiring" : "Find Local Jobs"}</Text><Text style={s.headerSub}>{isEmployer ? jobsUser.company || jobsUser.name : `Welcome, ${jobsUser.name.split(" ")[0]}`}</Text></View>
          <TouchableOpacity style={s.headerButton} onPress={() => router.replace("/portal-select" as any)}><Feather name="repeat" size={18} color="white" /></TouchableOpacity>
        </View>
        {!isEmployer ? <TouchableOpacity style={s.searchBar} onPress={() => router.push("/jobs/search" as any)}><Feather name="search" size={18} color={ORANGE} /><View style={{ flex: 1 }}><Text style={s.searchTitle}>Search verified local jobs</Text><Text style={s.searchSub}>Category, location, salary and job type</Text></View><Feather name="chevron-right" size={18} color="#94A3B8" /></TouchableOpacity> : null}
      </LinearGradient>

      <AppScrollView onAppRefresh={refreshJobs} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 8) + 96 }]} showsVerticalScrollIndicator={false}>
        {error ? <TouchableOpacity style={s.errorBanner} onPress={() => void refreshJobs().catch(() => undefined)}><Feather name="alert-circle" size={16} color="#B45309" /><Text style={s.errorText}>{error}</Text><Text style={s.retryText}>Retry</Text></TouchableOpacity> : null}

        {isEmployer ? (
          <>
            <View style={s.dashboardCard}><View><Text style={s.sectionEyebrow}>HIRING OVERVIEW</Text><Text style={s.dashboardTitle}>{employerJobs.length} job post{employerJobs.length === 1 ? "" : "s"}</Text><Text style={s.dashboardSub}>{employerJobs.reduce((sum, job) => sum + (job.applicantsCount ?? job.applicants.length), 0)} total applications</Text></View><TouchableOpacity style={s.postButton} onPress={() => router.push("/jobs/(tabs)/post" as any)}><Feather name="plus" size={16} color="white" /><Text style={s.postText}>Post Job</Text></TouchableOpacity></View>
            {employerJobs.length ? employerJobs.map((job) => <EmployerJobCard key={job.id} job={job} onToggle={() => void handleToggle(job)} onDelete={() => confirmDelete(job)} />) : <EmptyState icon="briefcase" title="No jobs posted yet" text="Post your first vacancy to start receiving local applications." action="Post First Job" onAction={() => router.push("/jobs/(tabs)/post" as any)} />}
          </>
        ) : (
          <>
            <View style={s.sectionHeader}><View><Text style={s.sectionTitle}>{nearbyJobs.length ? "Jobs Near You" : "Latest Job Openings"}</Text><Text style={s.sectionSub}>{activeJobs.length} active verified jobs</Text></View><TouchableOpacity onPress={() => router.push("/jobs/search" as any)}><Text style={s.seeAll}>See all</Text></TouchableOpacity></View>
            {seekerJobs.length ? seekerJobs.slice(0, 10).map((job) => <SeekerJobCard key={job.id} job={job} applied={hasApplied(job.id, jobsUser.id)} isNear={nearbyJobs.some((nearJob) => nearJob.id === job.id)} onApply={() => void handleApply(job)} />) : <EmptyState icon="briefcase" title="No active jobs right now" text="Pull down to refresh. New verified jobs will appear here after employers publish them." action="Refresh" onAction={() => void refreshJobs().catch(() => undefined)} />}
          </>
        )}
      </AppScrollView>
      <Notice visible={notice.visible} title={notice.title} message={notice.message} onClose={() => setNotice((current) => ({ ...current, visible: false }))} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loadingRoot: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 12, color: "#64748B", fontFamily: "Inter_600SemiBold" },
  header: { paddingHorizontal: 18, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  kicker: { fontSize: 9.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_700Bold", letterSpacing: 1.1 },
  headerTitle: { marginTop: 4, fontSize: 23, color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 3, fontSize: 12, color: "rgba(255,255,255,0.78)", fontFamily: "Inter_400Regular" },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  searchBar: { marginTop: 16, backgroundColor: "white", borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  searchTitle: { fontSize: 13, color: "#0F172A", fontFamily: "Inter_700Bold" },
  searchSub: { fontSize: 10.5, color: "#94A3B8", marginTop: 2, fontFamily: "Inter_400Regular" },
  content: { padding: 15, gap: 12 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 14, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  errorText: { flex: 1, fontSize: 11, lineHeight: 16, color: "#92400E", fontFamily: "Inter_500Medium" },
  retryText: { fontSize: 11, color: "#B45309", fontFamily: "Inter_700Bold" },
  dashboardCard: { backgroundColor: "white", borderRadius: 19, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: "#FED7AA" },
  sectionEyebrow: { fontSize: 9, color: ORANGE, letterSpacing: 1, fontFamily: "Inter_700Bold" },
  dashboardTitle: { marginTop: 4, fontSize: 18, color: "#0F172A", fontFamily: "Inter_700Bold" },
  dashboardSub: { marginTop: 3, fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  postButton: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: ORANGE, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10 },
  postText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  employerJobCard: { backgroundColor: "white", borderRadius: 18, padding: 13, gap: 11, borderWidth: 1, borderColor: "#E2E8F0" },
  jobTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  jobIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA", alignItems: "center", justifyContent: "center" },
  jobTitle: { fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold" },
  jobCompany: { marginTop: 2, fontSize: 10.8, color: "#64748B", fontFamily: "Inter_400Regular" },
  performanceRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 14, paddingVertical: 9 },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold" },
  metricLabel: { marginTop: 1, fontSize: 9, color: "#64748B", fontFamily: "Inter_500Medium" },
  applicantRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 13, padding: 9, backgroundColor: "#F8FAFC" },
  applicantAvatar: { width: 33, height: 33, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7ED" },
  applicantInitial: { color: ORANGE, fontFamily: "Inter_700Bold" },
  applicantName: { fontSize: 11.5, color: "#0F172A", fontFamily: "Inter_700Bold" },
  applicantMeta: { fontSize: 9.8, color: "#64748B", marginTop: 1, fontFamily: "Inter_400Regular" },
  statusPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF7ED" },
  statusText: { fontSize: 8.5, color: ORANGE, textTransform: "capitalize", fontFamily: "Inter_700Bold" },
  noApplicants: { textAlign: "center", paddingVertical: 5, fontSize: 11, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  jobActions: { flexDirection: "row", gap: 8 },
  viewButton: { flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: "#FFF7ED" },
  viewButtonText: { fontSize: 11, color: ORANGE, fontFamily: "Inter_700Bold" },
  deleteButton: { width: 42, height: 40, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold" },
  sectionSub: { marginTop: 2, fontSize: 10.5, color: "#64748B", fontFamily: "Inter_400Regular" },
  seeAll: { fontSize: 11.5, color: ORANGE, fontFamily: "Inter_700Bold" },
  seekerCard: { backgroundColor: "white", borderRadius: 18, padding: 13, gap: 11, borderWidth: 1, borderColor: "#E2E8F0" },
  nearPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FFF7ED" },
  nearText: { fontSize: 9, color: ORANGE, fontFamily: "Inter_700Bold" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F8FAFC" },
  chipText: { fontSize: 9.8, color: "#64748B", fontFamily: "Inter_500Medium" },
  salaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  salary: { fontSize: 14, color: ORANGE, fontFamily: "Inter_700Bold" },
  salarySub: { marginTop: 1, fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  applyButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: ORANGE },
  applyText: { color: "white", fontSize: 11, fontFamily: "Inter_700Bold" },
  appliedPill: { flexDirection: "row", gap: 5, alignItems: "center", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: "#FFF7ED" },
  appliedText: { color: ORANGE, fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyCard: { width: "100%", backgroundColor: "white", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: "#FED7AA" },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 10, fontSize: 15, color: "#0F172A", textAlign: "center", fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 5, fontSize: 11, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyAction: { marginTop: 13, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: ORANGE },
  emptyActionText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.48)", alignItems: "center", justifyContent: "center", padding: 22 },
  noticeCard: { width: "100%", maxWidth: 360, borderRadius: 22, padding: 22, backgroundColor: "white", alignItems: "center" },
  noticeIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  noticeTitle: { marginTop: 12, fontSize: 17, color: "#0F172A", fontFamily: "Inter_700Bold" },
  noticeMessage: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" },
  noticeButton: { marginTop: 16, minWidth: 100, borderRadius: 13, paddingVertical: 10, alignItems: "center", backgroundColor: ORANGE },
  noticeButtonText: { color: "white", fontFamily: "Inter_700Bold" },
});
