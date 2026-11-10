import { useState } from "react";
import { router } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Product } from "./api";
import { useSession } from "./session";
import { colors, ThemeContent } from "./ui";

type BuyNowChoice = {
  product: Product;
  quantity: number;
  cartItemCount: number;
};

export function useBuyNow() {
  const { cart, beginBuyNow } = useSession();
  const [choice, setChoice] = useState<BuyNowChoice | null>(null);

  const openCheckout = (product: Product, quantity: number, includeCart: boolean) => {
    beginBuyNow(product, quantity, includeCart);
    setChoice(null);
    router.push({ pathname: "/basket", params: { checkout: "buy-now" } });
  };

  const buyNow = (product: Product, quantity = 1) => {
    if (!cart.length) {
      openCheckout(product, quantity, false);
      return;
    }
    setChoice({
      product,
      quantity,
      cartItemCount: cart.reduce((total, line) => total + line.quantity, 0),
    });
  };

  const buyNowDialog = <Modal
    animationType="fade"
    onRequestClose={() => setChoice(null)}
    statusBarTranslucent
    transparent
    visible={Boolean(choice)}
  >
    <View style={d.layer}>
      <Pressable accessibilityLabel="Cancel buy now" onPress={() => setChoice(null)} style={d.backdrop} />
      {choice && <ThemeContent><View accessibilityRole="alert" accessibilityViewIsModal style={d.card}>
        <View style={d.handle} />
        <Text style={d.eyebrow}>BUY NOW</Text>
        <Text style={d.title}>Choose what to buy</Text>
        <Text style={d.copy}>{`Buy only ${choice.product.name}, or include all ${choice.cartItemCount === 1 ? "1 item" : `${choice.cartItemCount} items`} already in your cart? Items from different shops will be placed as separate orders.`}</Text>
        <View style={d.actions}>
          <Pressable accessibilityRole="button" onPress={() => openCheckout(choice.product, choice.quantity, false)} style={({ pressed }) => [d.option, pressed && d.pressed]}>
            <Text style={d.optionTitle}>Only this item</Text>
            <Text style={d.optionCopy}>Keep your current cart saved</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => openCheckout(choice.product, choice.quantity, true)} style={({ pressed }) => [d.option, d.optionPrimary, pressed && d.pressed]}>
            <Text style={d.optionPrimaryTitle}>Buy with cart · {choice.cartItemCount}</Text>
            <Text style={d.optionPrimaryCopy}>Checkout everything together</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setChoice(null)} style={({ pressed }) => [d.cancel, pressed && d.pressed]}><Text style={d.cancelText}>Cancel</Text></Pressable>
      </View></ThemeContent>}
    </View>
  </Modal>;

  return { buyNow, buyNowDialog };
}

const d = StyleSheet.create({
  layer: { flex: 1, alignItems: "center", justifyContent: "flex-end", padding: 18 },
  backdrop: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(9, 25, 31, .55)" },
  card: { width: "100%", maxWidth: 520, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 20, boxShadow: "0px 12px 30px rgba(9,25,31,.24)" },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: "#D9DDD9", marginBottom: 16 },
  eyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  title: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 5 },
  copy: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  actions: { gap: 9, marginTop: 18 },
  option: { minHeight: 58, justifyContent: "center", borderRadius: 16, backgroundColor: colors.lime, borderWidth: 1, borderColor: "#F1CDBC", paddingHorizontal: 16 },
  optionPrimary: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionTitle: { color: colors.green, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  optionCopy: { color: colors.muted, fontSize: 9, marginTop: 3 },
  optionPrimaryTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  optionPrimaryCopy: { color: "#D4E2E1", fontSize: 9, marginTop: 3 },
  cancel: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 7 },
  cancelText: { color: colors.muted, fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  pressed: { opacity: .78, transform: [{ scale: .985 }] },
});
