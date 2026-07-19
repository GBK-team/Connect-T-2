import { AppScrollView } from "@/components/AppScrollView";
import React from "react";
import { Alert, Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert, useAlerts } from "@/context/AlertContext";

const GREEN = "#16A34A";
const DARK_GREEN = "#166534";
const BG = "#F0F4F8";

function typeTheme(alert?: AppAlert) {
  if (alert?.type === "emergency") return { label: "Emergency Alert", icon: "alert-triangle" as const, color: "#DC2626", bg: "#FEE2E2" };
  if (alert?.type === "alert") return { label: "Alert", icon: "alert-triangle" as const, color: "#DC2626", bg: "#FEE2E2" };
  return { label: "News / Announcement", icon: "radio" as const, color: GREEN, bg: "#DCFCE7" };
}

function formatDate(value?: string) {
  if (!value) return "Not added";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={16} color={GREEN} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: "#94A3B8", fontFamily: "Inter_600SemiBold" }}>{label}</Text>
        <Text style={{ fontSize: 14, color: "#0F172A", fontFamily: "Inter_700Bold", marginTop: 2 }}>{value || "Not added"}</Text>
      </View>
    </View>
  );
}

export default function AlertDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 54 : insets.top;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { alerts, removeAlert } = useAlerts();

  const alert = alerts.find((item) => String(item.id) === String(id));
  const theme = typeTheme(alert);

  const confirmDelete = () => {
    if (!alert) return;
    Alert.alert(
      "Delete broadcast?",
      `Are you sure you want to delete "${alert.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeAlert(alert.id);
            router.back();
          },
        },
      ],
    );
  };

  if (!alert) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        <LinearGradient colors={["#052E16", DARK_GREEN, GREEN]} style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 24 }}>Broadcast not found</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LinearGradient
        colors={["#052E16", DARK_GREEN, GREEN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} activeOpacity={0.85}>
            <Feather name="chevron-left" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 14, fontFamily: "Inter_700Bold" }}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={confirmDelete} activeOpacity={0.85} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Feather name="trash-2" size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Feather name={theme.icon} size={13} color={theme.color} />
            <Text style={{ color: theme.color, fontSize: 11, fontFamily: "Inter_700Bold" }}>{theme.label}</Text>
          </View>

          <Text style={{ color: "white", fontSize: 25, fontFamily: "Inter_700Bold", marginTop: 12 }} numberOfLines={3}>
            {alert.title}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8 }}>
            {alert.ward || "All Wards"} · {formatDate(alert.createdAt)}
          </Text>
        </View>
      </LinearGradient>

      <AppScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: "white", borderRadius: 18, padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <Text style={{ fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 10 }}>Message</Text>
          <Text style={{ fontSize: 14, color: "#334155", fontFamily: "Inter_400Regular", lineHeight: 22 }}>
            {alert.body}
          </Text>
        </View>

        {alert.media?.uri ? (
          <View style={{ backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text style={{ fontSize: 15, color: "#0F172A", fontFamily: "Inter_700Bold", marginBottom: 10 }}>Attachment</Text>
            {alert.media.type === "image" ? (
              <Image source={{ uri: alert.media.uri }} style={{ width: "100%", height: 190, borderRadius: 14, backgroundColor: "#F1F5F9" }} />
            ) : (
              <View style={{ height: 160, borderRadius: 14, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" }}>
                <Feather name="play-circle" size={42} color={GREEN} />
                <Text style={{ marginTop: 8, color: "#166534", fontFamily: "Inter_700Bold" }}>Video attachment</Text>
              </View>
            )}
          </View>
        ) : null}

        <View style={{ backgroundColor: "white", borderRadius: 18, paddingHorizontal: 16, paddingTop: 4, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 }}>
          <DetailRow icon="tag" label="Category" value={alert.category || theme.label} />
          <DetailRow icon="activity" label="Priority" value={alert.priority || "normal"} />
          <DetailRow icon="users" label="Audience" value={alert.targetAudience || "All citizens"} />
          <DetailRow icon="map-pin" label="Area / Ward" value={alert.location || alert.ward || "All Wards"} />
          <DetailRow icon="clock" label="Valid Until" value={alert.validUntil || formatDate(alert.expiresAt)} />
          <DetailRow icon="user" label="Posted By" value={alert.postedBy} />
        </View>
      </AppScrollView>
    </View>
  );
}
