import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleSheet, View, Text, useColorScheme, TouchableOpacity } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const isAndroid = Platform.OS === "android";

  const TAB_HEIGHT = isWeb ? 72 : isAndroid ? 64 : 80;
  const BOTTOM_PAD = isWeb ? 14 : isAndroid ? 8 : 24;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          elevation: 0,
          height: TAB_HEIGHT,
          paddingTop: 8,
          paddingBottom: BOTTOM_PAD,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="complaints"
        options={{
          title: "Complaints",
          tabBarIcon: ({ color }) => <Feather name="edit-3" size={22} color={color} />,
        }}
      />

      {/* ─── SOS — centred floating red pill ─── */}
      <Tabs.Screen
        name="emergency"
        options={{
          tabBarLabel: () => null,
          tabBarItemStyle: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          },
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: focused ? "#B91C1C" : "#DC2626",
                alignItems: "center",
                justifyContent: "center",
                marginTop: -22,
                borderWidth: 3.5,
                borderColor: "white",
                shadowColor: "#DC2626",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.45,
                shadowRadius: 12,
                elevation: 10,
                gap: 2,
              }}
            >
              <Feather name="phone-call" size={17} color="white" />
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "900",
                  color: "white",
                  letterSpacing: 1.5,
                  fontFamily: "Inter_700Bold",
                }}
              >
                SOS
              </Text>
            </View>
          ),
          tabBarActiveTintColor: "#DC2626",
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color }) => <Feather name="rss" size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />

      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
