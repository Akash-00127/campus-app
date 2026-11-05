import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { request, type Catalog } from "../../src/api";
import { useSession } from "../../src/session";
import { ProductCard } from "../../src/storefront";
import { Button, EmptyState, Notice, Screen, Title, colors, s } from "../../src/ui";

type Sort = "NAME" | "TOP_RATED" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
type Price = "ANY" | "99" | "199";

export default function Search() {
  const { session } = useSession();
  const token = session!.accessToken;
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<Sort>("NAME");
  const [price, setPrice] = useState<Price>("ANY");
  const [vegetarian, setVegetarian] = useState(false);
  const [available, setAvailable] = useState(false);
  const [lateNight, setLateNight] = useState(false);
  const [data, setData] = useState<Catalog>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const catalogPath = useCallback((page = 1) => {
    const params = new URLSearchParams({ page: String(page), limit: "30", sort });
    if (query) params.set("q", query);
    if (category) params.set("categoryId", category);
    if (price !== "ANY") params.set("maxPricePaise", String(Number(price) * 100));
    if (vegetarian) params.set("vegetarian", "true");
    if (available || lateNight) params.set("openOnly", "true");
    return `/catalog?${params}`;
  }, [available, category, lateNight, price, query, sort, vegetarian]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await request<Catalog>(catalogPath(), token)); }
    catch (caught) { setError((caught as Error).message); }
    finally { setLoading(false); }
  }, [catalogPath, token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = Boolean(query || category || price !== "ANY" || vegetarian || available || lateNight || sort !== "NAME");
  function clearFilters() { setText(""); setQuery(""); setCategory(""); setPrice("ANY"); setVegetarian(false); setAvailable(false); setLateNight(false); setSort("NAME"); }

  return <Screen>
    <Title eyebrow="DISCOVER YOUR CAMPUS" title="Find your next craving" subtitle="Search dishes and vendors, then narrow the results to what works right now." />
    <View style={x.search}><Text style={x.searchIcon}>⌕</Text><TextInput autoFocus={false} accessibilityLabel="Search by food or vendor" value={text} onChangeText={setText} placeholder="Search food or vendor" placeholderTextColor="#9299A7" returnKeyType="search" style={x.searchInput} />{!!text && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText("")} style={x.clear}><Text style={x.clearText}>×</Text></Pressable>}</View>
    {error && <Notice text={error} />}

    <Text style={x.label}>CATEGORIES</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.row}>
      {[{ id: "", name: "All food" }, ...(data?.categories || [])].map((item) => <Pressable key={item.id || "all"} accessibilityRole="button" accessibilityState={{ selected: category === item.id }} onPress={() => setCategory(item.id)} style={({ pressed }) => [x.chip, category === item.id && x.chipActive, pressed && x.pressed]}><Text style={[x.chipText, category === item.id && x.chipTextActive]}>{item.name}</Text></Pressable>)}
    </ScrollView>

    <Text style={x.label}>FILTERS</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.row}>
      <Filter label="Vegetarian" selected={vegetarian} onPress={() => setVegetarian((value) => !value)} />
      <Filter label="Available now" selected={available} onPress={() => setAvailable((value) => !value)} />
      <Filter label="Late night" selected={lateNight} onPress={() => setLateNight((value) => !value)} />
      <Filter label="Under ₹99" selected={price === "99"} onPress={() => setPrice((value) => value === "99" ? "ANY" : "99")} />
      <Filter label="Under ₹199" selected={price === "199"} onPress={() => setPrice((value) => value === "199" ? "ANY" : "199")} />
    </ScrollView>

    <Text style={x.label}>SORT BY</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={x.row}>
      {([ ["NAME", "Recommended"], ["TOP_RATED", "Top rated"], ["PRICE_ASC", "Price: low"], ["PRICE_DESC", "Price: high"], ["NEWEST", "Newest"] ] as [Sort, string][]).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)} style={({ pressed }) => [x.sort, sort === value && x.sortActive, pressed && x.pressed]}><Text style={[x.sortText, sort === value && x.sortTextActive]}>{label}</Text></Pressable>)}
    </ScrollView>

    <View style={x.resultHeader}><View><Text style={x.resultTitle}>{query ? `Results for “${query}”` : "Campus menu"}</Text><Text style={x.resultCount}>{loading ? "Finding the best matches…" : `${data?.total || 0} items found`}</Text></View>{filtered && <Pressable accessibilityRole="button" onPress={clearFilters}><Text style={x.reset}>Reset</Text></Pressable>}</View>
    {loading ? <DiscoverySkeleton /> : <View style={x.grid}>{data?.products.map((product) => <ProductCard key={product.id} product={product} enabled={data.campus.serviceEnabled} />)}</View>}
    {!loading && data && !data.products.length && <EmptyState symbol="⌕" title="No campus matches yet" description="Try another dish, vendor, category, or remove one of the filters." />}
    {data && data.products.length < data.total && <Button secondary disabled={busy} onPress={() => { setBusy(true); request<Catalog>(catalogPath(data.page + 1), token).then((next) => setData({ ...next, products: [...data.products, ...next.products] })).catch((caught) => setError(caught.message)).finally(() => setBusy(false)); }}>{busy ? "Loading more…" : "Load more results"}</Button>}
  </Screen>;
}

