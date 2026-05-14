import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useComplaints } from "@/context/ComplaintContext";
import { NAGARSEVAK_DIRECTORY } from "@/data/nagarsevaks";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  const cardWidth = (width - 48) / 4;
  return (
    <View
      style={{
        width: cardWidth,
        backgroundColor: "white",
        borderRadius: 14,
        padding: 10,
        margin: 4,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text
        style={{
          fontSize: 18,
          fontFamily: "Inter_700Bold",
          color: "#0F172A",
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 9,
          fontFamily: "Inter_400Regular",
          color: "#64748B",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 6 }}>
      <Text
        style={{
          fontSize: 15,
          fontFamily: "Inter_700Bold",
          color: "#0F172A",
        }}
      >
        {title}
      </Text>
      {sub && (
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_400Regular",
            color: "#64748B",
          }}
        >
          {sub}
        </Text>
      )}
    </View>
  );
}

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
  roads: { icon: "truck", color: "#92400E", label: "Roads" },
  water: { icon: "droplet", color: "#0369A1", label: "Water" },
  electricity: { icon: "zap", color: "#D97706", label: "Electricity" },
  garbage: { icon: "trash-2", color: "#059669", label: "Garbage" },
  drainage: { icon: "git-merge", color: "#0EA5E9", label: "Drainage" },
  streetlight: { icon: "sun", color: "#7C3AED", label: "Streetlight" },
  encroachment: { icon: "alert-triangle", color: "#DC2626", label: "Encroachment" },
  other: { icon: "more-horizontal", color: "#475569", label: "Other" },
};

