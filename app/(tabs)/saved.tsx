import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Heart } from "lucide-react-native";
import { request, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import { ProductCard } from "../../src/storefront";
import { EmptyState, Notice, Screen, ThemeContent, colors } from "../../src/ui";

export default function Saved() {
  const { saved, session } = useSession();
  const [items, setItems] = useState<Product[]>([]);
  const [unavailable, setUnavailable] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (session) Promise.all(saved.map((product) => request<Product>(`/products/${product.id}`, session.accessToken).catch(() => null)))
      .then((rows) => {
        if (!active) return;
        setItems(rows.filter((row): row is Product => Boolean(row)));
        setUnavailable(rows.filter((row) => !row).length);
      });
    return () => { active = false; };
  }, [saved, session]));

  return <Screen><ThemeContent>
    <View style={l.topRow}>
      <View style={{ flex: 1 }}>
        <Text style={l.eyebrow}>YOUR FAVOURITES</Text>
        <Text style={l.title}>Liked by you</Text>
      </View>
    </View>
    <View style={l.hero}>
      <View style={l.heroIcon}><Heart size={24} color={colors.green} fill="#FFF0E9" /></View>
      <View style={{ flex: 1 }}><Text style={l.heroTitle}>{saved.length ? `${saved.length} good ${saved.length === 1 ? "find" : "finds"}, kept close` : "A home for your favourites"}</Text><Text style={l.heroCopy}>Save anything you love, then add it to your cart whenever the craving hits.</Text></View>
    </View>
    {unavailable > 0 && <Notice text={`${unavailable} liked ${unavailable === 1 ? "item is" : "items are"} currently unavailable.`} />}
    {items.length > 0 && <View style={l.grid}>{items.map((product) => <ProductCard key={product.id} product={product} />)}</View>}
    {!saved.length && <EmptyState symbol="♡" title="Nothing liked yet" description="Tap the heart on any product to build your personal campus shortlist." />}
  </ThemeContent></Screen>;
}

const l = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4, marginBottom: 20 },
  eyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 6 },
  title: { color: colors.ink, fontSize: 31, letterSpacing: -1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  hero: { minHeight: 112, flexDirection: "row", alignItems: "center", gap: 15, padding: 18, borderRadius: 22, backgroundColor: colors.navy, marginBottom: 22, overflow: "hidden" },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  heroCopy: { color: "#CBD7DA", fontSize: 10, lineHeight: 16, marginTop: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
