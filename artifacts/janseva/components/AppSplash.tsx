import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions, Image, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const NDR = Platform.OS !== "web";

interface AppSplashProps {
  onFinish: () => void;
}

export function AppSplash({ onFinish }: AppSplashProps) {
  const logoScale = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(16)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1: Logo spring bounce (0–700 ms)
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 48, friction: 7, useNativeDriver: NDR }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 480, useNativeDriver: NDR }),
      ]),
      // Phase 2: Brand name + tagline slide up (700–1050 ms)
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: NDR }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: NDR }),
        Animated.timing(taglineY, { toValue: 0, duration: 300, useNativeDriver: NDR }),
      ]),
      // Phase 3: Dots stagger in (1050–1380 ms)
      Animated.stagger(100, [
        Animated.spring(dotScale1, { toValue: 1, tension: 90, friction: 6, useNativeDriver: NDR }),
        Animated.spring(dotScale2, { toValue: 1, tension: 90, friction: 6, useNativeDriver: NDR }),
        Animated.spring(dotScale3, { toValue: 1, tension: 90, friction: 6, useNativeDriver: NDR }),
      ]),
      // Phase 4: Hold (1380–1850 ms)
      Animated.delay(460),
      // Phase 5: White ripple expands from centre
      Animated.parallel([
        Animated.timing(circleScale, { toValue: 44, duration: 500, useNativeDriver: NDR }),
        Animated.timing(circleOpacity, { toValue: 1, duration: 130, useNativeDriver: NDR }),
      ]),
      // Phase 6: Fade out entire overlay
      Animated.timing(containerOpacity, { toValue: 0, duration: 200, useNativeDriver: NDR }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* ── True smooth gradient background ── */}
      <LinearGradient
        colors={["#060F24", "#0C1A3A", "#1E3A8A", "#1E40AF", "#2563EB"]}
        locations={[0, 0.18, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle arc rings */}
      <View style={[styles.ring, styles.ringOuter]} />
      <View style={[styles.ring, styles.ringInner]} />

      {/* White ripple burst on exit */}
      <Animated.View
        style={[
          styles.ripple,
          { opacity: circleOpacity, transform: [{ scale: circleScale }] },
        ]}
      />

      {/* ──── Centre content ──── */}
      <View style={styles.centre}>
        {/* Logo */}
        <Animated.View
          style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        >
          <View style={styles.logoGlow} />
          <Image
            source={require("../assets/images/logo_transparent.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand name */}
        <Animated.Text style={[styles.brand, { opacity: textOpacity }]}>
          JanSeva
        </Animated.Text>

        {/* Taglines */}
        <Animated.View
          style={[
            styles.taglineWrap,
            { opacity: taglineOpacity, transform: [{ translateY: taglineY }] },
          ]}
        >
          <Text style={styles.taglineEn}>Citizen Services Platform</Text>
          <Text style={styles.taglineHi}>नागरिकों की सेवा में</Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsRow}>
          {([dotScale1, dotScale2, dotScale3] as Animated.Value[]).map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === 1 && styles.dotCenter,
                { transform: [{ scale: dot }] },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ──── Footer ──── */}
      <Animated.View style={[styles.footer, { opacity: taglineOpacity }]}>
        <View style={styles.flagRow}>
          <View style={[styles.stripe, { backgroundColor: "#F97316" }]} />
          <View style={[styles.stripe, { backgroundColor: "rgba(255,255,255,0.75)" }]} />
          <View style={[styles.stripe, { backgroundColor: "#22C55E" }]} />
        </View>
        <Text style={styles.footerText}>Mumbai BMC  ·  JanSeva 2025</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(99,146,234,0.13)",
  },
  ringOuter: {
    width: width * 1.6,
    height: width * 1.6,
    top: -width * 0.92,
  },
  ringInner: {
    width: width * 1.15,
    height: width * 1.15,
    bottom: -width * 0.78,
  },
  ripple: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#EFF6FF",
    zIndex: 8,
  },
  centre: {
    alignItems: "center",
    zIndex: 10,
  },
  logoWrap: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#3B82F6",
    opacity: 0.13,
  },
  logoImg: {
    width: 144,
    height: 144,
  },
  brand: {
    fontSize: 48,
    fontWeight: "900",
    color: "white",
    letterSpacing: -2,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    textShadowColor: "rgba(37,99,235,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  taglineWrap: {
    alignItems: "center",
    gap: 6,
  },
  taglineEn: {
    fontSize: 14,
    color: "rgba(255,255,255,0.58)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.8,
  },
  taglineHi: {
    fontSize: 13,
    color: "rgba(255,255,255,0.32)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 56,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotCenter: {
    width: 10,
    height: 10,
    backgroundColor: "#60A5FA",
  },
  footer: {
    position: "absolute",
    bottom: 52,
    alignItems: "center",
    gap: 10,
    zIndex: 10,
  },
  flagRow: { flexDirection: "row", gap: 3 },
  stripe: { width: 28, height: 3.5, borderRadius: 2 },
  footerText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
  },
});
