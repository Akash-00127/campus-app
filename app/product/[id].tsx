import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { mediaUrl, request, type Catalog, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import { ProductCard } from "../../src/storefront";
import demoPhotoCredits from "../../src/demo-photo-credits.json";
import { Button, Loading, Notice, Screen, colors, money, s } from "../../src/ui";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, add, replace, saved, toggleSaved } = useSession();
  const [product, setProduct] = useState<Product>();
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!session) { router.replace("/welcome"); return; }
    void request<Product>(`/products/${id}`, session.accessToken)
      .then(async (next) => {
        if (!active) return;
        setProduct(next);
        const catalog = await request<Catalog>(`/catalog?vendorId=${next.vendorId}&limit=6`, session.accessToken);
        if (active) setRelated(catalog.products.filter((item) => item.id !== next.id).slice(0, 4));
      })
      .catch((caught) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [id, session]);

  const demoPhotoKey = product?.image?.match(/^\/demo-food\/([a-zA-Z]+)\./)?.[1];
  const photoCredit = demoPhotoKey ? demoPhotoCredits[demoPhotoKey as keyof typeof demoPhotoCredits] : undefined;
  const favourite = Boolean(product && saved.some((item) => item.id === product.id));
  const available = Boolean(product?.available && product.stock !== 0 && product.vendor.acceptingOrders);
  const maxQuantity = Math.max(1, Math.min(product?.stock ?? 10, 10));

  function addSelected() {
    if (!product) return;
    const fill = () => { replace(product); for (let item = 1; item < quantity; item += 1) add(product); };
    if (!add(product)) {
      Alert.alert("Start a new basket?", "Your basket contains products from another shop.", [
        { text: "Keep basket", style: "cancel" },
        { text: "Clear and add", onPress: fill },
      ]);
      return;
    }
    for (let item = 1; item < quantity; item += 1) add(product);
    Alert.alert("Added to basket", `${quantity} × ${product.name}`);
  }

  return (
    <Screen>
      {error && <Notice text={error} />}
      {!product ? <Loading /> : <>
        <View style={d.media}>
          {product.image ? <Image source={{ uri: mediaUrl(product.image) }} resizeMode="cover" style={d.image} /> : <View style={[d.image, d.placeholder]}><Text style={d.placeholderLetter}>{product.name.slice(0, 1)}</Text></View>}
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={({ pressed }) => [d.roundButton, d.back, pressed && d.pressed]}><Text style={d.backText}>← Back</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={favourite ? "Remove from saved items" : "Save item"} onPress={() => toggleSaved(product)} style={({ pressed }) => [d.roundButton, d.save, pressed && d.pressed]}><Text style={[d.heart, favourite && { color: colors.green }]}>{favourite ? "♥" : "♡"}</Text></Pressable>
          {product.vegetarian && <View style={d.veg}><View style={d.vegDot} /><Text style={d.vegText}>VEG</Text></View>}
        </View>
        {photoCredit && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(photoCredit.source)}><Text style={d.credit}>Photo: {photoCredit.artist} · {photoCredit.license} · Wikimedia Commons ↗</Text></Pressable>}

        <View style={d.headingRow}><View style={{ flex: 1 }}><Text style={d.vendor}>{product.vendor.name}</Text><Text style={d.title}>{product.name}</Text>{product.category?.name && <Text style={d.category}>{product.category.name}</Text>}</View><Text style={d.price}>{money(product.pricePaise)}</Text></View>
        <Text style={d.description}>{product.description || "Prepared fresh by a trusted campus kitchen."}</Text>

        <View style={d.metaRow}>
          <View style={d.meta}><Text style={d.metaIcon}>★</Text><Text style={d.metaValue}>{product.vendor.rating?.toFixed(1) || "New"}</Text><Text style={d.metaLabel}>{product.vendor.reviewCount ? `${product.vendor.reviewCount} reviews` : "Campus vendor"}</Text></View>
          <View style={d.divider} />
          <View style={d.meta}><Text style={d.metaIcon}>◷</Text><Text style={d.metaValue}>{product.vendor.preparationMinutes} min</Text><Text style={d.metaLabel}>Preparation</Text></View>
          <View style={d.divider} />
          <View style={d.meta}><Text style={[d.metaIcon, { color: available ? colors.success : colors.muted }]}>●</Text><Text style={d.metaValue}>{available ? "Open" : "Closed"}</Text><Text style={d.metaLabel}>Availability</Text></View>
        </View>

        <View style={d.orderBar}><View><Text style={d.quantityLabel}>QUANTITY</Text><View style={d.stepper}><Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={quantity === 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} style={({ pressed }) => [d.stepButton, pressed && d.pressed]}><Text style={d.stepText}>−</Text></Pressable><Text style={d.quantity}>{quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={quantity === maxQuantity} onPress={() => setQuantity((current) => Math.min(maxQuantity, current + 1))} style={({ pressed }) => [d.stepButton, pressed && d.pressed]}><Text style={d.stepText}>+</Text></Pressable></View></View><Pressable accessibilityRole="button" disabled={!available} onPress={addSelected} style={({ pressed }) => [d.addButton, !available && d.disabled, pressed && available && d.pressed]}><Text style={d.addText}>{available ? `Add · ${money(product.pricePaise * quantity)}` : "Unavailable"}</Text></Pressable></View>

        <Pressable onPress={() => router.push(`/vendor/${product.vendorId}`)} style={({ pressed }) => [d.vendorCard, pressed && d.pressed]}><View style={d.vendorMark}><Text style={d.vendorMarkText}>{product.vendor.name.slice(0, 1)}</Text></View><View style={{ flex: 1 }}><Text style={d.vendorCardEyebrow}>SOLD BY</Text><Text style={s.h3}>{product.vendor.name}</Text><Text style={d.vendorCardMeta}>{product.vendor.address || "On campus"} · {product.vendor.codEnabled ? "COD available" : "COD unavailable"}</Text></View><Text style={d.chevron}>›</Text></Pressable>
        <Button secondary onPress={() => router.push("/(tabs)/cart")}>View basket</Button>

        {related.length > 0 && <View style={d.related}><Text style={d.relatedTitle}>You may also like</Text><Text style={d.relatedSubtitle}>More from {product.vendor.name}</Text><View style={d.grid}>{related.map((item) => <ProductCard key={item.id} product={item} />)}</View></View>}
      </>}
    </Screen>
  );
}

