import { router } from "expo-router";
import { ShoppingCart } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSession } from "./session";
import { useAppTheme } from "./theme";
import { colors, money } from "./ui";

export function CartMark({ size = 20, dark = false }: { size?: number; dark?: boolean }) {
  return <View style={[c.mark, dark && c.markDark]}>
    <View style={c.markSpark} />
    <ShoppingCart size={size} strokeWidth={2.3} color={dark ? "#FFB89F" : colors.green} />
  </View>;
}

export function CartButton({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  const { cart } = useSession();
  const { darkMode } = useAppTheme();
  const count = cart.reduce((total, line) => total + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.product.pricePaise * line.quantity, 0);

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={count ? `Open cart with ${count} items` : "Open empty cart"}
    onPress={() => router.push("/basket")}
    hitSlop={8}
    style={({ pressed }) => [c.button, compact && c.compact, light && c.light, darkMode && c.buttonDark, pressed && c.pressed]}
  >
    <View style={c.iconWrap}>
      <CartMark size={compact ? 19 : 20} dark={darkMode} />
      {count > 0 && <View style={c.badge}><Text style={c.badgeText}>{count > 99 ? "99+" : count}</Text></View>}
    </View>
    {!compact && <View>
      <Text style={[c.label, darkMode && c.labelDark]}>{count ? "Your cart" : "Cart"}</Text>
      <Text style={[c.value, darkMode && c.valueDark]}>{count ? money(total) : "Ready when you are"}</Text>
    </View>}
  </Pressable>;
}

const c = StyleSheet.create({
  button: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 5px 16px rgba(24,50,61,0.10)" },
  compact: { width: 48, minHeight: 48, paddingHorizontal: 0, justifyContent: "center", borderRadius: 17 },
  light: { backgroundColor: "rgba(255,255,255,0.96)", borderColor: "rgba(255,255,255,0.75)" },
  buttonDark: { backgroundColor: "#1A292E", borderColor: "#304247" },
  pressed: { opacity: .82, transform: [{ scale: .96 }] },
  iconWrap: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  mark: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0E9", overflow: "hidden" },
  markDark: { backgroundColor: "#49342F" },
  markSpark: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#F6B473", position: "absolute", right: 4, top: 4 },
  badge: { position: "absolute", right: -8, top: -6, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, borderWidth: 2, borderColor: "#FFFFFF" },
  badgeText: { color: "#FFFFFF", fontSize: 8, lineHeight: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  label: { color: colors.ink, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  labelDark: { color: "#F4F6F3" },
  value: { color: colors.muted, fontSize: 8, marginTop: 2, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  valueDark: { color: "#A7B3B4" },
});
