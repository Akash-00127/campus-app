import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Brand } from "../src/brand";

const roles = {
  STUDENT: { label: "Student", title: "Campus life,", accent: "made easy.", description: "Your favourite campus shops. Food and everyday essentials, all in one place.", image: require("../assets/onboarding-student.png"), color: "#172F3B", tint: "#E9EDE7", caption: "A little less running. A lot more living." },
  VENDOR: { label: "Vendor", title: "Your shop,", accent: "more possibilities.", description: "Reach your campus community. Manage your products and orders in one place.", image: require("../assets/onboarding-vendor.png"), color: "#B74426", tint: "#FCECE1", caption: "Local shops. A stronger campus community." },
};
type Role = keyof typeof roles;

export default function Welcome() {
  const [role, setRole] = useState<Role>("STUDENT");
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 850 && width > height;
  const compact = height - insets.top - insets.bottom < 690;
  const tiny = height - insets.top - insets.bottom < 540;
  const item = roles[role];
  function open(pathname: "/login" | "/register") {
    router.push({ pathname, params: { role } });
  }
  return <SafeAreaView style={s.safe}>
    <View style={[s.page, { paddingHorizontal: width < 380 ? 20 : 28, paddingVertical: compact ? 10 : 22 }]}>
      <View style={s.header}>
        <View style={s.identity}><Brand size={36} /><Text style={s.wordmark}>Campus<Text style={s.orange}> Drop</Text></Text></View>
        {width >= 380 && <View style={s.badge}><View style={s.dot} /><Text style={s.badgeText}>Made for campus</Text></View>}
      </View>
      <View style={[s.content, wide && s.contentWide]}>
        <View style={[s.intro, wide && s.introWide]}>
          {!tiny && <Text style={s.eyebrow}>YOUR CAMPUS. A LITTLE CLOSER.</Text>}
          <Text accessibilityRole="header" style={[s.headline, { fontSize: wide ? 58 : compact ? 34 : 42, lineHeight: wide ? 66 : compact ? 40 : 48 }]}>{item.title}{"\n"}<Text style={s.orange}>{item.accent}</Text></Text>
          {!tiny && <Text style={s.description}>{item.description}</Text>}
          {wide && <Text style={s.desktopNote}>One campus. One community. Endless possibilities.</Text>}
        </View>
        <View style={[s.experience, wide && s.experienceWide]}>
          <View style={s.selector} accessibilityRole="tablist">
            {(Object.keys(roles) as Role[]).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: role === value }} accessibilityLabel={`Continue as ${roles[value].label.toLowerCase()}`} onPress={() => setRole(value)} style={[s.role, role === value && s.selectedRole]}><Text style={[s.roleText, role === value && s.selectedRoleText]}>I'm a {roles[value].label.toLowerCase()}</Text>{role === value && <View style={s.selectionDot} />}</Pressable>)}
          </View>
          <View style={[s.art, { backgroundColor: item.tint, marginVertical: compact ? 10 : 18 }]}>
            <View style={[s.halo, { borderColor: role === "STUDENT" ? "#D4DED4" : "#F3D8C8" }]} />
            {!tiny && <View style={s.artLabel}><View style={[s.dot, { backgroundColor: item.color }]} /><Text style={[s.artLabelText, { color: item.color }]}>{role === "STUDENT" ? "THE CAMPUS IS YOURS" : "GROW WITH YOUR CAMPUS"}</Text></View>}
            <Image source={item.image} resizeMode="contain" style={s.illustration} accessibilityLabel={`${item.label} campus illustration`} />
            {!compact && <Text style={s.caption}>{item.caption}</Text>}
          </View>
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.label} login`} onPress={() => open("/login")} style={({ pressed }) => [s.primary, { backgroundColor: item.color }, pressed && s.pressed]}><Text style={s.primaryText}>Continue as {item.label.toLowerCase()}</Text><Text style={s.arrow}>→</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Create ${item.label.toLowerCase()} account`} onPress={() => open("/register")} style={({ pressed }) => [s.signup, pressed && s.pressed]}><Text style={s.signupText}>New here? <Text style={s.signupAccent}>Create an account ↗</Text></Text></Pressable>
          </View>
        </View>
      </View>
      {!tiny && <View style={s.footer}><View style={s.footerLine} /><Text style={s.footerText}>LOCAL SHOPS. CAMPUS CONNECTIONS.</Text><View style={s.footerLine} /></View>}
    </View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F7F3" },
  page: { flex: 1, width: "100%", maxWidth: 1160, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { color: "#172B35", fontSize: 19, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -.7 },
  orange: { color: "#D94E2C" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFEFE5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: "#427258" },
  badgeText: { color: "#53604E", fontSize: 10, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  content: { flex: 1, minHeight: 0, paddingVertical: 16, width: "100%", maxWidth: 480, alignSelf: "center" },
  contentWide: { flexDirection: "row", alignItems: "center", gap: 70, maxWidth: 1100, paddingVertical: 28 },
  intro: { flexShrink: 0 },
  introWide: { flex: 1 },
  eyebrow: { color: "#92735E", fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.8, marginBottom: 10 },
  headline: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#172B35", letterSpacing: -1.8 },
  description: { color: "#727781", fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 360 },
  desktopNote: { color: "#92735E", fontSize: 12, lineHeight: 20, marginTop: 30 },
  experience: { flex: 1, minHeight: 0, paddingTop: 18 },
  experienceWide: { flex: 1, height: "100%", maxHeight: 600, paddingTop: 0 },
  selector: { flexDirection: "row", backgroundColor: "#ECEDE7", padding: 4, borderRadius: 16, gap: 4 },
  role: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selectedRole: { backgroundColor: "#FFFFFF", boxShadow: "0px 2px 6px rgba(25,39,62,0.07)" },
  roleText: { fontSize: 13, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#888078" },
  selectedRoleText: { color: "#172B35", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  selectionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D94E2C" },
  art: { flex: 1, minHeight: 0, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 36, opacity: .65 },
  artLabel: { position: "absolute", top: 16, left: 18, flexDirection: "row", alignItems: "center", gap: 6, zIndex: 1 },
  artLabelText: { fontSize: 8, letterSpacing: 1.1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  illustration: { width: "84%", height: "80%", maxHeight: 320 },
  caption: { position: "absolute", bottom: 16, color: "#59677D", fontSize: 10, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", textAlign: "center" },
  actions: { flexShrink: 0 },
  primary: { minHeight: 52, borderRadius: 18, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  arrow: { color: "#FFFFFF", fontSize: 23 },
  signup: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  signupText: { color: "#85817D", fontSize: 12 },
  signupAccent: { color: "#172B35", fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  pressed: { opacity: .78, transform: [{ scale: .985 }] },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  footerLine: { flex: 1, height: 1, backgroundColor: "#E7DED4" },
  footerText: { color: "#A1978C", fontSize: 8, letterSpacing: 1.1, textAlign: "center" },
});
