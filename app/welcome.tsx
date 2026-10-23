import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Brand } from "../src/brand";

type Role = "VENDOR" | "STUDENT";

const roleCards = [
  { role: "STUDENT" as const, title: "Student", description: "Order your favourite food, groceries and more, right on campus.", image: require("../assets/onboarding-student.png"), accent: "#1768DB", tint: "#EAF5FF", symbol: "▰" },
  { role: "VENDOR" as const, title: "Vendor", description: "Grow your business and reach more students.", image: require("../assets/onboarding-vendor.png"), accent: "#FF8300", tint: "#FFF5DB", symbol: "▦" },
];

export default function Welcome() {
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const available = height - insets.top - insets.bottom;
  const compact = available < 690 || fontScale > 1.2;
  const tiny = available < 570;
  const [role, setRole] = useState<Role | null>(null);
  function openLogin() { const selected = role; if (!selected) return; setRole(null); router.replace({ pathname: "/login", params: { role: selected } }); }
  function openRegister() { const selected = role; if (!selected) return; setRole(null); router.replace({ pathname: "/register", params: { role: selected } }); }
  return <SafeAreaView style={w.safe}>
    <View style={[w.page, { paddingHorizontal: width < 350 ? 16 : 22, paddingTop: tiny ? 4 : 10, paddingBottom: tiny ? 6 : 14 }]}>
      <View style={[w.topGlow, tiny && { width: 230, height: 230 }]} />
      <View style={w.brandBlock}><Brand size={tiny ? 72 : compact ? 84 : 98} /><Text style={[w.kicker, tiny && { marginTop: 2 }]}>CAMPUS DELIVERY</Text><Text style={[w.heading, { fontSize: tiny ? 25 : compact ? 28 : 32 }]}>Choose Your Role</Text>{!tiny && <Text style={w.subheading}>Select how you want to use Campus Drop</Text>}</View>
      <View style={[w.cards, tiny && { gap: 12 }]}>{roleCards.map((item) => <Pressable key={item.role} accessibilityRole="button" accessibilityLabel={`Continue as ${item.title}`} onPress={() => setRole(item.role)} style={({ pressed }) => [w.card, { minHeight: tiny ? 150 : compact ? 174 : 195, opacity: pressed ? 0.9 : 1 }]}>
        <View style={[w.cardHalo, { backgroundColor: item.tint }]} />
        <Image source={item.image} resizeMode="contain" style={[w.character, item.role === "VENDOR" ? w.vendorCharacter : w.studentCharacter]} />
        <View style={w.cardContent}><View style={[w.roleIcon, { backgroundColor: item.accent }]}><Text style={w.roleIconText}>{item.symbol}</Text></View><Text style={[w.cardTitle, { fontSize: tiny ? 20 : 24 }]}>{item.title}</Text><Text numberOfLines={tiny ? 2 : 3} style={[w.cardDescription, tiny && { fontSize: 10, lineHeight: 14 }]}>{item.description}</Text><View style={[w.arrowButton, { backgroundColor: item.accent }]}><Text style={w.arrow}>→</Text></View></View>
      </Pressable>)}</View>
      <View style={w.footer}><View style={w.skyline}>{Array.from({ length: 20 }).map((_, index) => <View key={index} style={[w.building, { height: 8 + ((index * 11) % 20), width: 8 + ((index * 7) % 14) }]} />)}</View><Text style={[w.footerText, tiny && { fontSize: 9 }]}>Same Campus <Text style={w.dot}>•</Text> Different Needs <Text style={w.dot}>•</Text> One Platform</Text></View>
    </View>
    {role && <View style={w.overlay} accessibilityViewIsModal><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close account options" onPress={() => setRole(null)} /><View style={w.sheet}><View style={w.sheetHeader}><Text style={w.sheetTitle}>{role === "STUDENT" ? "Student" : "Vendor"} account</Text><Pressable accessibilityRole="button" accessibilityLabel="Close popup" onPress={() => setRole(null)}><Text style={w.close}>×</Text></Pressable></View><Text style={w.sheetText}>New here or already part of Campus Drop?</Text><Pressable accessibilityRole="button" onPress={openRegister} style={[w.sheetButton, { backgroundColor: role === "STUDENT" ? "#1768DB" : "#FF8300" }]}><Text style={w.sheetButtonText}>Register · Create an account</Text></Pressable><Pressable accessibilityRole="button" onPress={openLogin} style={[w.sheetButton, w.loginButton]}><Text style={w.loginText}>Login · I already have an account</Text></Pressable></View></View>}
  </SafeAreaView>;
}

const w = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#052B83", position: "relative" }, page: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center", overflow: "hidden" }, topGlow: { position: "absolute", width: 330, height: 330, borderRadius: 200, backgroundColor: "#0A4EBC", opacity: 0.42, top: -175, right: -110 }, brandBlock: { alignItems: "center", zIndex: 1, marginBottom: 16 }, kicker: { color: "#A9D0FF", fontWeight: "900", letterSpacing: 1.3, fontSize: 9, marginTop: 5 }, heading: { color: "#FFFFFF", fontWeight: "900", letterSpacing: -0.7, marginTop: 6, textAlign: "center" }, subheading: { color: "#D9E9FF", fontSize: 13, marginTop: 5, textAlign: "center" }, cards: { gap: 17, zIndex: 1 }, card: { backgroundColor: "#FFFFFF", borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", shadowColor: "#001548", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 7 }, cardHalo: { position: "absolute", width: 260, height: 260, borderRadius: 150, left: -134, top: -32, opacity: 0.92 }, character: { position: "absolute", left: -8, bottom: -12, width: "45%", height: "112%" }, studentCharacter: {}, vendorCharacter: { left: -12, bottom: -20 }, cardContent: { flex: 1, marginLeft: "48%", paddingVertical: 20, paddingRight: 16, justifyContent: "center" }, roleIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 7 }, roleIconText: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" }, cardTitle: { color: "#123679", fontWeight: "900", letterSpacing: -0.45 }, cardDescription: { color: "#526A92", fontSize: 11.5, lineHeight: 16, fontWeight: "600", marginTop: 5, paddingRight: 4 }, arrowButton: { alignSelf: "flex-end", marginTop: 8, width: 36, height: 36, borderRadius: 19, justifyContent: "center", alignItems: "center" }, arrow: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", lineHeight: 25 }, footer: { flex: 1, justifyContent: "flex-end", alignItems: "center", minHeight: 42, marginTop: 4 }, skyline: { flexDirection: "row", alignItems: "flex-end", opacity: 0.5, height: 30, width: "125%", justifyContent: "center", gap: 2 }, building: { backgroundColor: "#061B5C", borderTopLeftRadius: 2, borderTopRightRadius: 2 }, footerText: { color: "#DCEBFF", fontSize: 10, fontWeight: "800", marginTop: 5 }, dot: { color: "#FFC928" }, overlay: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 10, justifyContent: "center", padding: 22, backgroundColor: "rgba(0, 15, 55, 0.58)" }, sheet: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 22, maxWidth: 420, width: "100%", alignSelf: "center" }, sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sheetTitle: { color: "#102B65", fontSize: 21, fontWeight: "900" }, close: { color: "#526A92", fontSize: 27, lineHeight: 27 }, sheetText: { color: "#68799A", fontSize: 13, marginTop: 8, lineHeight: 18 }, sheetButton: { borderRadius: 14, minHeight: 52, justifyContent: "center", alignItems: "center", marginTop: 16 }, sheetButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 }, loginButton: { backgroundColor: "#EDF4FF", borderWidth: 1, borderColor: "#C8D9F5", marginTop: 10 }, loginText: { color: "#102B65", fontWeight: "800", fontSize: 14 },
});
