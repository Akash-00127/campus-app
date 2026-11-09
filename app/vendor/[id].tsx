import { useEffect, useMemo, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { mediaUrl, request, type Catalog, type Product, type Vendor } from "../../src/api";
import { useSession } from "../../src/session";
import { usePreferences } from "../../src/preferences";
import { ProductCard } from "../../src/storefront";
import { CartButton } from "../../src/cart-button";
import { EmptyState, Notice, Screen, ThemeContent, colors } from "../../src/ui";

type MenuFilter = "ALL" | "VEG" | "AVAILABLE";
type MenuSort = "FEATURED" | "PRICE_ASC" | "PRICE_DESC" | "NAME";
type ReviewData = { items: { id: string; rating: number; comment: string }[]; count: number; rating: number | null };

export default function VendorPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { preferences, ready: preferencesReady } = usePreferences();
  const [data, setData] = useState<Catalog>();
  const [reviews, setReviews] = useState<ReviewData>({ items: [], count: 0, rating: null });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState<MenuFilter>("ALL");
  const [sort, setSort] = useState<MenuSort>("FEATURED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadId = useRef(0);

  useEffect(() => {
    if (!preferencesReady) return;
    setFilter(preferences.vegetarianByDefault ? "VEG" : "ALL");
  }, [preferences.vegetarianByDefault, preferencesReady]);

  useEffect(() => {
    if (!session || !id) return;
    const current = ++loadId.current;
    setLoading(true);
    setError("");

    async function load() {
      try {
        const first = await request<Catalog>(`/catalog?vendorId=${id}&limit=100&page=1`, session!.accessToken);
        const pageSize = Math.max(first.products.length, 1);
        const pageCount = Math.min(50, Math.ceil(first.total / pageSize));
        const rest = pageCount > 1
          ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => request<Catalog>(`/catalog?vendorId=${id}&limit=100&page=${index + 2}`, session!.accessToken)))
          : [];
        const products = [...first.products, ...rest.flatMap((page) => page.products)].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index);
        const reviewData = await request<ReviewData>(`/vendors/${id}/reviews`, session!.accessToken).catch(() => ({ items: [], count: 0, rating: null }));
        if (current === loadId.current) {
          setData({ ...first, products, total: products.length });
          setReviews(reviewData);
        }
      } catch (caught) {
        if (current === loadId.current) setError((caught as Error).message);
      } finally {
        if (current === loadId.current) setLoading(false);
      }
    }

    void load();
    return () => { loadId.current += 1; };
  }, [id, session]);

  const vendor = data?.vendors.find((item) => item.id === id);
  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(data?.products || [])]
      .filter((product) => !term || [product.name, product.description, product.category?.name].some((value) => value?.toLowerCase().includes(term)))
      .filter((product) => !category || product.category?.id === category)
      .filter((product) => filter !== "VEG" || product.vegetarian)
      .filter((product) => filter !== "AVAILABLE" || (product.available && product.stock !== 0))
      .sort((a, b) => sortProducts(a, b, sort));
  }, [category, data?.products, filter, search, sort]);

  const hasFilters = Boolean(search || category || filter !== "ALL" || sort !== "FEATURED");
  const reset = () => { setSearch(""); setCategory(""); setFilter("ALL"); setSort("FEATURED"); };

  return <Screen backgroundColor="#F7F6F1">
    <VendorHero vendor={vendor} reviews={reviews} loading={loading} />
    {error && <Notice text={error} />}

    {vendor && data && <>
      {!vendor.acceptingOrders && <View style={m.closedNotice}><View style={m.closedIcon}><Text style={m.closedIconText}>◷</Text></View><View style={{ flex: 1 }}><Text style={m.closedTitle}>Shop is taking a short break</Text><Text style={m.closedCopy}>You can browse the full menu now and return when orders reopen.</Text></View></View>}

      <View style={m.menuHeading}>
        <View><Text style={m.menuEyebrow}>FULL MENU</Text><Text style={m.menuTitle}>What are you craving?</Text><Text style={m.menuCount}>{data.products.length} {data.products.length === 1 ? "item" : "items"} from this shop</Text></View>
        {hasFilters && <Pressable accessibilityRole="button" onPress={reset}><Text style={m.reset}>Reset</Text></Pressable>}
      </View>

      <View style={m.searchBox}>
        <View style={m.searchGlyph}><View style={m.searchLens} /><View style={m.searchHandle} /></View>
        <TextInput accessibilityLabel={`Search ${vendor.name} menu`} value={search} onChangeText={setSearch} placeholder="Search this shop's menu" placeholderTextColor="#8C9599" returnKeyType="search" style={m.searchInput} />
        {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear menu search" onPress={() => setSearch("")} style={m.clear}><Text style={m.clearText}>×</Text></Pressable>}
      </View>

      <Text style={m.controlLabel}>BROWSE BY CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.chipRow}>
        {[{ id: "", name: "All items" }, ...data.categories].map((item) => <Pressable key={item.id || "all"} accessibilityRole="button" accessibilityState={{ selected: category === item.id }} onPress={() => setCategory(item.id)} style={({ pressed }) => [m.category, category === item.id && m.categoryActive, pressed && m.pressed]}><Text style={[m.categoryText, category === item.id && m.categoryTextActive]}>{item.name}</Text></Pressable>)}
      </ScrollView>

      <View style={m.filterTop}><Text style={m.controlLabel}>FILTER & SORT</Text><Text style={m.matchCount}>{products.length} shown</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.chipRow}>
        {([['ALL', 'Everything'], ['VEG', '●  Veg only'], ['AVAILABLE', 'Available now']] as [MenuFilter, string][]).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => [m.filter, filter === value && m.filterActive, pressed && m.pressed]}><Text style={[m.filterText, filter === value && m.filterTextActive]}>{label}</Text></Pressable>)}
        <View style={m.chipDivider} />
        {([['FEATURED', 'Recommended'], ['PRICE_ASC', 'Price: low'], ['PRICE_DESC', 'Price: high'], ['NAME', 'A–Z']] as [MenuSort, string][]).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)} style={({ pressed }) => [m.sort, sort === value && m.sortActive, pressed && m.pressed]}><Text style={[m.sortText, sort === value && m.sortTextActive]}>{label}</Text></Pressable>)}
      </ScrollView>

      <View style={m.resultsHead}><Text style={m.resultsTitle}>{search ? `Results for “${search.trim()}”` : category ? data.categories.find((item) => item.id === category)?.name : "All delicious picks"}</Text><Text style={m.resultsCount}>{products.length} {products.length === 1 ? "product" : "products"}</Text></View>
      <View style={m.grid}>{products.map((product) => <ProductCard key={product.id} product={product} enabled={data.campus.serviceEnabled} compact />)}</View>
      {!products.length && <EmptyState symbol="⌕" title="Nothing matches that yet" description="Try a different dish, category, or reset your filters to see the full menu." />}

      <View style={m.reviewsHead}><View><Text style={m.menuEyebrow}>CAMPUS COMMUNITY</Text><Text style={m.reviewsTitle}>What students say</Text></View><View style={m.ratingBadge}><Text style={m.ratingStar}>★</Text><Text style={m.ratingText}>{reviews.rating ? reviews.rating.toFixed(1) : "New"}</Text></View></View>
      {reviews.items.slice(0, 4).map((review) => <View key={review.id} style={m.review}><View style={m.reviewTop}><Text style={m.reviewStars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text><Text style={m.verified}>✓ VERIFIED ORDER</Text></View><Text style={m.reviewCopy}>{review.comment}</Text></View>)}
      {!reviews.count && <View style={m.noReviews}><Text style={m.noReviewsIcon}>♡</Text><Text style={m.noReviewsTitle}>Be the first to share the love</Text><Text style={m.noReviewsCopy}>After a delivered order, your review will help the campus community discover great food.</Text></View>}
    </>}
  </Screen>;
}

