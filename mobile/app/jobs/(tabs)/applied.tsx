import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DecorativeCircles from "@/components/DecorativeCircles";
import TopShade from "@/components/TopShade";
import { useJobsAuth } from "@/context/JobsAuthContext";
import { Job, typeConfig, useJobs } from "@/context/JobsContext";

const ORANGE = "#EA580C";
const DARK = "#C2410C";
const BG = "#EBEFFC";

function applicationState(job: Job, userId: string) {
  if (job.hired.includes(userId)) return { label: "Hired", color: "#059669", bg: "#D1FAE5", icon: "award" as const };
  if (job.shortlisted.includes(userId)) return { label: "Shortlisted", color: ORANGE, bg: "#FFF7ED", icon: "user-check" as const };
  if (job.rejected.includes(userId)) return { label: "Rejected", color: "#DC2626", bg: "#FEE2E2", icon: "user-x" as const };
  return { label: "Under Review", color: "#D97706", bg: "#FFFBEB", icon: "clock" as const };
}

function ApplicationCard({ job, userId }: { job: Job; userId: string }) {
  const router = useRouter();
  const state = applicationState(job, userId);
  const type = typeConfig[job.type];
  return (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/jobs/detail/${job.id}` as any)} activeOpacity={0.86}>
      <View style={s.topRow}>
        <View style={s.icon}><Feather name="briefcase" size={18} color={ORANGE} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Text style={s.title} numberOfLines={1}>{job.title}</Text><Text style={s.company} numberOfLines={1}>{job.company}</Text></View>
        <View style={[s.status, { backgroundColor: state.bg }]}><Feather name={state.icon} size={12} color={state.color} /><Text style={[s.statusText, { color: state.color }]}>{state.label}</Text></View>
      </View>
      <View style={s.metaRow}>
        <View style={s.meta}><Feather name="map-pin" size={11} color="#64748B" /><Text style={s.metaText}>{job.location}</Text></View>
        <View style={s.meta}><Feather name="clock" size={11} color="#64748B" /><Text style={s.metaText}>{type?.label || job.type}</Text></View>
        {!job.active ? <View style={[s.meta, { backgroundColor: "#F1F5F9" }]}><Text style={[s.metaText, { color: "#64748B" }]}>Job closed</Text></View> : null}
      </View>
      <View style={s.bottomRow}><View><Text style={s.salary}>{job.salary}</Text><Text style={s.small}>{job.openings} opening{job.openings === 1 ? "" : "s"}</Text></View><Feather name="chevron-right" size={18} color="#CBD5E1" /></View>
    </TouchableOpacity>
  );
}

export default function AppliedJobsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { jobsUser, loading: authLoading } = useJobsAuth();
  const { jobs, loading, error, refreshJobs } = useJobs();

  useFocusEffect(useCallback(() => {
    if (jobsUser?.role === "seeker") void refreshJobs().catch(() => undefined);
  }, [jobsUser?.id, jobsUser?.role, refreshJobs]));

  const appliedJobs = useMemo(() => {
    if (!jobsUser || jobsUser.role !== "seeker") return [];
    return jobs.filter((job) => job.applicants.includes(jobsUser.id) || (job.applications || []).some((application) => application.seekerId === jobsUser.id));
  }, [jobs, jobsUser]);

  const summary = useMemo(() => {
    const id = jobsUser?.id || "";
    return {
      total: appliedJobs.length,
      review: appliedJobs.filter((job) => !job.hired.includes(id) && !job.shortlisted.includes(id) && !job.rejected.includes(id)).length,
      positive: appliedJobs.filter((job) => job.hired.includes(id) || job.shortlisted.includes(id)).length,
    };
  }, [appliedJobs, jobsUser?.id]);

  if (authLoading || (loading && !jobs.length)) {
    return <View style={s.center}><ActivityIndicator size="large" color={ORANGE} /><Text style={s.loading}>Loading applications...</Text></View>;
  }

  if (!jobsUser || jobsUser.role !== "seeker") {
    return <View style={s.center}><Feather name="lock" size={34} color={ORANGE} /><Text style={s.emptyTitle}>Job Seeker access required</Text><Text style={s.emptyText}>Applied jobs are available only for your active Job Seeker profile.</Text><TouchableOpacity style={s.action} onPress={() => router.replace("/jobs/(tabs)" as any)}><Text style={s.actionText}>Back to Dashboard</Text></TouchableOpacity></View>;
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={[DARK, ORANGE, "#FB923C"]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <TopShade height={105} /><DecorativeCircles />
        <Text style={s.kicker}>JOB SEEKER TRACKING</Text><Text style={s.headerTitle}>Applied Jobs</Text><Text style={s.headerSub}>Track every application, including closed jobs and employer decisions.</Text>
        <View style={s.summary}><Summary value={summary.total} label="Applied" /><Summary value={summary.review} label="In Review" /><Summary value={summary.positive} label="Positive" /></View>
      </LinearGradient>
      {error ? <TouchableOpacity style={s.errorBanner} onPress={() => void refreshJobs().catch(() => undefined)}><Feather name="alert-circle" size={15} color="#B45309" /><Text style={s.errorText}>{error}</Text><Text style={s.retry}>Retry</Text></TouchableOpacity> : null}
      <FlatList
        data={appliedJobs}
        keyExtractor={(job) => job.id}
        refreshing={loading}
        onRefresh={() => void refreshJobs().catch(() => undefined)}
        renderItem={({ item }) => <ApplicationCard job={item} userId={jobsUser.id} />}
        contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 92 }, !appliedJobs.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={s.emptyWrap}><Feather name="briefcase" size={38} color={ORANGE} /><Text style={s.emptyTitle}>No applications yet</Text><Text style={s.emptyText}>Apply to a verified local job and it will appear here immediately.</Text><TouchableOpacity style={s.action} onPress={() => router.replace("/jobs/(tabs)" as any)}><Text style={s.actionText}>Browse Jobs</Text></TouchableOpacity></View>}
      />
    </View>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  return <View style={s.summaryItem}><Text style={s.summaryValue}>{value}</Text><Text style={s.summaryLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { marginTop: 10, color: "#64748B", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  header: { paddingHorizontal: 18, paddingBottom: 19, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden" },
  kicker: { fontSize: 9.5, color: "rgba(255,255,255,0.72)", letterSpacing: 1.1, fontFamily: "Inter_700Bold" },
  headerTitle: { marginTop: 4, fontSize: 23, color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular" },
  summary: { marginTop: 14, flexDirection: "row", borderRadius: 16, paddingVertical: 11, backgroundColor: "rgba(255,255,255,0.15)" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 19, color: "white", fontFamily: "Inter_700Bold" },
  summaryLabel: { marginTop: 1, fontSize: 9.5, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_500Medium" },
  errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 13, padding: 11, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  errorText: { flex: 1, fontSize: 10.5, color: "#92400E", fontFamily: "Inter_500Medium" },
  retry: { fontSize: 10.5, color: "#B45309", fontFamily: "Inter_700Bold" },
  list: { padding: 15, gap: 11 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 13, borderWidth: 1, borderColor: "#E2E8F0" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13.5, color: "#0F172A", fontFamily: "Inter_700Bold" },
  company: { marginTop: 2, fontSize: 10.8, color: "#64748B", fontFamily: "Inter_400Regular" },
  status: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  metaRow: { marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "#F8FAFC" },
  metaText: { fontSize: 9.8, color: "#64748B", fontFamily: "Inter_500Medium" },
  bottomRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  salary: { fontSize: 14, color: ORANGE, fontFamily: "Inter_700Bold" },
  small: { marginTop: 1, fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { marginTop: 10, fontSize: 16, color: "#0F172A", textAlign: "center", fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 5, fontSize: 11.5, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" },
  action: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13, backgroundColor: ORANGE },
  actionText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
});