function Filter({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [x.filter, selected && x.filterActive, pressed && x.pressed]}><View style={[x.filterDot, selected && x.filterDotActive]}>{selected && <Text style={x.filterCheck}>✓</Text>}</View><Text style={[x.filterText, selected && x.filterTextActive]}>{label}</Text></Pressable>; }
function DiscoverySkeleton() { return <View style={x.grid}>{[0, 1, 2, 3].map((item) => <View key={item} style={x.skeleton}><View style={x.skeletonImage} /><View style={x.skeletonLine} /><View style={[x.skeletonLine, { width: "58%" }]} /><View style={x.skeletonButton} /></View>)}</View>; }

const x = StyleSheet.create({
  search: { minHeight: 58, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1.5, borderColor: "#FFD1C0", borderRadius: 18, paddingHorizontal: 15, shadowColor: colors.green, shadowOpacity: .06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }, searchIcon: { color: colors.green, fontSize: 24, marginRight: 10 }, searchInput: { flex: 1, color: colors.ink, fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", paddingVertical: 15 }, clear: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }, clearText: { color: colors.muted, fontSize: 20 },
  label: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 22, marginBottom: 10 }, row: { gap: 8, paddingRight: 8 }, chip: { minHeight: 39, justifyContent: "center", paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, chipActive: { backgroundColor: colors.lime, borderColor: "#FFB99F" }, chipText: { color: colors.ink, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, chipTextActive: { color: colors.green },
  filter: { minHeight: 39, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.navy, borderColor: colors.navy }, filterDot: { width: 15, height: 15, borderRadius: 5, borderWidth: 1.5, borderColor: "#B9C0CC", alignItems: "center", justifyContent: "center" }, filterDotActive: { borderColor: colors.orange, backgroundColor: colors.orange }, filterCheck: { color: colors.navy, fontSize: 9, fontWeight: "900" }, filterText: { color: colors.ink, fontSize: 10, fontWeight: "700" }, filterTextActive: { color: "white" },
  sort: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, sortActive: { backgroundColor: colors.lime, borderColor: "#FFB99F" }, sortText: { color: colors.muted, fontSize: 10, fontWeight: "700" }, sortTextActive: { color: colors.green }, pressed: { opacity: .75, transform: [{ scale: .97 }] }, resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 29, marginBottom: 16 }, resultTitle: { color: colors.ink, fontSize: 20, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -.5 }, resultCount: { color: colors.muted, fontSize: 10, marginTop: 4 }, reset: { color: colors.green, fontSize: 11, fontWeight: "800", padding: 8 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  skeleton: { width: "48%", borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 16 }, skeletonImage: { height: 150, borderRadius: 14, backgroundColor: "#ECEFF4" }, skeletonLine: { height: 10, width: "80%", borderRadius: 5, backgroundColor: "#ECEFF4", marginTop: 11 }, skeletonButton: { height: 35, borderRadius: 11, backgroundColor: "#F3F4F7", marginTop: 13 },
});
