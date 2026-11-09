import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Check, Minus, Plus, Zap } from "lucide-react-native";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { mediaUrl, type Product } from "./api";
import { useSession } from "./session";
import { colors, money, s, ThemeContent } from "./ui";

export function ProductCard({ product: p, enabled = true, compact = false }: { product: Product; enabled?: boolean; compact?: boolean }) {
  const { add, replace, cart, quantity, saved, toggleSaved } = useSession();
  const favorite = saved.some((item) => item.id === p.id);
  const cartLine = cart.find((line) => line.product.id === p.id);
  const available = enabled && p.available && p.stock !== 0 && p.vendor.acceptingOrders;
  const [justAdded, setJustAdded] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  function showAdded() {
    setJustAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setJustAdded(false), 1200);
  }

  function addToCart(buyNow = false) {
    if (cartLine) {
      if (buyNow) router.push("/basket");
      else quantity(p.id, cartLine.quantity + 1);
      return;
    }
    if (add(p)) {
      showAdded();
      if (buyNow) router.push("/basket");
      return;
    }
    Alert.alert("Start a new cart?", "Your cart has items from another shop.", [
      { text: "Keep cart", style: "cancel" },
      { text: "Clear and add", onPress: () => { replace(p); showAdded(); if (buyNow) router.push("/basket"); } },
    ]);
  }

  const discount = p.compareAtPricePaise && p.compareAtPricePaise > p.pricePaise
    ? Math.round((1 - p.pricePaise / p.compareAtPricePaise) * 100)
    : 0;
  const canIncrease = Boolean(cartLine && cartLine.quantity < Math.min(50, p.stock ?? 50));

  return <ThemeContent><View style={[st.card, compact && st.cardCompact]}>
    <Pressable accessibilityLabel={`View ${p.name}`} onPress={() => router.push(`/product/${p.id}`)} style={({ pressed }) => [st.picture, compact && st.pictureCompact, pressed && st.imagePressed]}>
      {p.image
        ? <Image source={{ uri: mediaUrl(p.image) }} resizeMode="cover" style={st.image} />
        : <View style={st.placeholder}><Text style={[st.placeholderText, compact && st.placeholderTextCompact]}>{p.name.slice(0, 1).toUpperCase()}</Text><Text style={[st.small, compact && st.smallCompact]}>CAMPUS FINDS</Text></View>}
      {discount > 0 && <Text style={[st.sale, compact && st.badgeCompact]}>{discount}% OFF</Text>}
      {p.vegetarian && <Text style={[st.veg, compact && st.badgeCompact]}>● VEG</Text>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={favorite ? "Remove from liked items" : "Like item"} accessibilityState={{ selected: favorite }} onPress={() => toggleSaved(p)} style={({ pressed }) => [st.heart, compact && st.heartCompact, favorite && st.heartActive, pressed && st.heartPressed]}>
      <Text style={{ fontSize: compact ? 19 : 22, color: favorite ? "#FFFFFF" : colors.ink }}>{favorite ? "♥" : "♡"}</Text>
    </Pressable>
    <View style={[st.copy, compact && st.copyCompact]}>
      <Text numberOfLines={1} style={[st.shop, compact && st.shopCompact]}>{p.vendor.name}</Text>
      <Text numberOfLines={2} style={[st.name, compact && st.nameCompact]}>{p.name}</Text>
      <View style={st.priceRow}><Text style={[s.price, compact && st.priceCompact]}>{money(p.pricePaise)}</Text>{discount > 0 && <Text style={[st.old, compact && st.oldCompact]}>{money(p.compareAtPricePaise!)}</Text>}</View>
      <Text numberOfLines={1} style={[st.small, compact && st.smallCompact]}>{p.stock === 0 ? "Sold out" : p.vendor.acceptingOrders ? `${p.vendor.preparationMinutes} min preparation` : "Shop currently closed"}</Text>

      {cartLine ? <>
        <View style={[st.cartState, compact && st.cartStateCompact]}><Check size={compact ? 12 : 14} strokeWidth={3} color={colors.success} /><Text numberOfLines={1} style={[st.cartStateText, compact && st.cartStateTextCompact]}>Added to cart</Text></View>
        <View style={st.quantityRow}>
          <View style={[st.stepper, compact && st.stepperCompact]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${p.name}`} hitSlop={8} onPress={() => quantity(p.id, cartLine.quantity - 1)} style={({ pressed }) => [st.stepButton, pressed && st.stepPressed]}><Minus size={compact ? 13 : 15} strokeWidth={2.5} color={colors.ink} /></Pressable>
            <Text accessibilityLabel={`Quantity ${cartLine.quantity}`} style={[st.quantity, compact && st.quantityCompact]}>{cartLine.quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add one more ${p.name}`} hitSlop={8} disabled={!canIncrease} onPress={() => quantity(p.id, cartLine.quantity + 1)} style={({ pressed }) => [st.stepButton, !canIncrease && st.stepDisabled, pressed && canIncrease && st.stepPressed]}><Plus size={compact ? 13 : 15} strokeWidth={2.5} color={colors.ink} /></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${p.name} now`} onPress={() => router.push("/basket")} style={({ pressed }) => [st.buyMini, pressed && st.buttonPressed]}><Zap size={compact ? 12 : 14} fill="#FFFFFF" color="#FFFFFF" /><Text style={[st.buyMiniText, compact && st.buyMiniTextCompact]}>Buy</Text></Pressable>
        </View>
      </> : <View style={st.actionStack}>
        <Pressable disabled={!available} accessibilityRole="button" accessibilityLabel={justAdded ? `${p.name} added to cart` : `Add ${p.name} to cart`} onPress={() => addToCart(false)} style={({ pressed }) => [st.add, compact && st.addCompact, !available && st.unavailable, justAdded && st.added, pressed && available && st.buttonPressed]}>
          {justAdded ? <Check size={14} strokeWidth={3} color={colors.success} /> : <Plus size={14} strokeWidth={2.5} color={available ? colors.green : colors.muted} />}
          <Text style={[st.addText, compact && st.addTextCompact, justAdded && st.addTextAdded]}>{available ? justAdded ? "Added to cart" : "Add to cart" : "Unavailable"}</Text>
        </Pressable>
        {available && <Pressable accessibilityRole="button" accessibilityLabel={`Buy ${p.name} now`} onPress={() => addToCart(true)} style={({ pressed }) => [st.buy, compact && st.buyCompact, pressed && st.buttonPressed]}><Zap size={compact ? 12 : 14} fill="#FFFFFF" color="#FFFFFF" /><Text style={[st.buyText, compact && st.buyTextCompact]}>Buy now</Text></Pressable>}
      </View>}
    </View>
  </View></ThemeContent>;
}

export const st = StyleSheet.create({
  card: { width: "48%", borderRadius: 22, overflow: "hidden", backgroundColor: colors.surface, marginBottom: 18, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 7px 22px rgba(24,50,61,0.075)" },
  cardCompact: { borderRadius: 18, marginBottom: 13 },
  picture: { height: 165, backgroundColor: "#F0F2EC" },
  pictureCompact: { height: 124 },
  imagePressed: { opacity: .92 },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F2EC" },
  placeholderText: { fontSize: 54, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#9BA9A0" },
  placeholderTextCompact: { fontSize: 40 },
  small: { fontSize: 10, color: colors.muted, marginTop: 6 },
  smallCompact: { fontSize: 8, marginTop: 3 },
  sale: { position: "absolute", bottom: 10, left: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", backgroundColor: colors.lime, color: colors.ink },
  veg: { position: "absolute", bottom: 10, right: 8, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", backgroundColor: "#E8F5ED", color: colors.success },
  badgeCompact: { bottom: 7, paddingHorizontal: 6, paddingVertical: 4, fontSize: 7 },
  heart: { position: "absolute", right: 9, top: 9, width: 36, height: 36, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.96)", alignItems: "center", justifyContent: "center", boxShadow: "0px 2px 8px rgba(24,44,53,0.12)" },
  heartActive: { backgroundColor: colors.green },
  heartCompact: { right: 7, top: 7, width: 31, height: 31, borderRadius: 11 },
  heartPressed: { transform: [{ scale: .92 }] },
  copy: { padding: 12 },
  copyCompact: { padding: 10 },
  shop: { fontSize: 10, color: colors.green, marginBottom: 6, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", letterSpacing: .3 },
  shopCompact: { fontSize: 8, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: colors.ink, minHeight: 38, marginBottom: 8 },
  nameCompact: { fontSize: 12, minHeight: 32, marginBottom: 5 },
  priceRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  priceCompact: { fontSize: 14 },
  old: { textDecorationLine: "line-through", fontSize: 11, color: colors.muted },
  oldCompact: { fontSize: 9 },
  actionStack: { gap: 7, marginTop: 11 },
  add: { minHeight: 39, flexDirection: "row", gap: 5, borderWidth: 1, borderColor: "#E6B39F", borderRadius: 12, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime },
  addCompact: { minHeight: 34, borderRadius: 10, paddingHorizontal: 6 },
  unavailable: { opacity: .5 },
  added: { backgroundColor: "#E8F5ED", borderColor: "#B9DDC8" },
  addText: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green, fontSize: 10 },
  addTextCompact: { fontSize: 8 },
  addTextAdded: { color: colors.success },
  buy: { minHeight: 37, flexDirection: "row", gap: 5, borderRadius: 12, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  buyCompact: { minHeight: 33, borderRadius: 10 },
  buyText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  buyTextCompact: { fontSize: 8 },
  buttonPressed: { opacity: .84, transform: [{ scale: .97 }] },
  cartState: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 9 },
  cartStateCompact: { marginTop: 7 },
  cartStateText: { flex: 1, color: colors.success, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  cartStateTextCompact: { fontSize: 7 },
  quantityRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 7 },
  stepper: { flex: 1, height: 39, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, backgroundColor: "#F3F3EF", borderWidth: 1, borderColor: colors.line, paddingHorizontal: 3 },
  stepperCompact: { height: 34, borderRadius: 10 },
  stepButton: { width: 28, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  stepPressed: { backgroundColor: colors.lime, transform: [{ scale: .92 }] },
  stepDisabled: { opacity: .35 },
  quantity: { minWidth: 20, textAlign: "center", color: colors.ink, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  quantityCompact: { fontSize: 10 },
  buyMini: { height: 39, minWidth: 54, borderRadius: 12, paddingHorizontal: 8, flexDirection: "row", gap: 3, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  buyMiniText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  buyMiniTextCompact: { fontSize: 7 },
});