export default function SuperAdminDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, logout } = useAuth();
  const { complaints } = useComplaints();
  const router = useRouter();
  const [showLogout, setShowLogout] = useState(false);

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "submitted").length;
  const inProgress = complaints.filter(
    (c) => c.status === "in_progress" || c.status === "assigned"
  ).length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const rejected = complaints.filter((c) => c.status === "rejected").length;

  const officers = NAGARSEVAK_DIRECTORY.filter((n) => n.role === "nagarsevak");
  const totalOfficers = officers.length;
  const totalWards = officers.filter((n) => n.wardCode).length;

  const wardAnalytics = Object.entries(
    complaints.reduce((acc: Record<string, any>, c) => {
      const ward = c.ward || "Unknown";
      if (!acc[ward]) acc[ward] = { total: 0, pending: 0, resolved: 0 };
      acc[ward].total++;
      if (c.status === "submitted") acc[ward].pending++;
      if (c.status === "resolved") acc[ward].resolved++;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b[1].total - a[1].total)
    .slice(0, 8);

  const categoryAnalytics = Object.entries(
    complaints.reduce((acc: Record<string, number>, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const count = complaints.filter((c) => c.createdAt.startsWith(monthKey)).length;
    return {
      month: d.toLocaleString("default", { month: "short" }),
      count,
    };
  });
  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  const resolutionRate =
    total > 0 ? Math.round((resolved / total) * 100) : 0;

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "just now";
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <LinearGradient
        colors={["#052E16", "#166534", "#16A34A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
                alignSelf: "flex-start",
                marginBottom: 6,
              }}
            >
              <Feather name="shield" size={10} color="#6EE7B7" />
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Inter_700Bold",
                  color: "#6EE7B7",
                  marginLeft: 4,
                  letterSpacing: 1.5,
                }}
              >
                SUPER ADMIN
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: "white" }}>
              Tejashree's Dashboard
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              All Wards · AMC Ambernath · Live
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/super-admin/settings")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 14 }}>
          {[
            { label: "Total", value: total, color: "#93C5FD" },
            { label: "Pending", value: pending, color: "#FDE68A" },
            { label: "Active", value: inProgress, color: "#C4B5FD" },
            { label: "Resolved", value: resolved, color: "#6EE7B7" },
          ].map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{s.label}</Text>
              {i < 3 && (
                <View style={{ position: "absolute", right: 0, top: "10%", height: "80%", width: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
              )}
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: "#F0F4F8" }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Complaint Control Center" sub="Real-time overview across all wards" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
          <StatCard icon="file-text" label="Total Complaints" value={total} color="#3B82F6" bg="#DBEAFE" />
          <StatCard icon="clock" label="Pending" value={pending} color="#D97706" bg="#FEF3C7" />
          <StatCard icon="tool" label="In Progress" value={inProgress} color="#7C3AED" bg="#EDE9FE" />
          <StatCard icon="check-circle" label="Resolved" value={resolved} color="#059669" bg="#D1FAE5" />
          <StatCard icon="x-circle" label="Rejected" value={rejected} color="#DC2626" bg="#FEE2E2" />
          <StatCard icon="percent" label="Resolution %" value={`${resolutionRate}%`} color="#0EA5E9" bg="#E0F2FE" />
          <StatCard icon="users" label="Officers" value={totalOfficers} color="#8B5CF6" bg="#EDE9FE" />
          <StatCard icon="map-pin" label="Wards Active" value={totalWards} color="#16A34A" bg="#DCFCE7" />
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Monthly Trends" sub="Complaint volume over 6 months" />
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, justifyContent: "space-around" }}>
              {monthlyData.map((m) => (
                <View key={m.month} style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: "#16A34A", marginBottom: 4 }}>
                    {m.count > 0 ? m.count : ""}
                  </Text>
                  <View
                    style={{
                      width: 28,
                      height: Math.max(8, (m.count / maxMonthly) * 80),
                      backgroundColor: "#16A34A",
                      borderRadius: 6,
                      opacity: 0.85,
                    }}
                  />
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#94A3B8", marginTop: 6 }}>
                    {m.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Category Breakdown" sub="Complaints by type" />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {categoryAnalytics.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 }}>
                No complaints yet
              </Text>
            ) : (
              categoryAnalytics.map(([cat, count]) => {
                const cfg = categoryConfig[cat] || categoryConfig.other;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <View key={cat} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cfg.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#334155" }}>{cfg.label}</Text>
                      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: cfg.color }}>{count}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginLeft: 38 }}>
                      <View style={{ height: 6, width: `${pct}%`, backgroundColor: cfg.color, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Ward-wise Monitoring" sub="Top wards by complaint load" />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {wardAnalytics.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular" }}>
                No ward data yet
              </Text>
            ) : (
              wardAnalytics.map(([ward, stats]: any, idx) => (
                <View key={ward} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: idx < wardAnalytics.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }}>{ward}</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#D97706" }}>
                        {stats.pending} pending
                      </Text>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#059669" }}>
                        {stats.resolved} resolved
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#334155" }}>{stats.total}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionHeader title="Recent Complaints" sub="Latest 5 across all wards" />
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
            {recentComplaints.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular" }}>
                No complaints yet
              </Text>
            ) : (
              recentComplaints.map((c, idx) => {
                const cat = categoryConfig[c.category] || categoryConfig.other;
                const statusColor = c.status === "resolved" ? "#059669" : c.status === "submitted" ? "#D97706" : c.status === "rejected" ? "#DC2626" : "#7C3AED";
                const statusBg = c.status === "resolved" ? "#D1FAE5" : c.status === "submitted" ? "#FEF3C7" : c.status === "rejected" ? "#FEE2E2" : "#EDE9FE";
                return (
                  <View key={c.id} style={{ paddingVertical: 10, borderBottomWidth: idx < recentComplaints.length - 1 ? 1 : 0, borderBottomColor: "#F1F5F9" }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: cat.color + "18", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Feather name={cat.icon as any} size={13} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0F172A" }} numberOfLines={1}>{c.title}</Text>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "#64748B" }}>{c.ward} · {timeAgo(c.createdAt)}</Text>
                      </View>
                      <View style={{ backgroundColor: statusBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: statusColor, textTransform: "capitalize" }}>
                          {c.status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {showLogout && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ backgroundColor: "white", borderRadius: 24, padding: 28, margin: 32, alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Feather name="log-out" size={26} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: "#0F172A", marginBottom: 8 }}>Sign Out</Text>
            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#64748B", textAlign: "center", marginBottom: 24 }}>
              Are you sure you want to sign out of the Super Admin panel?
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowLogout(false)}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#F1F5F9", alignItems: "center" }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#64748B" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => { setShowLogout(false); await logout(); router.replace("/login"); }}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#DC2626", alignItems: "center" }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "white" }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