function VendorHero({ vendor, reviews, loading }: { vendor?: Vendor; reviews: ReviewData; loading: boolean }) {
  if (loading && !vendor) return <ThemeContent><View style={m.heroSkeleton}><View style={m.heroSkeletonLine} /><View style={[m.heroSkeletonLine, { width: "48%", height: 25 }]} /></View></ThemeContent>;
  return <ThemeContent><View style={m.hero}>
    {vendor?.coverImage ? <Image source={{ uri: mediaUrl(vendor.coverImage) }} resizeMode="cover" style={m.cover} /> : <View style={m.coverFallback}><View style={m.coverOrb} /></View>}
    <View style={m.coverShade} />
    <Pressable accessibilityRole="button" accessibilityLabel="Back to campus shops" onPress={() => router.back()} style={({ pressed }) => [m.back, pressed && m.pressed]}><Text style={m.backText}>‹</Text></Pressable>
    <View style={m.cartCorner}><CartButton compact light /></View>
    {vendor && <>
      <View style={[m.openBadge, !vendor.acceptingOrders && m.closedBadge]}><View style={[m.openDot, !vendor.acceptingOrders && { backgroundColor: "#B7BCBF" }]} /><Text style={m.openText}>{vendor.acceptingOrders ? "OPEN FOR ORDERS" : "CURRENTLY CLOSED"}</Text></View>
      <View style={m.heroContent}>
        <View style={m.heroIdentity}>
          <View style={m.logo}>{vendor.logo ? <Image source={{ uri: mediaUrl(vendor.logo) }} resizeMode="cover" style={m.logoImage} /> : <Text style={m.logoInitial}>{vendor.name.slice(0, 1).toUpperCase()}</Text>}</View>
          <View style={m.heroCopy}>
            <Text numberOfLines={1} style={m.vendorName}>{vendor.name}</Text>
            <Text numberOfLines={1} style={m.vendorDescription}>{vendor.description || "Campus favourites made fresh, just for you."}</Text>
            <Text numberOfLines={1} style={m.location}>⌖  {vendor.address || "On campus"}</Text>
          </View>
        </View>
        <View style={m.heroStats}>
          <View style={m.heroStat}><Text style={m.heroStatIcon}>★</Text><Text style={m.heroStatValue}>{reviews.rating ? reviews.rating.toFixed(1) : "New"}</Text><Text style={m.heroStatLabel}>{reviews.count ? `${reviews.count} reviews` : "No reviews"}</Text></View>
          <View style={m.statDivider} />
          <View style={m.heroStat}><Text style={m.heroStatIcon}>◷</Text><Text style={m.heroStatValue}>{vendor.preparationMinutes} min</Text><Text style={m.heroStatLabel}>Preparation</Text></View>
          <View style={m.statDivider} />
          <View style={m.heroStat}><Text style={m.heroStatIcon}>▣</Text><Text style={m.heroStatValue}>{vendor.codEnabled ? "COD" : "Online"}</Text><Text style={m.heroStatLabel}>Payment</Text></View>
        </View>
      </View>
    </>}
  </View></ThemeContent>;
}

