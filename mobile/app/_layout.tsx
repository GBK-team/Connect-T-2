import "../global.css";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  router as staticRouter,
  useRouter,
  useSegments,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppSplash, type SplashPortal } from "@/components/AppSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertProvider } from "@/context/AlertContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function isSuperAdminUser(user: any) {
  return user?.role === "super_admin" || user?.isSuperAdmin === true;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const currentTab = root === "(tabs)" ? segments[1] : undefined;

    const inLogin = root === "login";
    const inTabs = root === "(tabs)";
    const inJobs = root === "jobs";
    const inPortalSelect = root === "portal-select";
    const inSuperAdmin = root === "super-admin";
    const inNagarsevakAuth = root === "nagarsevak";

    if (inJobs || inPortalSelect) return;

    if (inNagarsevakAuth) {
      if (user && isSuperAdminUser(user)) {
        router.replace("/super-admin" as any);
      } else if (user?.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      }
      return;
    }

    if (inSuperAdmin) {
      if (!user) {
        router.replace("/login");
        return;
      }

      if (!isSuperAdminUser(user)) {
        if (user.role === "nagarsevak") {
          router.replace("/(tabs)/admin" as any);
        } else {
          router.replace("/(tabs)/");
        }
      }

      return;
    }

    if (!user && !inLogin) {
      router.replace("/login");
      return;
    }

    if (user && inLogin) {
      if (isSuperAdminUser(user)) {
        router.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        router.replace("/(tabs)/admin" as any);
      } else {
        router.replace("/(tabs)/");
      }
      return;
    }

    if (user && isSuperAdminUser(user) && !inSuperAdmin) {
      router.replace("/super-admin" as any);
      return;
    }

    if (
      user &&
      user.role === "nagarsevak" &&
      !isSuperAdminUser(user) &&
      inTabs &&
      currentTab !== "admin"
    ) {
      router.replace("/(tabs)/admin" as any);
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      setSplashDone(true);

      if (isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        staticRouter.replace("/(tabs)/admin" as any);
      } else {
        staticRouter.replace("/(tabs)/");
      }
    }
  }, [user, loading]);

  const handleFinish = async (portal: SplashPortal) => {
    setSplashDone(true);

    if (portal === "super_admin") {
      staticRouter.replace("/super-admin" as any);
      return;
    }

    if (portal === "nagarsevak") {
      if (user && user.role === "nagarsevak" && !isSuperAdminUser(user)) {
        staticRouter.replace("/(tabs)/admin" as any);
      } else if (user && isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else {
        staticRouter.replace("/nagarsevak/login" as any);
      }
      return;
    }

    if (user) {
      if (isSuperAdminUser(user)) {
        staticRouter.replace("/super-admin" as any);
      } else if (user.role === "nagarsevak") {
        staticRouter.replace("/(tabs)/admin" as any);
      } else {
        staticRouter.replace("/(tabs)/");
      }
    } else {
      staticRouter.replace("/login");
    }
  };

  return (
    <>
      {children}
      {!splashDone && <AppSplash onFinish={handleFinish} />}
    </>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="login"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="portal-select"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="super-admin"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="jobs"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="nagarsevak"
        options={{ headerShown: false, animation: "fade" }}
      />

      <Stack.Screen
        name="complaint/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="complaint/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="complaint/list" options={{ headerShown: false }} />

      <Stack.Screen
        name="alert/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="alert/list" options={{ headerShown: false }} />

      <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    setAssetsReady(true);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && assetsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, assetsReady]);

  if ((!fontsLoaded && !fontError) || !assetsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <AlertProvider>
                <ComplaintProvider>
                  <FeedProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <TabBarVisibilityProvider>
                        <AppShell>
                          <AuthGate>
                            <RootLayoutNav />
                          </AuthGate>
                        </AppShell>
                      </TabBarVisibilityProvider>
                    </GestureHandlerRootView>
                  </FeedProvider>
                </ComplaintProvider>
              </AlertProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
