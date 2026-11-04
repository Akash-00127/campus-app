import type { ComponentRef } from "react";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors } from "./ui";

export function HomeCarousel({ images }: { images: string[] }) {
  const [width, setWidth] = useState(0);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const cardWidth = Math.max(1, width);
  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % images.length;
        scroll.current?.scrollTo({ x: next * (cardWidth + 12), animated: true });
        return next;
      });
    }, 3800);
    return () => clearInterval(timer);
  }, [cardWidth, images.length]);
  if (!images.length) return <View style={c.hero}>
    <View style={c.orbit} />
    <View style={c.copy}><Text style={c.eyebrow}>THE GOOD PART OF CAMPUS LIFE</Text><Text style={c.title}>Big cravings.{"\n"}Little breaks.</Text><Text style={c.subtitle}>Food, essentials & your local favourites.{"\n"}A little closer, every day.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/saved")} style={({ pressed }) => [c.cta, pressed && { opacity: 0.75 }]}><Text style={c.ctaText}>Your favourites  ↗</Text></Pressable></View>
    <Image source={require("../assets/onboarding-student.png")} resizeMode="contain" style={c.art} />
  </View>;
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}><ScrollView ref={scroll} horizontal pagingEnabled={false} snapToInterval={cardWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={c.row} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12)))}>{images.map((uri) => <Image key={uri} source={{ uri }} resizeMode="cover" style={[c.image, { width: cardWidth }]} />)}</ScrollView>{images.length > 1 && <View style={c.dots}>{images.map((uri, item) => <View key={uri} style={[c.dot, item === index && c.dotActive]} />)}</View>}</View>;
}
const c = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 26, minHeight: 250, padding: 24, overflow: "hidden", justifyContent: "center" },
  orbit: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 44, borderColor: "#28434C", right: -115, top: -30 },
  copy: { zIndex: 1, width: "73%" },
  eyebrow: { fontSize: 8, letterSpacing: 1.7, color: "#EFC999", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 14 },
  title: { fontSize: 32, lineHeight: 37, letterSpacing: -1.2, color: "#FFF9ED", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  subtitle: { fontSize: 11, lineHeight: 18, color: "#C5D1D0", marginTop: 10 },
  cta: { alignSelf: "flex-start", backgroundColor: "#F2D5AD", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginTop: 18 },
  ctaText: { color: colors.navy, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  art: { position: "absolute", right: -38, bottom: 4, width: "47%", height: 195, opacity: 0.9 },
  row: { gap: 12 }, image: { aspectRatio: 16 / 9, borderRadius: 26, backgroundColor: "#E8ECF4" }, dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }, dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#CBD5E1" }, dotActive: { width: 20, backgroundColor: colors.green }
});
