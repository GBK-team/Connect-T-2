import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useJobs } from "@/context/JobsContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 6 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{title}</Text>
      {sub && <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{sub}</Text>}
    </View>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string | number; color: string; bg: string }) {
  const cardWidth = (width - 48) / 4;
  return (
    <View style={{ width: cardWidth, backgroundColor: "white", borderRadius: 14, padding: 10, margin: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, alignItems: "center" }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center" }}>{label}</Text>
    </View>
  );
}

const JOB_CATEGORIES: Record<string, string> = {
  manufacturing: "Manufacturing",
  it: "IT / Tech",
  retail: "Retail",
  healthcare: "Healthcare",
  construction: "Construction",
  transport: "Transport",
  education: "Education",
  security: "Security",
  other: "Other",
};

export default function JobsAdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { jobs, deleteJob, toggleJobActive } = useJobs();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "employers" | "analytics">("overview");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [totalCitizens, setTotalCitizens] = useState<number>(0);

  React.useEffect(() => {
    AsyncStorage.getItem("janseva_users").then((raw) => {
      if (raw) {
        try {
          const users = JSON.parse(raw);
          setTotalCitizens(users.filter((u: any) => u.role === "citizen").length);
        } catch {}
      }
    });
  }, []);

  const activeJobs = jobs.filter((j) => j.active);
  const expiredJobs = jobs.filter((j) => !j.active);
  const totalApplications = jobs.reduce((sum, j) => sum + (j.applicants?.length || 0), 0);
  const totalHired = jobs.reduce((sum, j) => sum + (j.hired?.length || 0), 0);
  const totalEmployers = [...new Set(jobs.map((j) => j.employerId))].length;
  const totalSeekers = [...new Set(jobs.flatMap((j) => j.applicants || []))].length;

  const categoryBreakdown = Object.entries(
    jobs.reduce((acc: Record<string, number>, j) => {
      acc[j.category] = (acc[j.category] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const employerBreakdown = Object.entries(
    jobs.reduce((acc: Record<string, any>, j) => {
      if (!acc[j.employerId]) {
        acc[j.employerId] = {
          name: j.employerName,
          company: j.company,
          jobs: 0,
          applications: 0,
          hired: 0,
        };
      }
      acc[j.employerId].jobs++;
      acc[j.employerId].applications += j.applicants?.length || 0;
      acc[j.employerId].hired += j.hired?.length || 0;
      return acc;
    }, {})
  )
    .map(([id, data]) => ({ id, ...data as any }))
    .sort((a, b) => b.jobs - a.jobs);

  const placementRate = totalApplications > 0 ? Math.round((totalHired / totalApplications) * 100) : 0;

  const topHiredCategories = Object.entries(
    jobs.reduce((acc: Record<string, number>, j) => {
      acc[j.category] = (acc[j.category] || 0) + (j.hired?.length || 0);
      return acc;
    }, {})
  )
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 6 }}>
              <Feather name="briefcase" size={10} color="#6EE7B7" />
              <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: "#6EE7B7", marginLeft: 4, letterSpacing: 1.5 }}>JOB PORTAL CONTROL</Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>Job Portal Admin</Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {jobs.length} total posts · {totalEmployers} employers
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/super-admin/settings")}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[
            { label: "Total Jobs", value: jobs.length, color: "#93C5FD" },
            { label: "Active", value: activeJobs.length, color: "#6EE7B7" },
            { label: "Applications", value: totalApplications, color: "#FDE68A" },
            { label: "Hired", value: totalHired, color: "#C4B5FD" },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2, textAlign: "center" }}>{s.label}</Text>
              {i < 3 && <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />}
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flexDirection: "row", backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
        {(["overview", "analytics", "employers"] as const).map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: activeTab === tab ? "#16A34A" : "#F1F5F9", alignItems: "center" }} activeOpacity={0.8}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: activeTab === tab ? "white" : "#64748B", textTransform: "capitalize" }}>
              {tab === "overview" ? "Overview" : tab === "analytics" ? "Analytics" : "Employers"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: "#F0F4F8" }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {activeTab === "overview" && (
          <>
            <SectionHeader title="Job Portal Overview" sub="All job post statistics" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
              <StatCard icon="briefcase" label="Total Job Posts" value={jobs.length} color="#3B82F6" bg="#DBEAFE" />
              <StatCard icon="check-circle" label="Active Jobs" value={activeJobs.length} color="#059669" bg="#D1FAE5" />
              <StatCard icon="x-circle" label="Expired/Paused" value={expiredJobs.length} color="#DC2626" bg="#FEE2E2" />
              <StatCard icon="users" label="Total Employers" value={totalEmployers} color="#D97706" bg="#FEF3C7" />
              <StatCard icon="user" label="Job Seekers" value={totalSeekers} color="#7C3AED" bg="#EDE9FE" />
              <StatCard icon="send" label="Applications" value={totalApplications} color="#0EA5E9" bg="#E0F2FE" />
              <StatCard icon="award" label="People Hired" value={totalHired} color="#059669" bg="#D1FAE5" />
              <StatCard icon="percent" label="Placement Rate" value={`${placementRate}%`} color="#D97706" bg="#FEF3C7" />
            </View>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title="Citizen Management" sub="Total registered users on the platform" />
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, alignItems: "center" }}>
                    <Feather name="users" size={22} color="#3B82F6" />
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginTop: 8 }}>{totalCitizens}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3B82F6" }}>Registered Citizens</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#D1FAE5", borderRadius: 12, padding: 14, alignItems: "center" }}>
                    <Feather name="user-check" size={22} color="#059669" />
                    <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#065F46", marginTop: 8 }}>{totalSeekers}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#059669" }}>Active Job Seekers</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center" }}>
                  <Feather name="info" size={14} color="#64748B" />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B", marginLeft: 8, flex: 1 }}>
                    Citizens are users who signed up via the civic portal. Job seekers are citizens who applied to at least one job.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <SectionHeader title="All Job Posts" sub="Manage and moderate job listings" />
              {jobs.length === 0 ? (
                <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <Feather name="briefcase" size={32} color="#CBD5E1" />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 12 }}>No job posts yet</Text>
                </View>
              ) : (
                jobs.map((job, idx) => (
                  <TouchableOpacity key={job.id} onPress={() => setSelectedJob(job)} style={{ backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }} activeOpacity={0.85}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: job.active ? "#DCFCE7" : "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Feather name="briefcase" size={18} color={job.active ? "#16A34A" : "#94A3B8"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{job.title}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{job.company} · {job.location}</Text>
                      </View>
                      <View style={{ backgroundColor: job.active ? "#D1FAE5" : "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: job.active ? "#059669" : "#94A3B8" }}>{job.active ? "Active" : "Paused"}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      {[
                        { label: "Applied", value: job.applicants?.length || 0, color: "#3B82F6", bg: "#DBEAFE" },
                        { label: "Shortlisted", value: job.shortlisted?.length || 0, color: "#D97706", bg: "#FEF3C7" },
                        { label: "Hired", value: job.hired?.length || 0, color: "#059669", bg: "#D1FAE5" },
                        { label: "Openings", value: job.openings, color: "#7C3AED", bg: "#EDE9FE" },
                      ].map((s) => (
                        <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                          <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}

        {activeTab === "analytics" && (
          <>
            <SectionHeader title="Job Success Analytics" sub="Hiring outcomes and placement data" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: "#DCFCE7", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="award" size={22} color="#16A34A" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#166534", marginTop: 6 }}>{totalHired}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#16A34A", textAlign: "center" }}>People Got Jobs</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "#DBEAFE", borderRadius: 12, padding: 14, alignItems: "center" }}>
                  <Feather name="percent" size={22} color="#3B82F6" />
                  <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: "#1D4ED8", marginTop: 6 }}>{placementRate}%</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3B82F6", textAlign: "center" }}>Placement Rate</Text>
                </View>
              </View>
              <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 }}>
                <View style={{ height: 6, width: `${placementRate}%`, backgroundColor: "#16A34A", borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 6, textAlign: "right" }}>
                {totalHired} hired from {totalApplications} applications
              </Text>
            </View>

            <SectionHeader title="Most Hired Categories" sub="Top job categories by placements" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {topHiredCategories.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No hiring data yet</Text>
              ) : (
                topHiredCategories.map(([cat, count], idx) => (
                  <View key={cat} style={{ paddingVertical: 10, borderBottomWidth: idx < topHiredCategories.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>#{idx + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{JOB_CATEGORIES[cat] || cat}</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#059669" }}>{count} hired</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <SectionHeader title="Category Breakdown" sub="Job posts by category" />
            <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
              {categoryBreakdown.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 13 }}>No jobs posted yet</Text>
              ) : (
                categoryBreakdown.map(([cat, count]) => {
                  const pct = jobs.length > 0 ? (count / jobs.length) * 100 : 0;
                  return (
                    <View key={cat} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{JOB_CATEGORIES[cat] || cat}</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{count}</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 }}>
                        <View style={{ height: 6, width: `${pct}%`, backgroundColor: "#16A34A", borderRadius: 3 }} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {activeTab === "employers" && (
          <>
            <SectionHeader title="Employer Management" sub="Verify, manage and monitor employers" />
            {employerBreakdown.length === 0 ? (
              <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                <Feather name="users" size={32} color="#CBD5E1" />
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: "#94A3B8", marginTop: 12 }}>No employers yet</Text>
              </View>
            ) : (
              employerBreakdown.map((employer, idx) => (
                <View key={employer.id} style={{ backgroundColor: "white", borderRadius: 14, padding: 16, marginBottom: 8, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#3B82F6" }}>{employer.company?.charAt(0)?.toUpperCase() || "E"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#0F172A" }}>{employer.company}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748B" }}>{employer.name}</Text>
                    </View>
                    <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#059669" }}>Verified</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[
                      { label: "Jobs", value: employer.jobs, color: "#3B82F6", bg: "#DBEAFE" },
                      { label: "Applications", value: employer.applications, color: "#D97706", bg: "#FEF3C7" },
                      { label: "Hired", value: employer.hired, color: "#059669", bg: "#D1FAE5" },
                    ].map((s) => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 8, padding: 8, alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: s.color + "AA" }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center" }}
                      activeOpacity={0.8}
                      onPress={() => {
                        const employerJobs = jobs.filter((j) => j.employerId === employer.id);
                        employerJobs.forEach((j) => deleteJob(j.id));
                      }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#DC2626" }}>Remove All Jobs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEF3C7", alignItems: "center" }}
                      activeOpacity={0.8}
                      onPress={() => {
                        const employerJobs = jobs.filter((j) => j.employerId === employer.id);
                        employerJobs.forEach((j) => toggleJobActive(j.id));
                      }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#D97706" }}>Toggle All Active</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedJob} transparent animationType="slide" onRequestClose={() => setSelectedJob(null)}>
        {selectedJob && (
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
              <View style={{ width: 36, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 4 }}>{selectedJob.title}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", marginBottom: 16 }}>{selectedJob.company} · {selectedJob.location}</Text>
              {[
                { label: "Employer", value: selectedJob.employerName },
                { label: "Category", value: JOB_CATEGORIES[selectedJob.category] || selectedJob.category },
                { label: "Type", value: selectedJob.type },
                { label: "Salary", value: selectedJob.salary },
                { label: "Openings", value: String(selectedJob.openings) },
                { label: "Status", value: selectedJob.active ? "Active" : "Paused" },
              ].map((item, idx, arr) => (
                <View key={item.label} style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <Text style={{ width: 90, fontSize: 12, fontFamily: "Inter_400Regular", color: "#94A3B8" }}>{item.label}</Text>
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{item.value}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#FEE2E2", alignItems: "center" }}
                  activeOpacity={0.8}
                  onPress={() => { deleteJob(selectedJob.id); setSelectedJob(null); }}
                >
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#DC2626" }}>Remove Job</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: selectedJob.active ? "#FEF3C7" : "#DCFCE7", alignItems: "center" }}
                  activeOpacity={0.8}
                  onPress={() => { toggleJobActive(selectedJob.id); setSelectedJob(null); }}
                >
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: selectedJob.active ? "#D97706" : "#16A34A" }}>
                    {selectedJob.active ? "Pause Job" : "Activate Job"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setSelectedJob(null)} style={{ marginTop: 10, paddingVertical: 13, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center" }} activeOpacity={0.8}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#64748B" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}
