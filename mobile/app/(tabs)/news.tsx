import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const BG = "#EBEFFC";

function timeAgo(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PostCard({ item, onDelete }: { item: AppAlert; onDelete: () => void }) {
  const router = useRouter();
  const emergency = item.type === "emergency";
  const alert = item.type === "alert" || emergency;
  const color = alert ? "#DC2626" : "#166534";
  const background = alert ? "#FEF2F2" : "#DCFCE7";
  return (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/alert/${item.id}` as any)} activeOpacity={0.86}>
      <View style={s.cardTop}><View style={[s.typePill, { backgroundColor: background }]}><Feather name={emergency ? "alert-octagon" : alert ? "alert-triangle" : "radio"} size={11} color={color} /><Text style={[s.typeText, { color }]}>{emergency ? "Emergency" : alert ? "Alert" : "News"}</Text></View><Text style={s.time}>{timeAgo(item.createdAt)}</Text></View>
      <Text style={s.title}>{item.title}</Text><Text style={s.body} numberOfLines={4}>{item.body}</Text>
      <View style={s.metaRow}><Feather name="map-pin" size={12} color="#64748B" /><Text style={s.metaText}>{item.ward || item.location || "All citizens"}</Text></View>
      <View style={s.actions}><TouchableOpacity style={s.view} onPress={() => router.push(`/alert/${item.id}` as any)}><Feather name="eye" size={13} color="#166534" /><Text style={s.viewText}>View Post</Text></TouchableOpacity><TouchableOpacity style={s.delete} onPress={(event) => { event.stopPropagation(); onDelete(); }}><Feather name="trash-2" size={13} color="#DC2626" /><Text style={s.deleteText}>Remove</Text></TouchableOpacity></View>
    </TouchableOpacity>
  );
}

export default function NagarsevakNewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { alerts, loading, error, refreshAlerts, removeAlert } = useAlerts();

  useFocusEffect(useCallback(() => {
    void refreshAlerts().catch(() => undefined);
  }, [refreshAlerts]));

  const myPosts = useMemo(() => alerts.filter((item) => String(item.postedById || "") === String(user?.id || "")), [alerts, user?.id]);
  const stats = useMemo(() => ({ news: myPosts.filter((item) => item.type === "news").length, alerts: myPosts.filter((item) => item.type !== "news").length }), [myPosts]);

  const confirmDelete = (item: AppAlert) => Alert.alert("Remove broadcast?", `Remove “${item.title}” from citizens' Alerts & News page?`, [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => void removeAlert(item.id).catch((requestError) => Alert.alert("Could not remove", getUserErrorMessage(requestError))) },
  ]);

  return (
    <View style={s.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 12 }]}>
        <View style={s.headerRow}><View style={{ flex: 1 }}><Text style={s.kicker}>NEWS & ALERTS</Text><Text style={s.headerTitle}>Ward Broadcasts</Text><Text style={s.headerSub}>Posts published here appear on citizens' Alerts & News page.</Text></View><TouchableOpacity style={s.postButton} onPress={() => router.push("/alert/new" as any)}><Feather name="plus" size={19} color="white" /></TouchableOpacity></View>
        <View style={s.stats}><Stat value={myPosts.length} label="Posts" /><Stat value={stats.news} label="News" /><Stat value={stats.alerts} label="Alerts" /></View>
      </LinearGradient>

      {error ? <TouchableOpacity style={s.errorBanner} onPress={() => void refreshAlerts().catch(() => undefined)}><Feather name="wifi-off" size={15} color="#B45309" /><Text style={s.errorText}>{error}</Text><Text style={s.retry}>Retry</Text></TouchableOpacity> : null}

      {loading && !myPosts.length ? <View style={s.center}><ActivityIndicator size="large" color={GREEN} /><Text style={s.loadingText}>Loading your broadcasts...</Text></View> : (
        <FlatList
          data={myPosts}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void refreshAlerts().catch(() => undefined)}
          renderItem={({ item }) => <PostCard item={item} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 8) + 92 }, !myPosts.length && { flexGrow: 1 }]}
          ListEmptyComponent={<View style={s.empty}><View style={s.emptyIcon}><Feather name="radio" size={30} color={GREEN} /></View><Text style={s.emptyTitle}>No broadcasts yet</Text><Text style={s.emptyText}>Post ward news or an alert and citizens in your ward will see it immediately.</Text><TouchableOpacity style={s.emptyAction} onPress={() => router.push("/alert/new" as any)}><Text style={s.emptyActionText}>Post Alert / News</Text></TouchableOpacity></View>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 }, kicker: { fontSize: 9.5, color: "#BBF7D0", letterSpacing: 1.1, fontFamily: "Inter_700Bold" }, headerTitle: { marginTop: 3, fontSize: 22, color: "white", fontFamily: "Inter_700Bold" }, headerSub: { marginTop: 3, fontSize: 11.5, lineHeight: 16, color: "rgba(255,255,255,0.74)", fontFamily: "Inter_400Regular" }, postButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.17)" },
  stats: { marginTop: 14, flexDirection: "row", gap: 8 }, stat: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)" }, statValue: { color: "white", fontSize: 18, fontFamily: "Inter_700Bold" }, statLabel: { marginTop: 1, color: "rgba(255,255,255,0.7)", fontSize: 9.5, fontFamily: "Inter_500Medium" },
  errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, padding: 11, borderRadius: 13, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" }, errorText: { flex: 1, color: "#92400E", fontSize: 10.5, fontFamily: "Inter_500Medium" }, retry: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" }, loadingText: { marginTop: 10, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  list: { padding: 14, gap: 10 }, card: { padding: 14, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" }, cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, typePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 }, typeText: { fontSize: 9.5, fontFamily: "Inter_700Bold" }, time: { fontSize: 10, color: "#94A3B8", fontFamily: "Inter_500Medium" }, title: { marginTop: 9, fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold" }, body: { marginTop: 5, fontSize: 11.5, lineHeight: 17, color: "#64748B", fontFamily: "Inter_400Regular" }, metaRow: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 5 }, metaText: { fontSize: 10, color: "#64748B", fontFamily: "Inter_600SemiBold" }, actions: { marginTop: 12, flexDirection: "row", gap: 8 }, view: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: "#F0FDF4" }, viewText: { color: "#166534", fontSize: 10.5, fontFamily: "Inter_700Bold" }, delete: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: "#FEF2F2" }, deleteText: { color: "#DC2626", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }, emptyIcon: { width: 64, height: 64, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#DCFCE7" }, emptyTitle: { marginTop: 10, fontSize: 16, color: "#0F172A", fontFamily: "Inter_700Bold" }, emptyText: { marginTop: 5, fontSize: 11.5, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" }, emptyAction: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13, backgroundColor: GREEN }, emptyActionText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
});
