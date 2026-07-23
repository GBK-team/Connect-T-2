import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { alertVisibleForWard, AppAlert, useAlerts } from "@/context/AlertContext";
import { useAuth } from "@/context/AuthContext";
import { getUserErrorMessage } from "@/lib/api";

const GREEN = "#16A34A";
const BG = "#EBEFFC";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function typeConfig(item: AppAlert) {
  if (item.type === "emergency") return { label: "Emergency", color: "#B91C1C", bg: "#FEE2E2", icon: "alert-octagon" as const };
  if (item.type === "alert") return { label: "Alert", color: "#DC2626", bg: "#FEF2F2", icon: "alert-triangle" as const };
  return { label: "News", color: "#166534", bg: "#DCFCE7", icon: "radio" as const };
}

function AlertCard({ item, canDelete, onDelete }: { item: AppAlert; canDelete: boolean; onDelete: () => void }) {
  const router = useRouter();
  const config = typeConfig(item);
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.86} onPress={() => router.push(`/alert/${item.id}` as any)}>
      {item.media?.type === "image" ? <Image source={{ uri: item.media.uri }} style={s.image} /> : (
        <View style={[s.iconBox, { backgroundColor: config.bg }]}><Feather name={item.media?.type === "video" ? "play-circle" : config.icon} size={23} color={config.color} /></View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.topRow}>
          <View style={[s.typePill, { backgroundColor: config.bg }]}><Text style={[s.typeText, { color: config.color }]}>{config.label}</Text></View>
          <Text style={s.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        <Text style={s.body} numberOfLines={3}>{item.body}</Text>
        <View style={s.metaRow}>
          <View style={s.meta}><Feather name="user" size={10} color="#64748B" /><Text style={s.metaText} numberOfLines={1}>{item.postedBy}</Text></View>
          {(item.ward || item.location) ? <View style={s.meta}><Feather name="map-pin" size={10} color="#64748B" /><Text style={s.metaText} numberOfLines={1}>{item.ward || item.location}</Text></View> : <View style={s.meta}><Feather name="users" size={10} color="#64748B" /><Text style={s.metaText}>All citizens</Text></View>}
        </View>
      </View>
      {canDelete ? <TouchableOpacity style={s.deleteButton} onPress={(event) => { event.stopPropagation(); onDelete(); }}><Feather name="trash-2" size={15} color="#DC2626" /></TouchableOpacity> : <Feather name="chevron-right" size={17} color="#CBD5E1" />}
    </TouchableOpacity>
  );
}

