import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { mediaUrl, request, type Catalog, type Vendor } from "../../src/api";
import { useSession } from "../../src/session";
import { usePreferences } from "../../src/preferences";
import { ProductCard } from "../../src/storefront";
import { CartButton } from "../../src/cart-button";
import { EmptyState, Notice, Screen, ThemeContent, colors } from "../../src/ui";

type ShopFilter = "ALL" | "OPEN" | "TOP_RATED" | "FAST";

export default function Vendors() {
  const { session } = useSession();
  const { preferences, ready: preferencesReady } = usePreferences();
  const token = session!.accessToken;
  const [data, setData] = useState<Catalog>();
  const [search, setSearch] = useState("");
  const [searchData, setSearchData] = useState<Catalog>();
  const [filter, setFilter] = useState<ShopFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const requestId = useRef(0);
  const searchRequestId = useRef(0);

  useEffect(() => {
    if (!preferencesReady) return;
    setFilter(preferences.openNowByDefault ? "OPEN" : "ALL");
  }, [preferences.openNowByDefault, preferencesReady]);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const next = await request<Catalog>("/catalog?limit=1&page=1", token);
      if (current === requestId.current) setData(next);
    } catch (caught) {
      if (current === requestId.current) setError((caught as Error).message);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    if (!preferencesReady) return;
    void load();
    return () => { requestId.current += 1; };
  }, [load, preferencesReady]));

  useEffect(() => {
    if (!preferencesReady) return;
    const term = search.trim();
    if (!term) {
      searchRequestId.current += 1;
      setSearchData(undefined);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const current = ++searchRequestId.current;
    setSearchLoading(true);
    setSearchError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: term, limit: "30", page: "1", sort: "TOP_RATED" });
      if (preferences.vegetarianByDefault) params.set("vegetarian", "true");
      void request<Catalog>(`/catalog?${params}`, token)
        .then((next) => { if (current === searchRequestId.current) setSearchData(next); })
        .catch((caught) => { if (current === searchRequestId.current) setSearchError((caught as Error).message); })
        .finally(() => { if (current === searchRequestId.current) setSearchLoading(false); });
    }, 300);

    return () => {
      clearTimeout(timer);
      if (current === searchRequestId.current) searchRequestId.current += 1;
    };
  }, [preferences.vegetarianByDefault, preferencesReady, search, token]);

  const shops = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(data?.vendors || [])]
      .filter((shop) => !term || [shop.name, shop.description, shop.address].some((value) => value?.toLowerCase().includes(term)))
      .filter((shop) => filter !== "OPEN" || shop.acceptingOrders)
      .filter((shop) => term || filter !== "TOP_RATED" || (shop.rating || 0) >= 4)
      .filter((shop) => term || filter !== "FAST" || shop.preparationMinutes <= 20)
      .sort((a, b) => {
        if (!term && filter === "TOP_RATED") return (b.rating || 0) - (a.rating || 0);
        if (!term && filter === "FAST") return a.preparationMinutes - b.preparationMinutes;
        return Number(b.acceptingOrders) - Number(a.acceptingOrders) || a.name.localeCompare(b.name);
      });
  }, [data?.vendors, filter, search]);

  const openCount = data?.vendors.filter((shop) => shop.acceptingOrders).length || 0;
  const searching = Boolean(search.trim());

  async function loadMoreFood() {
    if (!searchData || loadingMore) return;
    setLoadingMore(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({ q: search.trim(), limit: "30", page: String(searchData.page + 1), sort: "TOP_RATED" });
      if (preferences.vegetarianByDefault) params.set("vegetarian", "true");
      const next = await request<Catalog>(`/catalog?${params}`, token);
      setSearchData({ ...next, products: [...searchData.products, ...next.products] });
    } catch (caught) {
      setSearchError((caught as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  return <Screen>
    <View style={v.hero}>
      <View style={v.heroGlow} />
      <View style={v.cartCorner}><CartButton compact light /></View>
      <Text style={v.eyebrow}>LOCAL TO YOUR CAMPUS</Text>
      <Text style={v.heroTitle}>Campus shops</Text>
      <Text style={v.heroCopy}>Your favourite food, drinks and daily essentials — all in one place.</Text>
      <View style={v.heroMeta}>
        <View style={v.liveDot} />
        <Text style={v.heroMetaText}>{loading ? "Finding nearby shops…" : `${openCount} open now · ${data?.vendors.length || 0} on campus`}</Text>
      </View>
    </View>

    <View style={v.searchBox}>
      <View style={v.searchGlyph}><View style={v.searchLens} /><View style={v.searchHandle} /></View>
      <TextInput accessibilityLabel="Search shops and food" value={search} onChangeText={setSearch} placeholder="Search shops and food" placeholderTextColor="#8A949B" returnKeyType="search" style={v.searchInput} />
      {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear shop and food search" onPress={() => setSearch("")} style={v.clear}><Text style={v.clearText}>×</Text></Pressable>}
    </View>

    {!searching && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={v.filters}>
      {([['ALL', 'All shops'], ['OPEN', 'Open now'], ['TOP_RATED', 'Top rated'], ['FAST', 'Under 20 min']] as [ShopFilter, string][]).map(([value, label]) =>
        <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => [v.filter, filter === value && v.filterActive, pressed && v.pressed]}>
          <Text style={[v.filterText, filter === value && v.filterTextActive]}>{label}</Text>
        </Pressable>)}
    </ScrollView>}

    {error && <Notice text={error} />}
    {searchError && <Notice text={searchError} />}
    <View style={v.sectionHead}>
      <View style={{ flex: 1 }}><Text style={v.sectionTitle}>{searching ? "Search results" : "Explore every shop"}</Text><Text style={v.sectionCopy}>{searching ? searchLoading || loading ? "Searching shops and every campus menu…" : `${shops.length} ${shops.length === 1 ? "shop" : "shops"} · ${searchData?.total || 0} ${(searchData?.total || 0) === 1 ? "dish" : "dishes"} for “${search.trim()}”` : loading ? "Loading the best on campus" : `${shops.length} ${shops.length === 1 ? "shop" : "shops"} ready to explore`}</Text></View>
      {(searching || filter !== "ALL") && <Pressable onPress={() => { setSearch(""); setFilter("ALL"); }}><Text style={v.reset}>Reset</Text></Pressable>}
    </View>

    {searching ? <>
      <View style={v.resultLabelRow}><Text style={v.resultLabel}>MATCHING SHOPS</Text><Text style={v.resultTotal}>{loading ? "…" : shops.length}</Text></View>
      {loading ? <ShopSkeleton count={1} /> : shops.map((shop) => <ShopCard key={shop.id} shop={shop} featured={false} />)}
      {!loading && !shops.length && <View style={v.noShopMatch}><Text style={v.noShopIcon}>⌂</Text><View style={{ flex: 1 }}><Text style={v.noShopTitle}>No shop name matched</Text><Text style={v.noShopCopy}>Food results from all campus shops are still shown below.</Text></View></View>}
      <View style={v.resultLabelRow}><Text style={v.resultLabel}>MATCHING FOOD</Text><Text style={v.resultTotal}>{searchLoading ? "…" : searchData?.total || 0}</Text></View>
      {searchLoading ? <FoodSkeleton /> : <View style={v.productGrid}>{searchData?.products.map((product) => <ProductCard key={product.id} product={product} enabled={searchData.campus.serviceEnabled} />)}</View>}
      {!searchLoading && searchData && !searchData.products.length && <EmptyState symbol="⌕" title="No food found yet" description="Try another dish, ingredient, or shop name to search every campus menu." />}
      {searchData && searchData.products.length < searchData.total && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={() => void loadMoreFood()} style={({ pressed }) => [v.moreButton, pressed && v.pressed, loadingMore && v.moreButtonDisabled]}><Text style={v.moreButtonText}>{loadingMore ? "Loading more food…" : "Show more food"}</Text></Pressable>}
    </> : <>
      {loading ? <ShopSkeleton /> : shops.map((shop, index) => <ShopCard key={shop.id} shop={shop} featured={index === 0 && filter === "ALL"} />)}
      {!loading && !shops.length && <EmptyState symbol="⌂" title="No shops match yet" description="Clear a filter to see more campus shops." />}
    </>}
  </Screen>;
}

function ShopCard({ shop, featured }: { shop: Vendor; featured: boolean }) {
  const picture = shop.coverImage || shop.logo;
  return <ThemeContent><Pressable accessibilityRole="button" accessibilityLabel={`Open ${shop.name}`} onPress={() => router.push(`/vendor/${shop.id}`)} style={({ pressed }) => [v.card, pressed && v.cardPressed]}>
    <View style={v.picture}>
      {picture ? <Image source={{ uri: mediaUrl(picture) }} resizeMode="cover" style={v.image} /> : <View style={v.placeholder}><View style={v.placeholderBadge}><Text style={v.placeholderInitial}>{shop.name.slice(0, 1).toUpperCase()}</Text></View><Text style={v.placeholderText}>CAMPUS FAVOURITE</Text></View>}
      <View style={v.imageShade} />
      {featured && <View style={v.featured}><Text style={v.featuredText}>FEATURED</Text></View>}
      <View style={[v.status, shop.acceptingOrders ? v.statusOpen : v.statusClosed]}><View style={[v.statusDot, { backgroundColor: shop.acceptingOrders ? "#36C98F" : "#AAB0B4" }]} /><Text style={v.statusText}>{shop.acceptingOrders ? "OPEN" : "CLOSED"}</Text></View>
    </View>
    <View style={v.cardBody}>
      <View style={v.nameRow}><View style={{ flex: 1 }}><Text numberOfLines={1} style={v.shopName}>{shop.name}</Text><Text numberOfLines={2} style={v.description}>{shop.description || "Fresh campus favourites, made for you."}</Text></View><View style={v.arrow}><Text style={v.arrowText}>›</Text></View></View>
      <View style={v.details}>
        <View style={v.detailPill}><Text style={v.star}>★</Text><Text style={v.detailText}>{shop.rating ? shop.rating.toFixed(1) : "New"}{shop.reviewCount ? ` (${shop.reviewCount})` : ""}</Text></View>
        <View style={v.detailPill}><Text style={v.clock}>◷</Text><Text style={v.detailText}>{shop.preparationMinutes} min</Text></View>
        {shop.codEnabled && <View style={v.detailPill}><Text style={v.detailText}>Cash on delivery</Text></View>}
      </View>
      <Text numberOfLines={1} style={v.address}>⌖  {shop.address || "On campus"}</Text>
    </View>
  </Pressable></ThemeContent>;
}

function ShopSkeleton({ count = 3 }: { count?: number }) {
  return <ThemeContent>{Array.from({ length: count }, (_, item) => <View key={item} style={v.skeleton}><View style={v.skeletonImage} /><View style={v.skeletonBody}><View style={v.skeletonLine} /><View style={[v.skeletonLine, { width: "62%" }]} /><View style={v.skeletonPills} /></View></View>)}</ThemeContent>;
}

function FoodSkeleton() {
  return <ThemeContent><View style={v.productGrid}>{[0, 1, 2, 3].map((item) => <View key={item} style={v.foodSkeleton}><View style={v.foodSkeletonImage} /><View style={v.foodSkeletonLine} /><View style={[v.foodSkeletonLine, { width: "58%" }]} /><View style={v.foodSkeletonButton} /></View>)}</View></ThemeContent>;
}

const v = StyleSheet.create({
  hero: { minHeight: 222, borderRadius: 28, padding: 24, backgroundColor: colors.navy, overflow: "hidden", justifyContent: "center", marginBottom: -29 }, heroGlow: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "#335B62", right: -88, top: -92, opacity: .65 }, cartCorner: { position: "absolute", right: 18, top: 18, zIndex: 2 }, eyebrow: { color: "#FFB89F", fontSize: 9, letterSpacing: 1.8, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 9 }, heroTitle: { color: "#FFFFFF", fontSize: 35, letterSpacing: -1.2, lineHeight: 40, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, heroCopy: { color: "#D5E0E2", fontSize: 12, lineHeight: 19, maxWidth: 310, marginTop: 8, fontFamily: "PlusJakartaSans_500Medium" }, heroMeta: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 7 }, liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#51D5A1" }, heroMetaText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  searchBox: { minHeight: 60, marginHorizontal: 13, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: "#E8E6DF", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, boxShadow: "0px 8px 22px rgba(24,50,61,0.12)" }, searchInput: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, color: colors.ink, fontSize: 13, fontFamily: "PlusJakartaSans_500Medium" }, searchGlyph: { width: 20, height: 20 }, searchLens: { width: 14, height: 14, borderRadius: 8, borderWidth: 1.8, borderColor: colors.green }, searchHandle: { position: "absolute", width: 7, height: 2, backgroundColor: colors.green, right: 0, bottom: 2, borderRadius: 2, transform: [{ rotate: "45deg" }] }, clear: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }, clearText: { color: colors.muted, fontSize: 19, lineHeight: 22 },
  filters: { paddingTop: 19, paddingBottom: 5, paddingRight: 8, gap: 8 }, filter: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.ink, borderColor: colors.ink }, filterText: { color: colors.ink, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, filterTextActive: { color: "#FFFFFF" }, pressed: { opacity: .78, transform: [{ scale: .97 }] },
  sectionHead: { marginTop: 22, marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }, sectionTitle: { color: colors.ink, fontSize: 22, letterSpacing: -.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, sectionCopy: { color: colors.muted, fontSize: 10, marginTop: 4 }, reset: { color: colors.green, fontSize: 11, fontWeight: "800", padding: 8 },
  resultLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 11 }, resultLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, resultTotal: { minWidth: 25, height: 25, borderRadius: 9, backgroundColor: colors.lime, color: colors.green, textAlign: "center", textAlignVertical: "center", paddingTop: 6, fontSize: 9, fontWeight: "800", overflow: "hidden" }, noShopMatch: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 8 }, noShopIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.lime, color: colors.green, textAlign: "center", textAlignVertical: "center", paddingTop: 8, fontSize: 15, overflow: "hidden" }, noShopTitle: { color: colors.ink, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, noShopCopy: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, moreButton: { minHeight: 52, borderRadius: 16, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, marginTop: 2 }, moreButtonDisabled: { opacity: .55 }, moreButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, foodSkeleton: { width: "48%", borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 16 }, foodSkeletonImage: { height: 150, borderRadius: 14, backgroundColor: "#E9ECE8" }, foodSkeletonLine: { height: 10, width: "80%", borderRadius: 5, backgroundColor: "#ECEEEA", marginTop: 11 }, foodSkeletonButton: { height: 35, borderRadius: 11, backgroundColor: "#F1F2EF", marginTop: 13 },
  card: { borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: "hidden", marginBottom: 17, boxShadow: "0px 6px 20px rgba(24,50,61,0.065)" }, cardPressed: { opacity: .92, transform: [{ scale: .99 }] }, picture: { height: 178, backgroundColor: "#E9EEE9" }, image: { width: "100%", height: "100%" }, imageShade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(13,35,42,0.08)" }, placeholder: { flex: 1, backgroundColor: "#E7ECE8", alignItems: "center", justifyContent: "center" }, placeholderBadge: { width: 68, height: 68, borderRadius: 23, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 14px rgba(24,50,61,0.08)" }, placeholderInitial: { color: colors.green, fontSize: 30, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, placeholderText: { color: "#74827A", fontSize: 8, letterSpacing: 1.4, fontWeight: "800", marginTop: 9 }, featured: { position: "absolute", left: 12, top: 12, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "#FFD985" }, featuredText: { color: colors.navy, fontSize: 8, letterSpacing: .9, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" }, status: { position: "absolute", right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }, statusOpen: { backgroundColor: "rgba(24,50,61,.90)" }, statusClosed: { backgroundColor: "rgba(73,78,81,.90)" }, statusDot: { width: 6, height: 6, borderRadius: 3 }, statusText: { color: "#FFFFFF", fontSize: 8, letterSpacing: .8, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  cardBody: { padding: 17 }, nameRow: { flexDirection: "row", alignItems: "center", gap: 12 }, shopName: { color: colors.ink, fontSize: 18, letterSpacing: -.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, description: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 4 }, arrow: { width: 37, height: 37, borderRadius: 13, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }, arrowText: { color: colors.green, fontSize: 27, lineHeight: 29, marginTop: -2 }, details: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 }, detailPill: { borderRadius: 10, backgroundColor: "#F3F3EF", paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 4 }, detailText: { color: colors.ink, fontSize: 9, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, star: { color: colors.orange, fontSize: 10 }, clock: { color: colors.green, fontSize: 12 }, address: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 12, color: colors.muted, fontSize: 9, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  skeleton: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginBottom: 17 }, skeletonImage: { height: 172, backgroundColor: "#E9ECE8" }, skeletonBody: { padding: 17 }, skeletonLine: { height: 11, width: "82%", borderRadius: 6, backgroundColor: "#ECEEEA", marginBottom: 9 }, skeletonPills: { height: 28, width: "45%", borderRadius: 10, backgroundColor: "#F1F2EF", marginTop: 4 },
});