const d = StyleSheet.create({
  media: { height: 310, borderRadius: 28, overflow: "hidden", backgroundColor: "#EDF0F4", marginBottom: 16 },
  image: { width: "100%", height: "100%" }, placeholder: { alignItems: "center", justifyContent: "center" }, placeholderLetter: { fontSize: 82, color: colors.green, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  roundButton: { position: "absolute", top: 15, width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: .12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, back: { left: 15, width: 80 }, save: { right: 15 }, backText: { fontSize:14, color: colors.navy, lineHeight: 35, marginTop: -4 }, heart: { color: colors.navy, fontSize: 24 }, pressed: { opacity: .78, transform: [{ scale: .97 }] },
  veg: { position: "absolute", left: 15, bottom: 15, flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "rgba(255,255,255,.94)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 }, vegDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }, vegText: { color: colors.success, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  credit: { fontSize: 9, color: colors.muted, marginTop: -8, marginBottom: 14 }, headingRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 }, vendor: { color: colors.green, fontSize: 10, letterSpacing: .7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 }, title: { color: colors.ink, fontSize: 29, lineHeight: 34, letterSpacing: -.9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, category: { color: colors.muted, fontSize: 11, marginTop: 5 }, price: { color: colors.ink, fontSize: 22, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, description: { color: colors.muted, fontSize: 12, lineHeight: 20, marginTop: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingVertical: 16, marginTop: 20 }, meta: { flex: 1, alignItems: "center" }, metaIcon: { color: colors.orange, fontSize: 14, marginBottom: 5 }, metaValue: { color: colors.ink, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, metaLabel: { color: colors.muted, fontSize: 8, marginTop: 3 }, divider: { width: 1, height: 34, backgroundColor: colors.line },
  orderBar: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }, quantityLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 }, stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 12, overflow: "hidden" }, stepButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" }, stepText: { color: colors.ink, fontSize: 18, fontWeight: "700" }, quantity: { minWidth: 26, textAlign: "center", color: colors.ink, fontSize: 13, fontWeight: "800" }, addButton: { flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, disabled: { opacity: .45 }, addText: { color: "white", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  vendorCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 15, marginTop: 16 }, vendorMark: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }, vendorMarkText: { color: colors.green, fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, vendorCardEyebrow: { color: colors.muted, fontSize: 8, letterSpacing: 1, fontWeight: "800", marginBottom: 4 }, vendorCardMeta: { color: colors.muted, fontSize: 9, marginTop: 5 }, chevron: { color: colors.green, fontSize: 28 }, related: { marginTop: 30 }, relatedTitle: { color: colors.ink, fontSize: 21, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, relatedSubtitle: { color: colors.muted, fontSize: 11, marginTop: 4, marginBottom: 16 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
});
