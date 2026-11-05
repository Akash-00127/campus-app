import { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet, type ColorValue } from "react-native";

import { AppIcon } from "./app-icon";
import { colors } from "./ui";
export function NavIcon({ name, color, focused, count = 0 }: { name: "home" | "search" | "cart" | "orders" | "profile"; color: import('react-native').ColorValue; focused: boolean; count?: number }) {
  const badgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!count) return;
    badgeScale.setValue(0.72);
    Animated.spring(badgeScale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }).start();
  }, [badgeScale, count]);
  return <View style={[i.wrap, focused && i.active]}>
    <AppIcon name={name} color={typeof color === 'string' ? color : focused ? colors.green : colors.muted} active={focused} />
    {name === "cart" && count > 0 && <Animated.View style={[i.cartBadge, { transform: [{ scale: badgeScale }] }]}><Text numberOfLines={1} style={i.cartBadgeText}>{count > 99 ? "99+" : count}</Text></Animated.View>}
    {focused && <View style={[i.indicator, { backgroundColor: color }]} />}
  </View>;
}
const i = StyleSheet.create({
  wrap: { width: 48, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "visible" },
  active: { backgroundColor: colors.lime },
  indicator: { position: "absolute", bottom: -3, width: 12, height: 2, borderRadius: 2 },
  cartBadge: { position: "absolute", top: -4, right: -2, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, borderWidth: 1.5, borderColor: "#FFFFFF" },
  cartBadgeText: { color: "#FFFFFF", fontSize: 8, lineHeight: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
});
