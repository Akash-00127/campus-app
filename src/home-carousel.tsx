import type { ComponentRef } from "react";
import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

export function HomeCarousel({ images }: { images: string[] }) {
  const { width } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [index, setIndex] = useState(0);
  const cardWidth = Math.max(280, width - 36);
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
  if (!images.length) return null;
  return <View><ScrollView ref={scroll} horizontal pagingEnabled={false} snapToInterval={cardWidth + 12} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={c.row} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12)))}>{images.map((uri) => <Image key={uri} source={{ uri }} resizeMode="cover" style={[c.image, { width: cardWidth }]} />)}</ScrollView>{images.length > 1 && <View style={c.dots}>{images.map((uri, item) => <View key={uri} style={[c.dot, item === index && c.dotActive]} />)}</View>}</View>;
}
const c = StyleSheet.create({ row: { gap: 12 }, image: { aspectRatio: 16 / 9, borderRadius: 20, backgroundColor: "#E8ECF4" }, dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }, dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: "#CBD5E1" }, dotActive: { width: 20, backgroundColor: "#FF6B45" } });
