import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
if (Platform.OS !== "web") {
  try {
    KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider;
  } catch {}
}

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSplash } from "@/components/AppSplash";
import { ComplaintProvider } from "@/context/ComplaintContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FeedProvider } from "@/context/FeedContext";
import { LanguageProvider } from "@/context/LanguageContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === "login";
    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="complaint/new"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="complaint/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="service/[id]"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <AuthProvider>
              <ComplaintProvider>
                <FeedProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    {KeyboardProvider ? (
                      <KeyboardProvider>
                        <AuthGate>
                          <RootLayoutNav />
                        </AuthGate>
                        {!splashDone && (
                          <AppSplash onFinish={() => setSplashDone(true)} />
                        )}
                      </KeyboardProvider>
                    ) : (
                      <>
                        <AuthGate>
                          <RootLayoutNav />
                        </AuthGate>
                        {!splashDone && (
                          <AppSplash onFinish={() => setSplashDone(true)} />
                        )}
                      </>
                    )}
                  </GestureHandlerRootView>
                </FeedProvider>
              </ComplaintProvider>
            </AuthProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
