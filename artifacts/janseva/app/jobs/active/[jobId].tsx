import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useJobs } from "@/context/JobsContext";

export default function ActiveJobDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ jobId?: string }>();
  const { jobs } = useJobs();
  const job = useMemo(() => jobs.find((j) => j.id === params.jobId) ?? null, [jobs, params.jobId]);
  const hired = job?.hired || [];
  const shortlisted = job?.shortlisted || [];

  if (!job) {
    return (
      <View style={s.root}>
        <LinearGradient colors={["#C2410C", "#EA580C", "#F97316"]} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={18} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Active Job</Text>
          <Text style={s.headerSub}>Job not found</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={["#C2410C", "#EA580C", "#F97316", "#FB923C"]} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{job.title}</Text>
        <Text style={s.headerSub}>{job.company} · {job.location}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={[s.summaryChip, { backgroundColor: "#FFF7ED" }]}>
              <Text style={[s.summaryNum, { color: "#C2410C" }]}>{job.openings}</Text>
              <Text style={s.summaryLabel}>Openings</Text>
            </View>
            <View style={[s.summaryChip, { backgroundColor: "#D1FAE5" }]}>
              <Text style={[s.summaryNum, { color: "#059669" }]}>{hired.length}</Text>
              <Text style={s.summaryLabel}>Hired</Text>
            </View>
            <View style={[s.summaryChip, { backgroundColor: "#EFF6FF" }]}>
              <Text style={[s.summaryNum, { color: "#1D4ED8" }]}>{shortlisted.length}</Text>
              <Text style={s.summaryLabel}>Shortlisted</Text>
            </View>
          </View>
          <Text style={s.sectionTitle}>Hired Users</Text>
          {hired.length === 0 ? (
            <View style={s.empty}>
              <Feather name="users" size={34} color="#CBD5E1" />
              <Text style={s.emptyText}>No hired users yet</Text>
            </View>
          ) : (
            hired.map((id) => (
              <View key={id} style={s.userRow}>
                <View style={s.avatar}>
                  <Feather name="user-check" size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>Applicant {id.replace(/[^0-9]/g, "") || id.slice(-4)}</Text>
                  <Text style={s.userSub}>ID: {id}</Text>
                </View>
                <View style={s.hiredPill}>
                  <Text style={s.hiredPillText}>Hired</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4, fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  summaryCard: { backgroundColor: "white", borderRadius: 18, padding: 16, gap: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryChip: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  summaryNum: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", fontFamily: "Inter_700Bold" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#D1FAE5" },
  userName: { fontSize: 14, fontWeight: "700", color: "#0F172A", fontFamily: "Inter_700Bold" },
  userSub: { fontSize: 12, color: "#64748B", fontFamily: "Inter_400Regular", marginTop: 2 },
  hiredPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#D1FAE5" },
  hiredPillText: { fontSize: 11, color: "#059669", fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: "#94A3B8", fontFamily: "Inter_400Regular" },
});