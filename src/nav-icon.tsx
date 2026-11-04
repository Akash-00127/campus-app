import { View, StyleSheet, type ViewStyle } from "react-native";

/** Small geometric icons keep the tab bar consistent across system fonts. */
export function NavIcon({ name, color, focused }: { name: "home" | "cart" | "orders" | "profile"; color: ViewStyle["borderColor"]; focused: boolean }) {
  return <View style={[i.wrap, focused && i.active]}>
    {name === "home" && <View><View style={[i.roof, { borderColor: color }]} /><View style={[i.house, { borderColor: color }]}><View style={[i.door, { backgroundColor: color }]} /></View></View>}
    {name === "cart" && <View><View style={[i.handle, { borderColor: color }]} /><View style={[i.bag, { borderColor: color }]} /></View>}
    {name === "orders" && <View style={[i.receipt, { borderColor: color }]}>{[0, 1, 2].map(line => <View key={line} style={[i.line, { backgroundColor: color }]} />)}</View>}
    {name === "profile" && <View style={i.person}><View style={[i.head, { borderColor: color }]} /><View style={[i.shoulders, { borderColor: color }]} /></View>}
  </View>;
}
const i = StyleSheet.create({
  wrap: { width: 48, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: "#FFF0E8" },
  roof: { width: 14, height: 14, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: "45deg" }], marginBottom: -8, marginLeft: 2 },
  house: { width: 18, height: 15, borderWidth: 2, borderTopWidth: 0, borderRadius: 3, alignItems: "center", justifyContent: "flex-end" },
  door: { width: 4, height: 7, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  handle: { width: 10, height: 7, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5, alignSelf: "center" },
  bag: { width: 20, height: 16, borderWidth: 2, borderRadius: 4 },
  receipt: { width: 18, height: 23, borderWidth: 2, borderRadius: 4, gap: 3, padding: 3, justifyContent: "center" },
  line: { height: 2, borderRadius: 1, width: 8 },
  person: { alignItems: "center", gap: 3 }, head: { width: 10, height: 10, borderWidth: 2, borderRadius: 5 },
  shoulders: { width: 20, height: 10, borderWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
