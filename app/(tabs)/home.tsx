import { AppIcon } from "../../src/app-icon";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Brand } from "../../src/brand";
import { mediaUrl, request, type Catalog, type Order, type Profile } from "../../src/api";
import { useSession } from "../../src/session";
import { ProductCard } from "../../src/storefront";
import { Button, Loading, Notice, Screen, colors, money, s } from "../../src/ui";

type QuickFilter = "" | "LATE_NIGHT" | "TOP_RATED" | "UNDER_99" | "VEG";
type Sort = "NAME" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "TOP_RATED";
export default function Home() {
  const { session, cart, setAccountSection } = useSession();
  const token = session!.accessToken;
  const vendorAccount = session!.user.role === "VENDOR";
  const [profile, setProfile] = useState<Profile>();
  const [data, setData] = useState<Catalog>();
  const [activeOrder, setActiveOrder] = useState<Order>();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<Sort>("NAME");
  const [quick, setQuick] = useState<QuickFilter>("");
  const [service, setService] = useState<"FOOD" | "STORE" | "OFFERS">("FOOD");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [stats, setStats] = useState({ orders: 0, delivered: 0, pending: 0, deliveredSalesPaise: 0 });
  const openProducts = (data?.products || []).filter((product) => product.available && product.stock !== 0 && product.vendor.acceptingOrders).slice(0, 6);
  const discountedProducts = (data?.products || []).filter((product) => product.compareAtPricePaise && product.compareAtPricePaise > product.pricePaise).slice(0, 4);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const catalogPath = useCallback((page = 1) => {
    const params = new URLSearchParams({ limit: "30", page: String(page), sort: quick === "TOP_RATED" ? "TOP_RATED" : sort });
    if (query) params.set("q", query);
    if (category) params.set("categoryId", category);
    if (quick === "UNDER_99") params.set("maxPricePaise", "9900");
    if (quick === "VEG") params.set("vegetarian", "true");
    if (quick === "LATE_NIGHT") params.set("openOnly", "true");
    return `/catalog?${params}`;
  }, [category, query, quick, sort]);

  const load = useCallback(async () => {
    setError("");
    try {
      const currentProfile = await request<Profile>("/auth/me", token);
      setProfile(currentProfile);
      if (vendorAccount) {
        setStats(await request("/vendor/dashboard", token));
      } else {
        const [catalog, orders] = await Promise.all([
          request<Catalog>(catalogPath(), token),
          request<{ items: Order[] }>("/orders?limit=20&page=1", token),
        ]);
        setData(catalog);
        setActiveOrder(orders.items.find((order) => !["DELIVERED", "CANCELLED_BY_USER", "CANCELLED_BY_VENDOR", "CANCELLED_BY_ADMIN", "PAYMENT_FAILED", "REFUNDED"].includes(order.status)));
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [catalogPath, token, vendorAccount]);

  useFocusEffect(useCallback(() => {
    void load();
    if (vendorAccount) return;
    // Catalog content is controlled by the admin panel. Refresh while this screen is
    // focused so product and availability updates appear without restarting the app.
    const refresh = setInterval(() => {
      void request<Catalog>(catalogPath(), token).then(setData).catch(() => undefined);
    }, 5000);
    return () => clearInterval(refresh);
  }, [catalogPath, load, token, vendorAccount]));

  async function setOperatingStatus(status: string) {
    setBusy(true);
    try {
      await request("/vendor/profile", token, "PATCH", { operatingStatus: status });
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function showAllProducts() {
    setSearch(""); setQuery(""); setCategory(""); setQuick(""); setSort("NAME");
  }

  if (vendorAccount) return (
    <Screen>
      <Header profile={profile} cartCount={cart.reduce((count, line) => count + line.quantity, 0)} onNotifications={() => { setAccountSection("NOTIFICATIONS"); router.push("/(tabs)/profile"); }} />
      {error && <Notice text={error} />}{loading && <Loading />}
      <View style={h.hero}><Text style={h.kicker}>YOUR CAMPUS. YOUR BUSINESS.</Text><Text style={h.heroTitle}>{profile?.vendor?.name || "Your shop"}</Text><Text style={h.heroSub}>{profile?.vendor?.approvalStatus} · {profile?.vendor?.operatingStatus}</Text></View>
      <Text style={s.h2}>Today at a glance</Text>
      <View style={h.grid}>{[["Orders", stats.orders], ["Awaiting acceptance", stats.pending], ["Delivered", stats.delivered], ["Delivered sales", money(stats.deliveredSalesPaise)]].map(([label, value]) => <View key={String(label)} style={h.stat}><Text style={h.statValue}>{value}</Text><Text style={s.muted}>{label}</Text></View>)}</View>
      {profile?.vendor?.approvalStatus === "APPROVED" ? <><View style={s.row}><Button disabled={busy} onPress={() => void setOperatingStatus("OPEN")}>Open shop</Button><Button secondary disabled={busy} onPress={() => void setOperatingStatus("CLOSED")}>Close shop</Button></View><Button onPress={() => router.push("/(tabs)/orders")}>Manage incoming orders →</Button><Button secondary onPress={() => router.push("/(tabs)/cart")}>Products & inventory</Button></> : <Notice text={profile?.vendor?.reviewReason || "Your application is awaiting administrator approval."} />}
    </Screen>
  );

  return (
    <Screen>
      <Header profile={profile} cartCount={cart.reduce((count, line) => count + line.quantity, 0)} onNotifications={() => { setAccountSection("NOTIFICATIONS"); router.push("/(tabs)/profile"); }} />
      {error && <Notice text={error} />}{loading && <Loading />}
      {activeOrder && <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/orders")} style={({ pressed }) => [h.liveOrder, pressed && h.pressedCard]}><View style={h.liveIcon}><Text style={{ fontSize: 18, color: "#FFFFFF" }}>▣</Text></View><View style={{ flex: 1 }}><Text style={h.liveLabel}>ACTIVE ORDER · {activeOrder.code}</Text><Text style={h.liveTitle}>{activeOrder.status.replaceAll("_", " ")}</Text><Text style={h.liveMeta}>{activeOrder.items.reduce((count, item) => count + item.quantity, 0)} items · Tap to view tracking</Text></View><Text style={h.liveArrow}>›</Text></Pressable>}
      <View style={[h.search, searchFocused && h.searchFocused]}><SearchIcon /><TextInput accessibilityLabel="Search your campus" placeholder="Search food, canteens & essentials" placeholderTextColor="#89939A" value={search} onChangeText={setSearch} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} returnKeyType="search" style={h.searchInput} />{!!search && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")}><Text style={s.h3}>×</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Search filters" onPress={() => setQuick((current) => current === "VEG" ? "" : "VEG")} style={({ pressed }) => [h.tune, pressed && h.pressed]}><FilterIcon /></Pressable></View>
      <View style={h.intro}><Text style={h.introKicker}>FAST, LOCAL, CAMPUS-ONLY</Text><Text style={h.introTitle}>What are you craving?</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={h.serviceRow} contentContainerStyle={h.serviceContent}>
        {([['FOOD','Food'],['STORE','Campus store'],['OFFERS','Offers']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: service === id }} onPress={() => { setService(id); if (id === 'OFFERS') setQuick('UNDER_99'); else if (id === 'STORE') { setQuick(''); setSearch(''); setQuery(''); setCategory(data?.categories.find((item) => /essential/i.test(item.name))?.id || ''); } else setQuick(''); }} style={({ pressed }) => [h.serviceTab, service === id && h.serviceActive, pressed && h.pressed]}><Text style={[h.serviceText, service === id && h.serviceTextActive]}>{label}</Text></Pressable>)}
      </ScrollView>
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={h.filterRow}>{[["LATE_NIGHT", "Open now"], ["TOP_RATED", "Top rated"], ["UNDER_99", "Under ₹99"], ["VEG", "Veg only"]].map(([id, label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: quick === id }} key={id} onPress={() => setQuick((current) => current === id ? "" : id as QuickFilter)} style={({ pressed }) => [quick === id ? h.filterActive : h.filter, pressed && h.pressed]}><Text style={quick === id ? h.filterActiveText : h.filterText}>{label}</Text></Pressable>)}</ScrollView>
        {!query && !category && !quick && <>
          {data?.settings.announcement && <Notice text={data.settings.announcement} />}
          {openProducts.length > 0 && <View><SectionTitle title="On the menu now" action="View all" onPress={showAllProducts}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16,paddingVertical:8}}>
              {openProducts.map(product => <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={product.name} onPress={()=>router.push(`/product/${product.id}`)} style={{width:108,gap:5}}>
                <View style={{width:88,height:88,borderRadius:44,padding:4,borderWidth:2,borderColor:colors.lime,backgroundColor:colors.surface,alignItems:"center",justifyContent:"center"}}>
                  {product.image ? <Image source={{uri:mediaUrl(product.image)}} style={{width:76,height:76,borderRadius:38}}/> : <Text style={s.h2}>{product.name.slice(0,1)}</Text>}
                </View><Text numberOfLines={2} style={h.dishName}>{product.name}</Text><Text style={h.dishPrice}>{money(product.pricePaise)}</Text>
              </Pressable>)}
            </ScrollView></View>}
        </>}
        {!data?.campus.serviceEnabled && data && <Notice text="Ordering hasn't opened for this campus yet. You can still explore the catalog." />}
        <SectionTitle title="Shop by category" action="View all" onPress={showAllProducts} />
        <View style={h.categoryGrid}>{[{ id: "", name: "All finds" }, ...(data?.categories || [])].slice(0, 8).map((item, index) => <Pressable key={item.id || "all"} accessibilityRole="button" accessibilityState={{ selected: category === item.id }} onPress={() => setCategory(item.id)} style={({ pressed }) => [h.category, category === item.id && h.categoryCardSelected, pressed && h.pressed]}><View style={[h.categoryIcon, { backgroundColor: ["#EEE9FF", "#EEF3EF", "#F7F3EC", "#EEE9FF"][index % 4] }]}>{"image" in item && item.image ? <Image source={{ uri: mediaUrl(item.image) }} style={h.categoryImage} /> : <Text style={h.categoryLetter}>{item.id ? item.name.slice(0, 1) : "▦"}</Text>}</View><Text numberOfLines={2} style={h.categoryName}>{item.name}</Text></Pressable>)}</View>
        {!query && !category && !quick && <><SectionTitle title="Around your campus" action={`${data?.vendors.length || 0} shops`} /><ScrollView horizontal showsHorizontalScrollIndicator={false}>{data?.vendors.map((vendor) => <Pressable key={vendor.id} onPress={() => router.push(`/vendor/${vendor.id}`)} style={({ pressed }) => [h.shop, pressed && h.pressedCard]}>{vendor.coverImage || vendor.logo ? <Image source={{ uri: mediaUrl(vendor.coverImage || vendor.logo) }} resizeMode="cover" style={h.shopImage} /> : <View style={[h.shopImage, h.shopPlaceholder]}><Text style={h.shopInitial}>{vendor.name.slice(0, 1)}</Text></View>}<View style={{ padding: 12 }}><Text numberOfLines={1} style={s.h3}>{vendor.name}</Text><Text style={s.muted}>{vendor.rating ? `★ ${vendor.rating.toFixed(1)} · ` : ""}{vendor.preparationMinutes} min preparation</Text><Text style={[h.open, { color: vendor.acceptingOrders ? colors.success : colors.muted }]}>{vendor.acceptingOrders ? "● Accepting orders" : "● Currently closed"}</Text></View></Pressable>)}</ScrollView>{data && !data.vendors.some((item) => item.acceptingOrders) && <Notice text="Currently no vendors are accepting orders." />}</>}
        {!query && !category && !quick && discountedProducts.length > 0 && <><SectionTitle title="Special offers" action="Live prices" /><View style={h.grid}>{discountedProducts.slice(0, 2).map((product) => <ProductCard key={`offer-${product.id}`} product={product} enabled={data!.campus.serviceEnabled} />)}</View></>}
        <SectionTitle title={query ? "Search results" : category ? data?.categories.find((item) => item.id === category)?.name || "Category" : quick ? "Filtered campus finds" : "Popular near you"} action={query || category || quick ? "Clear filters" : `${data?.total || 0} items`} onPress={query || category || quick ? showAllProducts : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{[["NAME", "Recommended"], ["PRICE_ASC", "Price: low to high"], ["PRICE_DESC", "Price: high to low"], ["NEWEST", "Newest"]].map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: !quick && sort === value }} style={({ pressed }) => [s.chip, !quick && sort === value && s.selected, pressed && h.pressed]} onPress={() => { setQuick(""); setSort(value as Sort); }}><Text style={h.sortText}>{label}</Text></Pressable>)}</ScrollView>
        <View style={h.grid}>{data?.products.map((product) => <ProductCard key={product.id} product={product} enabled={data.campus.serviceEnabled} />)}</View>
        {data && !data.products.length && <Notice text="No products match this filter. Try View all or another category." />}
        {data && data.products.length < data.total && <Button secondary disabled={busy} onPress={() => { setBusy(true); request<Catalog>(catalogPath(data.page + 1), token).then((next) => setData({ ...next, products: [...data.products, ...next.products] })).catch((caught) => setError(caught.message)).finally(() => setBusy(false)); }}>{busy ? "Loading…" : "Load more products"}</Button>}
        <Pressable style={h.savedBanner} onPress={() => router.push("/saved")}><View><Text style={s.h3}>Saved by you</Text><Text style={s.muted}>Keep favourites ready for your next order.</Text></View><Text style={h.savedIcon}>♡</Text></Pressable>
        {!!cart.length && <Button onPress={() => router.push("/(tabs)/cart")}>{cart.reduce((count, line) => count + line.quantity, 0)} items · View basket →</Button>}
      </>
    </Screen>
  );
}

function Header({ profile, cartCount, onNotifications }: { profile?: Profile; cartCount: number; onNotifications: () => void }) { return <View style={h.top}><Brand size={42} /><Pressable onPress={() => router.push("/(tabs)/profile")} style={h.locationBlock}><Text style={h.locationLabel}>DELIVERING TO</Text><Text numberOfLines={1} style={h.location}><Text style={h.locationPin}>⌖ </Text>{profile?.campus?.name || "Choose your campus"}⌄</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={onNotifications} style={({ pressed }) => [h.headerIcon, pressed && h.pressed]}><AppIcon name="bell" color={colors.ink} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Cart with ${cartCount} items`} onPress={() => router.push("/(tabs)/cart")} style={({ pressed }) => [h.headerIcon, pressed && h.pressed]}><AppIcon name="cart" color={colors.ink} />{cartCount > 0 && <Text style={h.headerBadge}>{cartCount > 9 ? "9+" : cartCount}</Text>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => router.push("/(tabs)/profile")} style={({ pressed }) => [h.avatar, pressed && h.pressed]}><Text style={h.avatarText}>{profile?.name?.slice(0, 1) || "CD"}</Text></Pressable></View>; }
function SectionTitle({ title, action, onPress }: { title: string; action: string; onPress?: () => void }) { return <View style={h.section}><Text style={h.heading}>{title}</Text>{onPress ? <Pressable accessibilityRole="button" onPress={onPress}><Text style={h.action}>{action}</Text></Pressable> : <Text style={h.action}>{action}</Text>}</View>; }

function SearchIcon() { return <AppIcon name="search" color={colors.muted} />; }
function FilterIcon() { return <AppIcon name="filter" color={colors.green} />; }

const h = StyleSheet.create({
  dishName:{color:colors.ink,fontSize:13,fontFamily:"PlusJakartaSans_700Bold"},dishPrice:{color:colors.green,fontSize:12,fontFamily:"Inter_500Medium"},
  intro: { marginTop: 12, marginBottom: 18 }, introKicker: { fontSize: 9, letterSpacing: 1.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green, marginBottom: 7 }, introTitle: { fontSize: 28, letterSpacing: -1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.ink },
  top: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 18, paddingTop: 5 }, locationBlock: { flex: 1, minWidth: 0 }, locationLabel: { fontSize: 8, letterSpacing: 1.2, color: colors.muted, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, location: { fontSize: 11, color: colors.ink, marginTop: 3, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, locationPin: { color: colors.green, fontWeight: "800" }, headerIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, headerIconText: { fontSize: 19, color: colors.ink, fontWeight: "700" }, headerBadge: { position: "absolute", top: -5, right: -4, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, overflow: "hidden", textAlign: "center", color: "white", backgroundColor: colors.green, fontSize: 9, lineHeight: 17, fontWeight: "800" }, avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFD3C3", boxShadow: "0px 3px 10px rgba(23,32,51,0.06)" }, avatarText: { color: colors.green, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" },
  mainHero: { minHeight: 300, borderRadius: 28, backgroundColor: colors.navy, overflow: "hidden", padding: 24, marginBottom: 16, justifyContent: "center" }, heroGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "#263149", right: -85, top: -55 }, heroRing: { position: "absolute", width: 190, height: 190, borderRadius: 100, borderWidth: 1, borderColor: "rgba(255,200,87,.24)", right: -35, bottom: -45 }, heroCopy: { width: "66%", zIndex: 2 }, heroBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,200,87,.16)", color: colors.orange, borderWidth: 1, borderColor: "rgba(255,200,87,.25)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, fontSize: 8, letterSpacing: 1.1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", overflow: "hidden", marginBottom: 13 }, mainHeroTitle: { color: "white", fontSize: 31, lineHeight: 35, letterSpacing: -1.2, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, mainHeroSub: { color: "#C5CAD5", fontSize: 11, lineHeight: 17, marginTop: 10, maxWidth: 270, fontFamily: "PlusJakartaSans_500Medium" }, heroActions: { flexDirection: "row", gap: 8, marginTop: 18, flexWrap: "wrap" }, heroPrimary: { backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11 }, heroPrimaryText: { color: "white", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, heroSecondary: { backgroundColor: "rgba(255,255,255,.1)", borderRadius: 12, paddingHorizontal: 15, paddingVertical: 11, borderWidth: 1, borderColor: "rgba(255,255,255,.14)" }, heroSecondaryText: { color: "white", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, heroVisual: { position: "absolute", right: 12, top: 50, bottom: 30, width: "34%", alignItems: "center", justifyContent: "center" }, heroFood: { position: "absolute", borderWidth: 3, borderColor: "rgba(255,255,255,.9)", backgroundColor: "#2D3952", shadowColor: "#000", shadowOpacity: .22, shadowRadius: 12, shadowOffset: { width: 0, height: 7 } }, heroFoodMain: { width: 112, height: 112, borderRadius: 56, top: 47, right: 2 }, heroFoodTop: { width: 66, height: 66, borderRadius: 33, top: 5, right: 8 }, heroFoodBottom: { width: 74, height: 74, borderRadius: 37, bottom: 3, right: 42 },
  liveOrder: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: "#F0D8CB", borderRadius: 18, padding: 14, marginBottom: 12, boxShadow: "0px 4px 14px rgba(24,44,53,0.045)" }, liveIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, liveLabel: { fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 0.9, color: colors.green }, liveTitle: { fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.ink, marginTop: 2 }, liveMeta: { fontSize: 10, color: colors.muted, marginTop: 3 }, liveArrow: { fontSize: 30, color: colors.green, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  search: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 17, paddingHorizontal: 14, backgroundColor: colors.surface, marginBottom: 10 }, searchFocused: { borderColor: colors.green, borderWidth: 1.5 }, searchGlyph: { width: 19, height: 19, marginLeft: 1, marginRight: 1 }, searchLens: { position: "absolute", top: 1, left: 1, width: 14, height: 14, borderRadius: 8, borderWidth: 1.8, borderColor: colors.muted }, searchHandle: { position: "absolute", width: 7, height: 2, backgroundColor: colors.muted, right: 0, bottom: 1, borderRadius: 2, transform: [{ rotate: "45deg" }] }, tune: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" }, filterGlyph: { width: 16, height: 14, justifyContent: "space-between" }, filterTrack: { height: 1.5, width: 16, backgroundColor: "#B9A69D", borderRadius: 2, justifyContent: "center" }, filterDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green, marginLeft: 3, borderWidth: 1, borderColor: colors.surface }, filterDotMiddle: { marginLeft: 9 }, pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] }, pressedCard: { opacity: 0.9, transform: [{ scale: 0.99 }] }, serviceRow: { marginHorizontal: -22, marginBottom: 14 }, serviceContent: { paddingHorizontal: 22, gap: 8 }, serviceTab: { paddingVertical: 13, paddingHorizontal: 18, marginRight: 0, borderRadius: 14, backgroundColor: "#F0EFEA", borderWidth: 1, borderColor: "transparent" }, serviceActive: { backgroundColor: colors.navy, borderColor: colors.navy, boxShadow: "0px 4px 12px rgba(24,50,61,0.14)" }, serviceText: { color: colors.muted, fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, serviceTextActive: { color: "#FFFFFF" }, searchInput: { flex: 1, fontSize: 13, paddingVertical: 15, color: colors.ink, fontFamily: "PlusJakartaSans_500Medium" }, filterRow: { marginBottom: 20 }, filter: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.ink, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: colors.ink, boxShadow: "0px 3px 9px rgba(24,44,53,0.14)" }, filterText: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: colors.ink }, filterActiveText: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: "white" },
  hero: { backgroundColor: colors.navy, borderRadius: 22, padding: 20, height: 194, overflow: "hidden", justifyContent: "center" }, kicker: { fontSize: 9, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.4, color: "#FFD76B", marginBottom: 8 }, heroTitle: { fontSize: 27, lineHeight: 31, letterSpacing: -0.8, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: "white" }, heroSub: { fontSize: 11, lineHeight: 16, color: "#D7E6FF", marginTop: 8 },
  nightSection: { backgroundColor: colors.navy, borderRadius: 26, padding: 19, marginTop: 22, overflow: "hidden" }, nightGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#24304A", right: -70, top: -75 }, nightHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, nightEyebrow: { color: colors.orange, fontSize: 8, letterSpacing: 1.3, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 }, nightTitle: { color: "white", fontSize: 22, letterSpacing: -.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, nightSubtitle: { color: "#AEB6C5", fontSize: 10, lineHeight: 16, marginTop: 6 }, moon: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,200,87,.13)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,200,87,.2)" }, moonText: { color: colors.orange, fontSize: 24 }, nightRow: { gap: 10, paddingTop: 17, paddingBottom: 15 }, nightCard: { width: 132, backgroundColor: "#222D43", borderRadius: 16, padding: 8, borderWidth: 1, borderColor: "#2E3A51" }, nightImage: { width: "100%", height: 88, borderRadius: 12, backgroundColor: "#2D3950" }, nightPlaceholder: { alignItems: "center", justifyContent: "center" }, nightPlaceholderText: { color: colors.orange, fontSize: 28, fontWeight: "800" }, nightName: { color: "white", fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginTop: 9 }, nightMeta: { color: "#AEB6C5", fontSize: 9, marginTop: 4 }, nightButton: { minHeight: 42, borderRadius: 13, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, nightButtonText: { color: "white", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  assurance: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.line }, assuranceText: { fontSize: 10, color: colors.muted, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" }, section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 15 }, heading: { flex: 1, fontSize: 20, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -0.6, color: colors.ink }, action: { fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green, paddingVertical: 8, paddingLeft: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 9, marginBottom: 6 }, category: { width: "22%", minHeight: 102, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingVertical: 8 }, categoryCardSelected: { borderColor: colors.green, backgroundColor: colors.lime, boxShadow: "0px 3px 10px rgba(217,79,50,0.08)" }, categoryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, categorySelected: { borderWidth: 2, borderColor: colors.green }, categoryImage: { width: 34, height: 34, borderRadius: 14 }, categoryLetter: { fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green }, categoryName: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", textAlign: "center", marginTop: 6, color: colors.ink, paddingHorizontal: 3 },
  shop: { width: 242, marginRight: 14, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, boxShadow: "0px 4px 14px rgba(23,32,51,0.045)" }, shopImage: { height: 138, width: "100%" }, shopPlaceholder: { backgroundColor: "#F0F2F6", alignItems: "center", justifyContent: "center" }, shopInitial: { fontSize: 30, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green }, open: { fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginTop: 8 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, stat: { width: "48%", padding: 19, borderRadius: 18, backgroundColor: colors.surface, marginBottom: 12, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 3px 12px rgba(23,32,51,0.04)" }, statValue: { fontSize: 26, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: colors.green }, sortText: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: colors.ink }, favouriteBanner: { backgroundColor: colors.orange, borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", marginTop: 22, overflow: "hidden" }, favouriteEyebrow: { color: "#7B5812", fontSize: 8, letterSpacing: 1.3, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, favouriteTitle: { color: colors.navy, fontSize: 18, letterSpacing: -.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 7 }, favouriteCopy: { color: "#5E4B24", fontSize: 10, lineHeight: 16, marginTop: 5, maxWidth: 280 }, favouriteArrow: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", backgroundColor: colors.navy, color: "white", textAlign: "center", lineHeight: 40, fontSize: 19 }, savedBanner: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }, savedIcon: { fontSize: 30, color: colors.green },
});








