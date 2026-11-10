import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles, Store, Timer, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthLogo } from "../src/auth-logo";
import { authColors, authFonts, authGradients } from "../src/auth-theme";

const profiles = {
  STUDENT: {
    name: "Student",
    eyebrow: "ORDER ON CAMPUS",
    detail: "Discover food, snacks and essentials from your university.",
    tint: "#F2EEFF",
    border: "#DCD3FF",
    art: require("../assets/onboarding-student.png"),
  },
  VENDOR: {
    name: "Vendor",
    eyebrow: "SELL ON CAMPUS",
    detail: "Manage your shop, products and student orders in one place.",
    tint: "#FFF0E4",
    border: "#FFD4B7",
    art: require("../assets/onboarding-vendor.png"),
  },
} as const;

type Role = keyof typeof profiles;

export default function Welcome() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { height } = useWindowDimensions();
  const short = height < 690;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    let accessibilityChanged = false;
    function play(reducedMotion: boolean) {
      float.stopAnimation();
      float.setValue(0);
      if (!active || reducedMotion) return;
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
          Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
        ]),
      ).start();
    }
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      accessibilityChanged = true;
      play(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active && !accessibilityChanged) play(value);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
      float.stopAnimation();
    };
  }, [float]);

  function continueTo(path: "/login" | "/register") {
    if (!selectedRole) return;
    const role = selectedRole;
    setSelectedRole(null);
    setTimeout(() => router.push({ pathname: path, params: { role } }), 180);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.violetGlow} />
        <View style={styles.mangoGlow} />
      </View>

      <View style={[styles.page, short && styles.pageShort]}>
        <View style={styles.brandRow}>
          <AuthLogo width={short ? 118 : 142} />
          <View style={styles.trustPill}>
            <ShieldCheck size={14} color={authColors.success} strokeWidth={2.4} />
            <Text style={styles.trustText}>Campus-only access</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.hero,
            short && styles.heroShort,
            {
              transform: [
                { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                { scale: float.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) },
              ],
            },
          ]}
        >
          <Image source={require("../assets/campus-delivery-hero-v2.png")} resizeMode="cover" style={styles.heroImage} accessibilityLabel="Campus food and delivery illustration" />
          <LinearGradient colors={["rgba(246,249,238,0.97)", "rgba(246,249,238,0.72)", "rgba(246,249,238,0.02)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.heroShade} />
          <View style={styles.heroCopy}>
            <View style={styles.heroBadge}>
              <Sparkles size={13} color="#FF9752" />
              <Text style={styles.heroBadgeText}>Made for campus life</Text>
            </View>
            <Text style={[styles.heroTitle, short && styles.heroTitleShort]}>Cravings,{"\n"}delivered fresh.</Text>
            {!short ? <Text style={styles.heroBody}>Food, snacks and essentials from your own university.</Text> : null}
          </View>
        </Animated.View>

        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, short && styles.titleShort]}>Choose your role</Text>
          <Text style={styles.subtitle}>Select how you want to use Campus Drop.</Text>
        </View>

        <View style={[styles.cards, short && styles.cardsShort]}>
          {(Object.keys(profiles) as Role[]).map((role) => {
            const profile = profiles[role];
            return (
              <Pressable
                key={role}
                accessibilityRole="button"
                accessibilityLabel={`Continue as ${profile.name}`}
                onPress={() => setSelectedRole(role)}
                style={({ pressed }) => [
                  styles.card,
                  short && styles.cardShort,
                  { backgroundColor: profile.tint, borderColor: profile.border },
                  pressed && styles.pressed,
                ]}
              >
                <Animated.Image
                  source={profile.art}
                  accessibilityLabel={`${profile.name} illustration`}
                  resizeMode="contain"
                  style={[
                    styles.roleArt,
                    short && styles.roleArtShort,
                    {
                      transform: [{
                        translateY: float.interpolate({
                          inputRange: [0, 1],
                          outputRange: role === "STUDENT" ? [1, -5] : [-2, 4],
                        }),
                      }],
                    },
                  ]}
                />
                <View style={styles.cardCopy}>
                  <View style={styles.cardEyebrowRow}>
                    {role === "STUDENT"
                      ? <GraduationCap size={14} color={authColors.inputActive} />
                      : <Store size={14} color="#F97316" />}
                    <Text style={[styles.cardEyebrow, { color: role === "STUDENT" ? authColors.inputActive : "#C65B12" }]}>{profile.eyebrow}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{profile.name}</Text>
                  {!short ? <Text style={styles.cardBody}>{profile.detail}</Text> : null}
                </View>
                <LinearGradient colors={role === "STUDENT" ? authGradients.toggle : authGradients.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.arrowCircle}>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.6} />
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.assurance}>
          <View style={styles.assuranceItem}><Timer size={14} color={authColors.amber} /><Text style={styles.assuranceText}>Fast campus delivery</Text></View>
          <View style={styles.assuranceDot} />
          <View style={styles.assuranceItem}><ShieldCheck size={14} color={authColors.success} /><Text style={styles.assuranceText}>Secure accounts</Text></View>
        </View>
      </View>

      <Modal visible={selectedRole !== null} transparent animationType="fade" onRequestClose={() => setSelectedRole(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close account options" onPress={() => setSelectedRole(null)} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <X size={20} color={authColors.text} />
            </Pressable>

            <View style={styles.modalBanner}>
              <Image source={require("../assets/campus-delivery-hero-v2.png")} resizeMode="cover" style={styles.modalImage} />
              <LinearGradient colors={["rgba(30,27,75,0.04)", "rgba(30,27,75,0.50)"]} style={StyleSheet.absoluteFill} />
              <View style={styles.modalRoleIcon}>
                {selectedRole === "VENDOR"
                  ? <Store size={24} color="#FFFFFF" strokeWidth={2.3} />
                  : <GraduationCap size={25} color="#FFFFFF" strokeWidth={2.3} />}
              </View>
            </View>

            <Text style={styles.modalEyebrow}>{selectedRole === "VENDOR" ? "VENDOR ACCESS" : "STUDENT ACCESS"}</Text>
            <Text accessibilityRole="header" style={styles.modalTitle}>Continue as {selectedRole ? profiles[selectedRole].name : ""}</Text>
            <Text style={styles.modalBody}>
              {selectedRole === "VENDOR"
                ? "Sign in to manage your shop, or create a vendor account for your campus."
                : "Sign in to order now, or create your Campus Drop student account."}
            </Text>

            <Pressable accessibilityRole="button" onPress={() => continueTo("/login")} style={({ pressed }) => [styles.modalPrimaryOuter, pressed && styles.modalPressed]}>
              <LinearGradient colors={authGradients.cta} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.modalPrimary}>
                <Text style={styles.modalPrimaryText}>Log in</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => continueTo("/register")} style={({ pressed }) => [styles.modalSecondary, pressed && styles.pressed]}>
              <Text style={styles.modalSecondaryText}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authColors.background },
  violetGlow: { position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: "rgba(168,85,247,0.08)", top: -185, right: -145 },
  mangoGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,151,82,0.10)", bottom: -155, left: -135 },
  page: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  pageShort: { paddingTop: 4, paddingBottom: 6, gap: 7 },
  brandRow: { minHeight: 72, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  trustPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: authColors.inputBorder },
  trustText: { color: authColors.secondary, fontFamily: authFonts.bold, fontSize: 9.5 },
  hero: { height: 164, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "rgba(226,235,215,0.9)", backgroundColor: "#FFFFFF", shadowColor: authColors.text, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  heroShort: { height: 116, borderRadius: 21 },
  heroImage: { width: "100%", height: "100%" },
  heroShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroCopy: { position: "absolute", left: 16, top: 14, bottom: 12, width: "50%", justifyContent: "center" },
  heroBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, backgroundColor: "rgba(255,255,255,0.80)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 13, marginBottom: 6 },
  heroBadgeText: { color: authColors.secondary, fontFamily: authFonts.bold, fontSize: 8.5 },
  heroTitle: { color: authColors.text, fontFamily: authFonts.extra, fontSize: 25, lineHeight: 27, letterSpacing: -0.8 },
  heroTitleShort: { fontSize: 20, lineHeight: 22 },
  heroBody: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 10, lineHeight: 14, marginTop: 7, maxWidth: 190 },
  heading: { gap: 2, marginTop: 1 },
  title: { color: authColors.text, fontFamily: authFonts.extra, fontSize: 25, letterSpacing: -0.7 },
  titleShort: { fontSize: 21 },
  subtitle: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 11.5 },
  cards: { flex: 1, minHeight: 230, maxHeight: 300, gap: 10 },
  cardsShort: { minHeight: 180, gap: 7 },
  card: { flex: 1, minHeight: 108, flexDirection: "row", alignItems: "center", borderRadius: 24, borderWidth: 1, overflow: "hidden", paddingRight: 13, shadowColor: authColors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 1 },
  cardShort: { minHeight: 84, borderRadius: 20 },
  roleArt: { width: "34%", height: "112%", alignSelf: "flex-end" },
  roleArtShort: { width: "30%", height: "108%" },
  cardCopy: { flex: 1, gap: 2, paddingHorizontal: 7 },
  cardEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardEyebrow: { fontFamily: authFonts.bold, fontSize: 8.5, letterSpacing: 0.7 },
  cardTitle: { color: authColors.text, fontFamily: authFonts.extra, fontSize: 19, letterSpacing: -0.4 },
  cardBody: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  arrowCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#8B5CF6", shadowOpacity: 0.22, shadowRadius: 6, elevation: 2 },
  assurance: { minHeight: 28, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  assuranceItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  assuranceText: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 9.5 },
  assuranceDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: authColors.muted },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(30,27,75,0.34)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 460, backgroundColor: authColors.background, borderRadius: 30, padding: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)", shadowColor: authColors.text, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 10 },
  closeButton: { position: "absolute", zIndex: 3, top: 28, right: 28, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  modalBanner: { height: 145, borderRadius: 22, overflow: "hidden", marginBottom: 17 },
  modalImage: { width: "100%", height: "100%" },
  modalRoleIcon: { position: "absolute", left: 14, bottom: 12, width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(124,58,237,0.92)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
  modalEyebrow: { color: authColors.inputActive, fontFamily: authFonts.bold, fontSize: 10, letterSpacing: 1.1 },
  modalTitle: { color: authColors.text, fontFamily: authFonts.extra, fontSize: 25, letterSpacing: -0.7, marginTop: 5 },
  modalBody: { color: authColors.secondary, fontFamily: authFonts.medium, fontSize: 12, lineHeight: 19, marginTop: 7, marginBottom: 15 },
  modalPrimaryOuter: { borderRadius: 25, overflow: "hidden", shadowColor: "#A855F7", shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 5 },
  modalPrimary: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  modalPrimaryText: { color: "#FFFFFF", fontFamily: authFonts.extra, fontSize: 15 },
  modalPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  modalSecondary: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 20, borderWidth: 1.2, borderColor: authColors.inputBorder, backgroundColor: "rgba(255,255,255,0.84)", marginTop: 10 },
  modalSecondaryText: { color: authColors.text, fontFamily: authFonts.bold, fontSize: 14 },
});