function sortProducts(a: Product, b: Product, sort: MenuSort) {
  if (sort === "PRICE_ASC") return a.pricePaise - b.pricePaise;
  if (sort === "PRICE_DESC") return b.pricePaise - a.pricePaise;
  if (sort === "NAME") return a.name.localeCompare(b.name);
  const availability = Number(b.available && b.stock !== 0) - Number(a.available && a.stock !== 0);
  return availability || a.name.localeCompare(b.name);
}

const m = StyleSheet.create({
  hero: { minHeight: 232, marginHorizontal: -22, marginTop: -22, marginBottom: 12, backgroundColor: colors.navy, overflow: "hidden", justifyContent: "flex-end" }, cover: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, width: "100%", height: "100%" }, coverFallback: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#31545B" }, coverOrb: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#426C71", right: -90, top: -90 }, coverShade: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(12,31,38,.62)" }, back: { position: "absolute", left: 16, top: 16, width: 39, height: 39, borderRadius: 14, backgroundColor: "rgba(255,255,255,.95)", alignItems: "center", justifyContent: "center", zIndex: 2 }, backText: { color: colors.ink, fontSize: 31, lineHeight: 33, marginTop: -3 }, cartCorner: { position: "absolute", right: 16, top: 14, zIndex: 3 }, openBadge: { position: "absolute", right: 70, top: 18, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, backgroundColor: "rgba(24,50,61,.92)" }, closedBadge: { backgroundColor: "rgba(60,67,69,.92)" }, openDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#45D59E" }, openText: { color: "#FFFFFF", fontSize: 7, letterSpacing: .7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, heroContent: { paddingHorizontal: 18, paddingBottom: 14 }, heroIdentity: { flexDirection: "row", alignItems: "center", gap: 12 }, heroCopy: { flex: 1, minWidth: 0 }, logo: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 2, borderColor: "rgba(255,255,255,.85)", overflow: "hidden", alignItems: "center", justifyContent: "center", boxShadow: "0px 5px 16px rgba(0,0,0,.18)" }, logoImage: { width: "100%", height: "100%" }, logoInitial: { color: colors.green, fontSize: 24, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, vendorName: { color: "#FFFFFF", fontSize: 22, lineHeight: 27, letterSpacing: -.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, vendorDescription: { color: "#DCE7E8", fontSize: 9, lineHeight: 14, marginTop: 2 }, heroStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, backgroundColor: "rgba(255,255,255,.12)", borderWidth: 1, borderColor: "rgba(255,255,255,.15)", paddingVertical: 7, paddingHorizontal: 8, marginTop: 10 }, heroStat: { flex: 1, alignItems: "center" }, heroStatIcon: { color: "#FFD277", fontSize: 10, fontWeight: "800" }, heroStatValue: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 1 }, heroStatLabel: { color: "#C9D6D8", fontSize: 6, marginTop: 1 }, statDivider: { height: 25, width: 1, backgroundColor: "rgba(255,255,255,.18)" }, location: { color: "#DCE7E8", fontSize: 8, marginTop: 3, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }, heroSkeleton: { height: 232, marginHorizontal: -22, marginTop: -22, marginBottom: 12, padding: 20, justifyContent: "flex-end", backgroundColor: "#DCE2DD" }, heroSkeletonLine: { width: "70%", height: 11, borderRadius: 8, backgroundColor: "#EEF0EC", marginTop: 9 },
  closedNotice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 15, backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#F2DCCE", marginBottom: 10 }, closedIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, closedIconText: { color: colors.green, fontSize: 17 }, closedTitle: { color: colors.ink, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, closedCopy: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 2 },
  menuHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4, marginBottom: 10 }, menuEyebrow: { color: colors.green, fontSize: 7, letterSpacing: 1.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 4 }, menuTitle: { color: colors.ink, fontSize: 20, letterSpacing: -.6, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, menuCount: { color: colors.muted, fontSize: 8, marginTop: 3 }, reset: { color: colors.green, fontSize: 10, fontWeight: "800", padding: 7 }, searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 13, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: "#F2CABB", boxShadow: "0px 5px 18px rgba(24,50,61,.06)" }, searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, color: colors.ink, fontSize: 12, fontFamily: "PlusJakartaSans_500Medium" }, searchGlyph: { width: 18, height: 18 }, searchLens: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.8, borderColor: colors.green }, searchHandle: { position: "absolute", width: 6, height: 2, backgroundColor: colors.green, right: 0, bottom: 2, borderRadius: 2, transform: [{ rotate: "45deg" }] }, clear: { width: 27, height: 27, borderRadius: 9, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }, clearText: { color: colors.muted, fontSize: 18 }, controlLabel: { color: colors.muted, fontSize: 7, letterSpacing: 1.2, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 11, marginBottom: 7 }, chipRow: { alignItems: "center", gap: 7, paddingRight: 8 }, chipDivider: { width: 1, height: 24, marginHorizontal: 2, backgroundColor: colors.line }, category: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, categoryActive: { backgroundColor: colors.lime, borderColor: "#EABFAE" }, categoryText: { color: colors.ink, fontSize: 9, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, categoryTextActive: { color: colors.green }, filterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }, matchCount: { color: colors.green, fontSize: 8, fontWeight: "800", marginBottom: 7 }, filter: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.navy, borderColor: colors.navy }, filterText: { color: colors.ink, fontSize: 9, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, filterTextActive: { color: "#FFFFFF" }, sort: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: "#EFEEE9" }, sortActive: { backgroundColor: colors.lime }, sortText: { color: colors.muted, fontSize: 8, fontWeight: "700" }, sortTextActive: { color: colors.green }, pressed: { opacity: .76, transform: [{ scale: .97 }] },
  resultsHead: { marginTop: 15, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }, resultsTitle: { flex: 1, color: colors.ink, fontSize: 17, letterSpacing: -.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, resultsCount: { color: colors.muted, fontSize: 8, marginLeft: 9 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  reviewsHead: { marginTop: 25, marginBottom: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, reviewsTitle: { color: colors.ink, fontSize: 21, letterSpacing: -.6, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, ratingBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: "#FFF4D8" }, ratingStar: { color: colors.orange, fontSize: 13 }, ratingText: { color: colors.ink, fontSize: 11, fontWeight: "800" }, review: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, marginBottom: 10 }, reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, reviewStars: { color: colors.orange, fontSize: 12, letterSpacing: 1 }, verified: { color: colors.success, fontSize: 7, letterSpacing: .6, fontWeight: "800" }, reviewCopy: { color: colors.ink, fontSize: 11, lineHeight: 18, marginTop: 10 }, noReviews: { alignItems: "center", padding: 23, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, noReviewsIcon: { color: colors.green, fontSize: 27 }, noReviewsTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 4 }, noReviewsCopy: { color: colors.muted, fontSize: 9, lineHeight: 15, textAlign: "center", maxWidth: 290, marginTop: 5 },
});