export default function AlertListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { alerts: allAlerts, loading, error, refreshAlerts, removeAlert } = useAlerts();
  const canPublish = user?.role === "nagarsevak" || user?.role === "super_admin" || !!user?.isSuperAdmin;
  const isSuperAdmin = user?.role === "super_admin" || !!user?.isSuperAdmin;

  useFocusEffect(useCallback(() => {
    void refreshAlerts().catch(() => undefined);
  }, [refreshAlerts]));

  const alerts = useMemo(() => {
    if (!user) return [];
    if (isSuperAdmin) return allAlerts;
    if (user.role === "nagarsevak") {
      return allAlerts.filter((item) => String(item.postedById || "") === String(user.id));
    }
    return allAlerts.filter((item) => alertVisibleForWard(item, user.ward));
  }, [allAlerts, isSuperAdmin, user]);

  const counts = useMemo(() => ({
    alerts: alerts.filter((item) => item.type === "alert" || item.type === "emergency").length,
    news: alerts.filter((item) => item.type === "news").length,
  }), [alerts]);

  const confirmDelete = (item: AppAlert) => Alert.alert("Remove post?", `Remove “${item.title}”? Citizens will no longer see it.`, [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => void removeAlert(item.id).catch((requestError) => Alert.alert("Could not remove", getUserErrorMessage(requestError))) },
  ]);

  return (
    <View style={s.root}>
      <LinearGradient colors={["#052E16", "#166534", GREEN]} style={[s.header, { paddingTop: (Platform.OS === "web" ? 54 : insets.top) + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)" as any)} style={s.back}><Feather name="chevron-left" size={20} color="white" /><Text style={s.backText}>Back</Text></TouchableOpacity>
          {canPublish ? <TouchableOpacity onPress={() => router.push("/alert/new" as any)} style={s.post}><Feather name="plus" size={15} color="#166534" /><Text style={s.postText}>Post</Text></TouchableOpacity> : null}
        </View>
        <Text style={s.headerTitle}>Alerts & News</Text>
        <Text style={s.headerSub}>{canPublish ? "Manage broadcasts published from your account." : "Official updates published by your Nagarsevak and Super Admin."}</Text>
        <View style={s.stats}><Stat value={alerts.length} label="Total" /><Stat value={counts.alerts} label="Alerts" /><Stat value={counts.news} label="News" /></View>
      </LinearGradient>

      {error ? <TouchableOpacity style={s.errorBanner} onPress={() => void refreshAlerts().catch(() => undefined)}><Feather name="wifi-off" size={15} color="#B45309" /><Text style={s.errorText}>{error}</Text><Text style={s.retry}>Retry</Text></TouchableOpacity> : null}

      {loading && !alerts.length ? <View style={s.center}><ActivityIndicator size="large" color={GREEN} /><Text style={s.loadingText}>Loading official updates...</Text></View> : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={() => void refreshAlerts().catch(() => undefined)}
          renderItem={({ item }) => <AlertCard item={item} canDelete={isSuperAdmin || (user?.role === "nagarsevak" && String(item.postedById || "") === String(user.id))} onDelete={() => confirmDelete(item)} />}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 12) + 28 }, !alerts.length && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<View style={s.empty}><View style={s.emptyIcon}><Feather name="bell" size={30} color={GREEN} /></View><Text style={s.emptyTitle}>No active alerts or news</Text><Text style={s.emptyText}>{canPublish ? "Published updates will appear here immediately." : "New official updates for your ward will appear here automatically."}</Text>{canPublish ? <TouchableOpacity style={s.emptyAction} onPress={() => router.push("/alert/new" as any)}><Text style={s.emptyActionText}>Post Alert / News</Text></TouchableOpacity> : null}</View>}
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
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7 },
  backText: { color: "white", fontSize: 13, fontFamily: "Inter_700Bold" },
  post: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 13, backgroundColor: "white" },
  postText: { color: "#166534", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 23, color: "white", fontFamily: "Inter_700Bold" },
  headerSub: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: "rgba(255,255,255,0.76)", fontFamily: "Inter_400Regular" },
  stats: { marginTop: 14, flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)" },
  statValue: { fontSize: 18, color: "white", fontFamily: "Inter_700Bold" },
  statLabel: { marginTop: 1, fontSize: 9.5, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium" },
  errorBanner: { margin: 14, marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 7, padding: 11, borderRadius: 13, backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  errorText: { flex: 1, fontSize: 10.5, color: "#92400E", fontFamily: "Inter_500Medium" },
  retry: { color: "#B45309", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, color: "#64748B", fontSize: 11.5, fontFamily: "Inter_500Medium" },
  list: { padding: 14, gap: 10 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: "#E2E8F0" },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  image: { width: 58, height: 58, borderRadius: 15, backgroundColor: "#F8FAFC" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  typeText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  date: { fontSize: 9.5, color: "#94A3B8", fontFamily: "Inter_400Regular" },
  title: { marginTop: 6, fontSize: 14, color: "#0F172A", lineHeight: 18, fontFamily: "Inter_700Bold" },
  body: { marginTop: 4, fontSize: 11.5, lineHeight: 17, color: "#64748B", fontFamily: "Inter_400Regular" },
  metaRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  meta: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: "#F8FAFC" },
  metaText: { maxWidth: 130, fontSize: 9.3, color: "#64748B", fontFamily: "Inter_500Medium" },
  deleteButton: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
  emptyIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 11, fontSize: 16, color: "#0F172A", textAlign: "center", fontFamily: "Inter_700Bold" },
  emptyText: { marginTop: 5, fontSize: 11.5, lineHeight: 17, color: "#64748B", textAlign: "center", fontFamily: "Inter_400Regular" },
  emptyAction: { marginTop: 14, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13, backgroundColor: GREEN },
  emptyActionText: { color: "white", fontSize: 11.5, fontFamily: "Inter_700Bold" },
});
