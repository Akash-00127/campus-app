import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { mediaUrl, request, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import demoPhotoCredits from "../../src/demo-photo-credits.json";
import { colors, money, ThemeContent } from "../../src/ui";
import { useAppTheme } from "../../src/theme";
import { CartButton } from "../../src/cart-button";

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();
  const { session, add, replace, cart, quantity: setCartQuantity, saved, toggleSaved } = useSession();
  const [product, setProduct] = useState<Product>();
  const [error, setError] = useState("");
  const [count, setCount] = useState(1);
  const [added, setAdded] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compact = height < 740;
  const veryCompact = height < 610;

  useEffect(() => {
    if (!session) {
      router.replace("/welcome");
      return;
    }
    let active = true;
    setError("");
    void request<Product>(`/products/${id}`, session.accessToken)
      .then((next) => { if (active) setProduct(next); })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    return () => { active = false; };
  }, [id, session]);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  if (!product) return <ProductLoading error={error} />;

  const favourite = saved.some((item) => item.id === product.id);
  const cartLine = cart.find((line) => line.product.id === product.id);
  const maxQuantity = Math.min(10, product.stock ?? 10);
  const selectedCount = Math.min(count, Math.max(1, maxQuantity));
  const available = product.available && product.stock !== 0 && product.vendor.acceptingOrders;
  const discount = product.compareAtPricePaise && product.compareAtPricePaise > product.pricePaise
    ? Math.round((1 - product.pricePaise / product.compareAtPricePaise) * 100)
    : 0;
  const demoPhotoKey = product.image?.match(/^\/demo-food\/([a-zA-Z]+)\./)?.[1];
  const photoCredit = demoPhotoKey ? demoPhotoCredits[demoPhotoKey as keyof typeof demoPhotoCredits] : undefined;

  function showAdded() {
    setAdded(true);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setAdded(false), 1300);
  }

  function addSelectedQuantity() {
    if (cartLine) {
      router.push("/basket");
      return;
    }
    if (add(product!)) {
      for (let item = 1; item < selectedCount; item += 1) add(product!);
      showAdded();
      return;
    }
    Alert.alert("Start a new basket?", "Your basket contains products from another shop.", [
      { text: "Keep basket", style: "cancel" },
      {
        text: "Clear and add",
        onPress: () => {
          replace(product!);
          if (selectedCount > 1) setCartQuantity(product!.id, selectedCount);
          showAdded();
        },
      },
    ]);
  }

  return <ThemeContent><SafeAreaView style={p.safe} edges={["top", "bottom", "left", "right"]}>
    <StatusBar style="light" />
    <View style={p.frame}>
      <View style={[p.hero, compact && p.heroCompact, veryCompact && p.heroVeryCompact]}>
        {product.image
          ? <Image source={{ uri: mediaUrl(product.image) }} resizeMode="cover" style={p.foodImage} />
          : <View style={p.imageFallback}><View style={p.fallbackOrb} /><Text style={p.fallbackInitial}>{product.name.slice(0, 1).toUpperCase()}</Text><Text style={p.fallbackLabel}>CAMPUS FAVOURITE</Text></View>}
        <View style={p.imageTint} />
        <View style={p.topActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [p.circleButton, pressed && p.pressed]}><Text style={p.backIcon}>‹</Text></Pressable>
          <View style={p.topActionGroup}><Pressable accessibilityRole="button" accessibilityLabel={favourite ? "Remove from liked items" : "Like item"} accessibilityState={{ selected: favourite }} onPress={() => toggleSaved(product)} style={({ pressed }) => [p.circleButton, pressed && p.pressed]}><Text style={[p.heartIcon, favourite && p.heartActive]}>{favourite ? "♥" : "♡"}</Text></Pressable><CartButton compact light /></View>
        </View>
        <View style={p.heroBadges}>
          {discount > 0 && <View style={p.discountBadge}><Text style={p.discountText}>{discount}% OFF</Text></View>}
          {product.vegetarian && <View style={p.vegBadge}><Text style={p.vegText}>●  VEG</Text></View>}
        </View>
        {photoCredit && <Pressable accessibilityRole="link" accessibilityLabel={`Photo by ${photoCredit.artist}`} onPress={() => void Linking.openURL(photoCredit.source)} style={p.credit}><Text numberOfLines={1} style={p.creditText}>Photo · {photoCredit.artist} ↗</Text></Pressable>}
      </View>

      <View style={[p.sheet, compact && p.sheetCompact]}>
        <View style={p.grabber} />
        <View style={p.kickerRow}>
          <Pressable accessibilityRole="button" onPress={() => router.push(`/vendor/${product.vendorId}`)} style={({ pressed }) => [p.vendorPill, pressed && p.pressed]}><View style={p.vendorDot}><Text style={p.vendorInitial}>{product.vendor.name.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={p.vendorPillText}>{product.vendor.name}</Text><Text style={p.vendorArrow}>›</Text></Pressable>
          <View style={p.availability}><View style={[p.availabilityDot, !available && p.unavailableDot]} /><Text style={[p.availabilityText, !available && p.unavailableText]}>{available ? "AVAILABLE" : "UNAVAILABLE"}</Text></View>
        </View>

        <Text numberOfLines={2} style={[p.productName, compact && p.productNameCompact]}>{product.name}</Text>
        {!veryCompact && <Text numberOfLines={compact ? 2 : 3} style={p.description}>{product.description || "Prepared fresh by your campus shop and ready for your next craving."}</Text>}

        <View style={p.priceRow}>
          <Text style={p.price}>{money(product.pricePaise)}</Text>
          {discount > 0 && <Text style={p.oldPrice}>{money(product.compareAtPricePaise!)}</Text>}
          <Text style={p.taxText}>inclusive of taxes</Text>
        </View>

        {!veryCompact && <View style={p.infoBar}>
          <Info icon="◷" value={`${product.vendor.preparationMinutes} min`} label="Preparation" />
          <View style={p.infoDivider} />
          <Info icon="⌖" value="On campus" label="Local delivery" />
          <View style={p.infoDivider} />
          <Info icon="▣" value={product.vendor.codEnabled ? "COD" : "Online"} label="Payment" />
        </View>}

        <Pressable accessibilityRole="button" accessibilityLabel={`Visit ${product.vendor.name}`} onPress={() => router.push(`/vendor/${product.vendorId}`)} style={({ pressed }) => [p.shopRow, pressed && p.shopRowPressed]}>
          <View style={p.shopMark}><Text style={p.shopMarkText}>{product.vendor.name.slice(0, 1).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={p.shopName}>More from {product.vendor.name}</Text><Text numberOfLines={1} style={p.shopMeta}>{product.vendor.address || `${product.vendor.preparationMinutes} min preparation`} · View full menu</Text></View>
          <Text style={p.shopArrow}>›</Text>
        </Pressable>

        <View style={p.spacer} />
        <View style={p.actionRow}>
          <View style={p.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={!cartLine && selectedCount === 1} onPress={() => cartLine ? setCartQuantity(product.id, cartLine.quantity - 1) : setCount((value) => Math.max(1, value - 1))} style={({ pressed }) => [p.stepButton, !cartLine && selectedCount === 1 && p.stepDisabled, pressed && (Boolean(cartLine) || selectedCount > 1) && p.pressed]}><Text style={p.stepText}>−</Text></Pressable>
            <Text accessibilityLabel={`Quantity ${cartLine?.quantity ?? selectedCount}`} style={p.count}>{cartLine?.quantity ?? selectedCount}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={cartLine ? cartLine.quantity >= Math.min(50, product.stock ?? 50) : selectedCount >= maxQuantity} onPress={() => cartLine ? setCartQuantity(product.id, cartLine.quantity + 1) : setCount((value) => Math.min(maxQuantity, value + 1))} style={({ pressed }) => [p.stepButton, (cartLine ? cartLine.quantity >= Math.min(50, product.stock ?? 50) : selectedCount >= maxQuantity) && p.stepDisabled, pressed && (cartLine ? cartLine.quantity < Math.min(50, product.stock ?? 50) : selectedCount < maxQuantity) && p.pressed]}><Text style={p.stepText}>+</Text></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={available ? cartLine ? `View cart with ${cartLine.quantity} ${product.name}` : `Add ${selectedCount} ${product.name} to cart` : `${product.name} is unavailable`} disabled={!available} onPress={addSelectedQuantity} style={({ pressed }) => [p.addButton, !available && p.addDisabled, (added || cartLine) && p.addedButton, pressed && available && p.addPressed]}>
            <Text style={p.addLabel}>{available ? cartLine ? "Added to cart  ·  View" : added ? "Added to cart  ✓" : "Add to cart" : product.stock === 0 ? "Sold out" : "Unavailable"}</Text>
            {available && !added && <Text style={p.addPrice}>{money(product.pricePaise * (cartLine?.quantity ?? selectedCount))}</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  </SafeAreaView></ThemeContent>;
}

function Info({ icon, value, label }: { icon: string; value: string; label: string }) {
  return <ThemeContent><View style={p.infoItem}><Text style={p.infoIcon}>{icon}</Text><Text numberOfLines={1} style={p.infoValue}>{value}</Text><Text numberOfLines={1} style={p.infoLabel}>{label}</Text></View></ThemeContent>;
}

function ProductLoading({ error }: { error: string }) {
  const {darkMode}=useAppTheme();
  return <ThemeContent><SafeAreaView style={p.loadingSafe} edges={["top", "bottom", "left", "right"]}>
    <StatusBar style={darkMode?"light":"dark"} />
    <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [p.loadingBack, pressed && p.pressed]}><Text style={p.backIcon}>‹</Text></Pressable>
    <View style={p.loadingContent}>
      {error ? <><View style={p.errorIcon}><Text style={p.errorIconText}>!</Text></View><Text style={p.errorTitle}>This item couldn’t load</Text><Text style={p.errorCopy}>{error}</Text><Pressable accessibilityRole="button" onPress={() => router.back()} style={p.errorButton}><Text style={p.errorButtonText}>Back to menu</Text></Pressable></> : <><ActivityIndicator size="large" color={colors.green} /><Text style={p.loadingText}>Preparing the details…</Text></>}
    </View>
  </SafeAreaView></ThemeContent>;
}

const p = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#102830" }, frame: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: "#102830", overflow: "hidden" }, hero: { height: "44%", minHeight: 250, backgroundColor: "#DCE5DF" }, heroCompact: { height: "39%", minHeight: 210 }, heroVeryCompact: { height: "34%", minHeight: 145 }, foodImage: { width: "100%", height: "100%" }, imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#DDE7E0", overflow: "hidden" }, fallbackOrb: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "#C7D7CC", right: -80, top: -90 }, fallbackInitial: { color: colors.green, fontSize: 74, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, fallbackLabel: { color: "#728079", fontSize: 8, letterSpacing: 1.8, fontWeight: "800", marginTop: 4 }, imageTint: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(10,29,35,.11)" }, topActions: { position: "absolute", left: 18, right: 18, top: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, topActionGroup: { flexDirection: "row", alignItems: "center", gap: 8 }, circleButton: { width: 45, height: 45, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.94)", borderWidth: 1, borderColor: "rgba(255,255,255,.72)", boxShadow: "0px 4px 14px rgba(18,36,42,.16)" }, backIcon: { color: colors.ink, fontSize: 35, lineHeight: 37, marginTop: -4 }, heartIcon: { color: colors.ink, fontSize: 25, lineHeight: 27 }, heartActive: { color: colors.green }, pressed: { opacity: .76, transform: [{ scale: .95 }] }, heroBadges: { position: "absolute", left: 18, bottom: 19, flexDirection: "row", gap: 8 }, discountBadge: { backgroundColor: "#FFD982", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, discountText: { color: colors.navy, fontSize: 8, letterSpacing: .7, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" }, vegBadge: { backgroundColor: "rgba(255,255,255,.94)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, vegText: { color: colors.success, fontSize: 8, letterSpacing: .6, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" }, credit: { position: "absolute", right: 16, bottom: 19, maxWidth: 150, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "rgba(14,34,40,.68)" }, creditText: { color: "#FFFFFF", fontSize: 7, fontWeight: "600" },
  sheet: { flex: 1, marginTop: -26, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: "#FCFCF9", paddingHorizontal: 21, paddingTop: 10, paddingBottom: 15, overflow: "hidden", boxShadow: "0px -8px 25px rgba(16,40,48,.09)" }, sheetCompact: { paddingHorizontal: 17, paddingBottom: 10 }, grabber: { width: 37, height: 4, borderRadius: 3, backgroundColor: "#D9DDD9", alignSelf: "center", marginBottom: 12 }, kickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, vendorPill: { maxWidth: "66%", minHeight: 30, flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 4, paddingRight: 9, borderRadius: 12, backgroundColor: "#F0F2ED" }, vendorDot: { width: 24, height: 24, borderRadius: 9, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }, vendorInitial: { color: colors.green, fontSize: 9, fontWeight: "800" }, vendorPillText: { flexShrink: 1, color: colors.ink, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, vendorArrow: { color: colors.green, fontSize: 17, marginTop: -2 }, availability: { flexDirection: "row", alignItems: "center", gap: 5 }, availabilityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#31B77F" }, unavailableDot: { backgroundColor: "#AEB5B5" }, availabilityText: { color: colors.success, fontSize: 7, letterSpacing: .7, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" }, unavailableText: { color: colors.muted }, productName: { color: colors.ink, fontSize: 28, lineHeight: 33, letterSpacing: -.9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 12 }, productNameCompact: { fontSize: 24, lineHeight: 28, marginTop: 9 }, description: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 6 }, priceRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginTop: 9 }, price: { color: colors.green, fontSize: 22, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -.4 }, oldPrice: { color: "#9CA3A6", fontSize: 11, textDecorationLine: "line-through" }, taxText: { color: colors.muted, fontSize: 7 }, infoBar: { minHeight: 57, flexDirection: "row", alignItems: "center", borderRadius: 17, backgroundColor: "#F1F2EE", paddingHorizontal: 6, paddingVertical: 8, marginTop: 10 }, infoItem: { flex: 1, alignItems: "center", paddingHorizontal: 3 }, infoIcon: { color: colors.green, fontSize: 11 }, infoValue: { color: colors.ink, fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 2 }, infoLabel: { color: colors.muted, fontSize: 6, marginTop: 1 }, infoDivider: { width: 1, height: 29, backgroundColor: "#DADDD8" }, shopRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 9 }, shopRowPressed: { opacity: .75 }, shopMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }, shopMarkText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, shopName: { color: colors.ink, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, shopMeta: { color: colors.muted, fontSize: 7, marginTop: 3 }, shopArrow: { color: colors.green, fontSize: 24 }, spacer: { flex: 1, minHeight: 5 }, actionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 8 }, stepper: { height: 52, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: "#FFFFFF", paddingHorizontal: 4 }, stepButton: { width: 33, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" }, stepDisabled: { opacity: .32 }, stepText: { color: colors.ink, fontSize: 22, lineHeight: 24, fontWeight: "600" }, count: { minWidth: 20, color: colors.ink, fontSize: 12, textAlign: "center", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, addButton: { flex: 1, minHeight: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: colors.green, paddingHorizontal: 17, boxShadow: "0px 6px 16px rgba(217,79,50,.22)" }, addDisabled: { backgroundColor: "#AEB5B5", boxShadow: "none" }, addedButton: { backgroundColor: colors.success }, addPressed: { opacity: .88, transform: [{ scale: .985 }] }, addLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, addPrice: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  loadingSafe: { flex: 1, backgroundColor: "#F8F7F3" }, loadingBack: { position: "absolute", left: 20, top: 20, width: 45, height: 45, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, zIndex: 2 }, loadingContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }, loadingText: { color: colors.muted, fontSize: 11, marginTop: 15, fontWeight: "600" }, errorIcon: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }, errorIconText: { color: colors.green, fontSize: 27, fontWeight: "800" }, errorTitle: { color: colors.ink, fontSize: 21, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 15 }, errorCopy: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", maxWidth: 310, marginTop: 7 }, errorButton: { minHeight: 48, borderRadius: 15, backgroundColor: colors.navy, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 18 }, errorButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
