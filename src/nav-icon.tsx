import { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet, type ViewStyle } from "react-native";

/** Small geometric icons keep the tab bar consistent across system fonts. */
export function NavIcon({ name, color, focused, count = 0 }: { name: "home" | "vendors" | "cart" | "likes" | "orders" | "profile"; color: ViewStyle["borderColor"]; focused: boolean; count?: number }) {
  const badgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!count) return;
    badgeScale.setValue(0.72);
    Animated.spring(badgeScale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }).start();
  }, [badgeScale, count]);
  return <View style={[i.wrap, focused && i.active]}>
    {name === "home" && <View><View style={[i.roof, { borderColor: color }]} /><View style={[i.house, { borderColor: color }]}><View style={[i.door, { backgroundColor: color }]} /></View></View>}
    {name === "vendors" && <View style={i.store}><View style={[i.awning, { borderColor: color }]}><View style={[i.awningStripe, { borderColor: color }]} /></View><View style={[i.storeBody, { borderColor: color }]}><View style={[i.storeDoor, { backgroundColor: color }]} /><View style={[i.storeWindow, { borderColor: color }]} /></View></View>}
    {name === "cart" && <View><View style={[i.handle, { borderColor: color }]} /><View style={[i.bag, { borderColor: color }]} /></View>}
    {name === "likes" && <Text style={[i.heart, { color }]}>{focused ? "♥" : "♡"}</Text>}
    {name === "orders" && <View style={[i.receipt, { borderColor: color }]}>{[0, 1, 2].map(line => <View key={line} style={[i.line, { backgroundColor: color }]} />)}</View>}
    {name === "profile" && <View style={i.person}><View style={[i.head, { borderColor: color }]} /><View style={[i.shoulders, { borderColor: color }]} /></View>}
    {name === "cart" && count > 0 && <Animated.View style={[i.cartBadge, { transform: [{ scale: badgeScale }] }]}><Text numberOfLines={1} style={i.cartBadgeText}>{count > 99 ? "99+" : count}</Text></Animated.View>}
    {name === "likes" && count > 0 && <Animated.View style={[i.cartBadge, { transform: [{ scale: badgeScale }] }]}><Text numberOfLines={1} style={i.cartBadgeText}>{count > 99 ? "99+" : count}</Text></Animated.View>}
    {focused && <View style={[i.indicator, { backgroundColor: color }]} />}
  </View>;
}
const i = StyleSheet.create({
  wrap: { width: 48, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "visible" },
  active: { backgroundColor: "#FFF0E9" },
  indicator: { position: "absolute", bottom: -3, width: 12, height: 2, borderRadius: 2 },
  cartBadge: { position: "absolute", top: -4, right: -2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#D94F32", borderWidth: 1.5, borderColor: "#FFFFFF" },
  cartBadgeText: { color: "#FFFFFF", fontSize: 8, lineHeight: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  roof: { width: 14, height: 14, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: "45deg" }], marginBottom: -8, marginLeft: 2 },
  store: { width: 23, height: 23, alignItems: "center" }, awning: { width: 22, height: 8, borderWidth: 2, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 }, awningStripe: { position: "absolute", left: 6, top: -2, width: 6, height: 8, borderLeftWidth: 2, borderRightWidth: 2 }, storeBody: { width: 18, height: 14, borderWidth: 2, borderTopWidth: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingHorizontal: 2 }, storeDoor: { width: 4, height: 8, borderTopLeftRadius: 1, borderTopRightRadius: 1 }, storeWindow: { width: 5, height: 5, borderWidth: 1.5, alignSelf: "center" },
  house: { width: 18, height: 15, borderWidth: 2, borderTopWidth: 0, borderRadius: 3, alignItems: "center", justifyContent: "flex-end" },
  door: { width: 4, height: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  handle: { width: 10, height: 7, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5, alignSelf: "center" },
  bag: { width: 20, height: 16, borderWidth: 2, borderRadius: 4 },
  heart: { fontSize: 25, lineHeight: 27, fontWeight: "700" },
  receipt: { width: 18, height: 23, borderWidth: 2, borderRadius: 4, gap: 3, padding: 3, justifyContent: "center" },
  line: { height: 2, borderRadius: 1, width: 8 },
  person: { alignItems: "center", gap: 3 }, head: { width: 10, height: 10, borderWidth: 2, borderRadius: 5 },
  shoulders: { width: 20, height: 10, borderWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
