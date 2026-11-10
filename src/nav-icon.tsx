import { BagSmileIcon as BagSmileActiveIcon } from "@solar-icons/react-native/bold-duotone/bag-smile";
import { BillListIcon as BillListActiveIcon } from "@solar-icons/react-native/bold-duotone/bill-list";
import { HeartIcon as HeartActiveIcon } from "@solar-icons/react-native/bold-duotone/heart";
import { HomeIcon as HomeActiveIcon } from "@solar-icons/react-native/bold-duotone/home";
import { ShopIcon as ShopActiveIcon } from "@solar-icons/react-native/bold-duotone/shop";
import { UserCircleIcon as UserActiveIcon } from "@solar-icons/react-native/bold-duotone/user-circle";
import { BagSmileIcon } from "@solar-icons/react-native/linear/bag-smile";
import { BillListIcon } from "@solar-icons/react-native/linear/bill-list";
import { HeartIcon } from "@solar-icons/react-native/linear/heart";
import { HomeIcon } from "@solar-icons/react-native/linear/home";
import { ShopIcon } from "@solar-icons/react-native/linear/shop";
import { UserCircleIcon } from "@solar-icons/react-native/linear/user-circle";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, type ColorValue } from "react-native";

const inactiveIcons = {
  home: HomeIcon,
  vendors: ShopIcon,
  cart: BagSmileIcon,
  likes: HeartIcon,
  orders: BillListIcon,
  profile: UserCircleIcon,
};

const activeIcons = {
  home: HomeActiveIcon,
  vendors: ShopActiveIcon,
  cart: BagSmileActiveIcon,
  likes: HeartActiveIcon,
  orders: BillListActiveIcon,
  profile: UserActiveIcon,
};

export function NavIcon({
  name,
  color,
  focused,
  count = 0,
}: {
  name: keyof typeof inactiveIcons;
  color: ColorValue;
  focused: boolean;
  count?: number;
}) {
  const badgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!count) return;
    badgeScale.setValue(0.72);
    Animated.spring(badgeScale, { toValue: 1, speed: 24, bounciness: 7, useNativeDriver: true }).start();
  }, [badgeScale, count]);

  const Icon = focused ? activeIcons[name] : inactiveIcons[name];
  return (
    <View style={[styles.wrap, focused && styles.active]}>
      <Icon size={23} color={String(color)} />
      {(name === "cart" || name === "likes") && count > 0 ? (
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
          <Text numberOfLines={1} style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </Animated.View>
      ) : null}
      {focused ? <View style={[styles.indicator, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 48, height: 32, borderRadius: 13, alignItems: "center", justifyContent: "center", overflow: "visible" },
  active: { backgroundColor: "#F2EEFF" },
  indicator: { position: "absolute", bottom: -3, width: 13, height: 2.5, borderRadius: 2 },
  badge: { position: "absolute", top: -4, right: -2, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FF9752", borderWidth: 1.5, borderColor: "#FFFFFF" },
  badgeText: { color: "#FFFFFF", fontSize: 8, lineHeight: 11, fontFamily: "PlusJakartaSans_800ExtraBold" },
});
