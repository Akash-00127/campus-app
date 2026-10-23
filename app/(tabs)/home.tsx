import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Brand } from "../../src/brand";
import { mediaUrl, request, type Catalog, type Order, type Profile } from "../../src/api";
import { useSession } from "../../src/session";
import { ProductCard } from "../../src/storefront";
import { HomeCarousel } from "../../src/home-carousel";
import { Button, Loading, Notice, Screen, colors, money, s } from "../../src/ui";

type QuickFilter = "" | "LATE_NIGHT" | "TOP_RATED" | "UNDER_99" | "VEG";
type Sort = "NAME" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "TOP_RATED";
function carouselUrls(settings?: Record<string, string>) {
  try {
    const images: unknown = JSON.parse(settings?.carouselImages || "[]");
    return Array.isArray(images) ? images.filter((image): image is string => typeof image === "string" && image.length > 0).map((image) => mediaUrl(image)).filter((image): image is string => Boolean(image)) : [];
  } catch { return []; }
}
export default function Home() {
  const { session, cart } = useSession();
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
  const [stats, setStats] = useState({ orders: 0, delivered: 0, pending: 0, deliveredSalesPaise: 0 });
  const carouselImages = carouselUrls(data?.settings);

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
      <Header profile={profile} />
      {error && <Notice text={error} />}{loading && <Loading />}
      <View style={h.hero}><Text style={h.kicker}>YOUR CAMPUS. YOUR BUSINESS.</Text><Text style={h.heroTitle}>{profile?.vendor?.name || "Your shop"}</Text><Text style={h.heroSub}>{profile?.vendor?.approvalStatus} · {profile?.vendor?.operatingStatus}</Text></View>
      <Text style={s.h2}>Today at a glance</Text>
      <View style={h.grid}>{[["Orders", stats.orders], ["Awaiting acceptance", stats.pending], ["Delivered", stats.delivered], ["Delivered sales", money(stats.deliveredSalesPaise)]].map(([label, value]) => <View key={String(label)} style={h.stat}><Text style={h.statValue}>{value}</Text><Text style={s.muted}>{label}</Text></View>)}</View>
      {profile?.vendor?.approvalStatus === "APPROVED" ? <><View style={s.row}><Button disabled={busy} onPress={() => void setOperatingStatus("OPEN")}>Open shop</Button><Button secondary disabled={busy} onPress={() => void setOperatingStatus("CLOSED")}>Close shop</Button></View><Button onPress={() => router.push("/(tabs)/orders")}>Manage incoming orders →</Button><Button secondary onPress={() => router.push("/(tabs)/cart")}>Products & inventory</Button></> : <Notice text={profile?.vendor?.reviewReason || "Your application is awaiting administrator approval."} />}
    </Screen>
  );

  return (
    <Screen>
      <Header profile={profile} />
      {error && <Notice text={error} />}{loading && <Loading />}
      {activeOrder && <Pressable onPress={() => router.push("/(tabs)/orders")} style={h.liveOrder}><View style={h.liveIcon}><Text style={{ fontSize: 18 }}>▣</Text></View><View style={{ flex: 1 }}><Text style={h.liveLabel}>ACTIVE ORDER · {activeOrder.code}</Text><Text style={h.liveTitle}>{activeOrder.status.replaceAll("_", " ")}</Text><Text style={h.liveMeta}>{activeOrder.items.reduce((count, item) => count + item.quantity, 0)} items · Tap to view tracking</Text></View><Text style={h.liveArrow}>›</Text></Pressable>}
      <View style={h.search}><Text style={{ fontSize: 21, color: colors.green }}>⌕</Text><TextInput accessibilityLabel="Search your campus" placeholder="Search food, canteens & essentials" placeholderTextColor="#849089" value={search} onChangeText={setSearch} returnKeyType="search" style={h.searchInput} />{!!search && <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}><Text style={s.h3}>×</Text></Pressable>}<Pressable accessibilityLabel="Search filters" onPress={() => setQuick((current) => current === "VEG" ? "" : "VEG")} style={h.tune}><Text style={h.tuneText}>☷</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={h.serviceRow} contentContainerStyle={h.serviceContent}>
        {([['FOOD','●  Food'],['STORE','▦  Campus store'],['OFFERS','✦  Offers']] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: service === id }} onPress={() => { setService(id); if (id === 'OFFERS') setQuick('UNDER_99'); else if (id === 'STORE') { setQuick(''); setSearch(''); setQuery(''); setCategory(data?.categories.find((item) => /essential/i.test(item.name))?.id || ''); } else setQuick(''); }} style={[h.serviceTab, service === id && h.serviceActive]}><Text style={[h.serviceText, service === id && h.serviceTextActive]}>{label}</Text></Pressable>)}
      </ScrollView>
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={h.filterRow}>{[["LATE_NIGHT", "☾ Open now"], ["TOP_RATED", "★ Top rated"], ["UNDER_99", "⚡ Under ₹99"], ["VEG", "● Veg only"]].map(([id, label]) => <Pressable accessibilityRole="button" accessibilityState={{ selected: quick === id }} key={id} onPress={() => setQuick((current) => current === id ? "" : id as QuickFilter)} style={quick === id ? h.filterActive : h.filter}><Text style={quick === id ? h.filterActiveText : h.filterText}>{label}</Text></Pressable>)}</ScrollView>
        {!query && !category && !quick && <><HomeCarousel images={carouselImages} /><View style={h.assurance}><Text style={h.assuranceText}>⌖ Campus only</Text><Text style={h.assuranceText}>▣ Pay on delivery</Text><Text style={h.assuranceText}>✓ Clear pricing</Text></View>{data?.settings.announcement && <Notice text={data.settings.announcement} />}</>}
        {!data?.campus.serviceEnabled && data && <Notice text="Ordering hasn't opened for this campus yet. You can still explore the catalog." />}
        <SectionTitle title="Shop by category" action="View all" onPress={showAllProducts} />
        <View style={h.categoryGrid}>{[{ id: "", name: "All finds" }, ...(data?.categories || [])].slice(0, 8).map((item, index) => <Pressable key={item.id || "all"} onPress={() => setCategory(item.id)} style={[h.category, category === item.id && h.categoryCardSelected]}><View style={[h.categoryIcon, { backgroundColor: ["#FFF0E4", "#EAFBF3", "#E9F2FF", "#F0EDFF"][index % 4] }]}>{"image" in item && item.image ? <Image source={{ uri: mediaUrl(item.image) }} style={h.categoryImage} /> : <Text style={h.categoryLetter}>{item.id ? item.name.slice(0, 1) : "▦"}</Text>}</View><Text numberOfLines={2} style={h.categoryName}>{item.name}</Text></Pressable>)}</View>
        {!query && !category && !quick && <><SectionTitle title="Around your campus" action={`${data?.vendors.length || 0} shops`} /><ScrollView horizontal showsHorizontalScrollIndicator={false}>{data?.vendors.map((vendor) => <Pressable key={vendor.id} onPress={() => router.push(`/vendor/${vendor.id}`)} style={h.shop}>{vendor.coverImage || vendor.logo ? <Image source={{ uri: mediaUrl(vendor.coverImage || vendor.logo) }} resizeMode="cover" style={h.shopImage} /> : <View style={[h.shopImage, h.shopPlaceholder]}><Text style={h.shopInitial}>{vendor.name.slice(0, 1)}</Text></View>}<View style={{ padding: 12 }}><Text numberOfLines={1} style={s.h3}>{vendor.name}</Text><Text style={s.muted}>{vendor.rating ? `★ ${vendor.rating.toFixed(1)} · ` : ""}{vendor.preparationMinutes} min preparation</Text><Text style={[h.open, { color: vendor.acceptingOrders ? colors.green : "#8E5F42" }]}>{vendor.acceptingOrders ? "● Accepting orders" : "● Currently closed"}</Text></View></Pressable>)}</ScrollView>{data && !data.vendors.some((item) => item.acceptingOrders) && <Notice text="Currently no vendors are accepting orders." />}</>}
        <SectionTitle title={query ? "Search results" : category ? data?.categories.find((item) => item.id === category)?.name || "Category" : quick ? "Filtered campus finds" : "Fresh finds for you"} action={query || category || quick ? "Clear filters" : `${data?.total || 0} items`} onPress={query || category || quick ? showAllProducts : undefined} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>{[["NAME", "Recommended"], ["PRICE_ASC", "Price: low to high"], ["PRICE_DESC", "Price: high to low"], ["NEWEST", "Newest"]].map(([value, label]) => <Pressable key={value} style={[s.chip, !quick && sort === value && s.selected]} onPress={() => { setQuick(""); setSort(value as Sort); }}><Text style={h.sortText}>{label}</Text></Pressable>)}</ScrollView>
        <View style={h.grid}>{data?.products.map((product) => <ProductCard key={product.id} product={product} enabled={data.campus.serviceEnabled} />)}</View>
        {data && !data.products.length && <Notice text="No products match this filter. Try View all or another category." />}
        {data && data.products.length < data.total && <Button secondary disabled={busy} onPress={() => { setBusy(true); request<Catalog>(catalogPath(data.page + 1), token).then((next) => setData({ ...next, products: [...data.products, ...next.products] })).catch((caught) => setError(caught.message)).finally(() => setBusy(false)); }}>{busy ? "Loading…" : "Load more products"}</Button>}
        <Pressable style={h.savedBanner} onPress={() => router.push("/saved")}><View><Text style={s.h3}>Your saved campus finds</Text><Text style={s.muted}>Keep favourites ready for your next order.</Text></View><Text style={h.savedIcon}>♡</Text></Pressable>
        {!!cart.length && <Button onPress={() => router.push("/(tabs)/cart")}>{cart.reduce((count, line) => count + line.quantity, 0)} items · View basket →</Button>}
      </>
    </Screen>
  );
}

function Header({ profile }: { profile?: Profile }) { return <View style={h.top}><Pressable onPress={() => router.push("/(tabs)/profile")} style={{ flex: 1 }}><Text style={h.hello}>Hello, {profile?.name?.split(" ")[0] || "there"} 👋</Text><Text numberOfLines={1} style={h.location}>⌖ {profile?.campus?.name || "Choose your campus"}</Text></Pressable><Pressable accessibilityLabel="Open account" onPress={() => router.push("/(tabs)/profile")} style={h.avatar}><Text style={h.avatarText}>{profile?.name?.slice(0, 1) || "CD"}</Text></Pressable></View>; }
function SectionTitle({ title, action, onPress }: { title: string; action: string; onPress?: () => void }) { return <View style={h.section}><Text style={h.heading}>{title}</Text>{onPress ? <Pressable accessibilityRole="button" onPress={onPress}><Text style={h.action}>{action}</Text></Pressable> : <Text style={h.action}>{action}</Text>}</View>; }

const h = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingTop: 4 }, hello: { fontSize: 18, color: colors.ink, fontWeight: "900" }, location: { fontSize: 11, color: colors.muted, marginTop: 3, maxWidth: 270, fontWeight: "700" }, avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFE4D8", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#F7BDAA" }, avatarText: { color: colors.green, fontWeight: "900" },
  liveOrder: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", borderWidth: 1, borderColor: "#FFD9BD", borderRadius: 15, padding: 13, marginBottom: 12 }, liveIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }, liveLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8, color: colors.green }, liveTitle: { fontSize: 15, fontWeight: "900", color: colors.ink, marginTop: 2 }, liveMeta: { fontSize: 10, color: colors.muted, marginTop: 3 }, liveArrow: { fontSize: 30, color: colors.green, fontWeight: "600" },
  search: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#EEE5E0", borderRadius: 16, paddingHorizontal: 14, backgroundColor: "white", marginBottom: 10 }, tune: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF0E9", alignItems: "center", justifyContent: "center" }, tuneText: { fontSize: 17, fontWeight: "900", color: colors.green }, serviceRow: { marginHorizontal: -22, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#F0E8E3" }, serviceContent: { paddingHorizontal: 22 }, serviceTab: { paddingVertical: 11, marginRight: 25, borderBottomWidth: 3, borderBottomColor: "transparent" }, serviceActive: { borderBottomColor: colors.green }, serviceText: { color: colors.muted, fontSize: 11, fontWeight: "800" }, serviceTextActive: { color: colors.green }, searchInput: { flex: 1, fontSize: 14, paddingVertical: 15, color: colors.ink }, filterRow: { marginBottom: 14 }, filter: { backgroundColor: "white", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: "#EEE5E0" }, filterActive: { backgroundColor: colors.ink, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, marginRight: 8, borderWidth: 1, borderColor: colors.ink }, filterText: { fontSize: 10, fontWeight: "800", color: colors.ink }, filterActiveText: { fontSize: 10, fontWeight: "800", color: "white" },
  hero: { backgroundColor: "#062A82", borderRadius: 22, padding: 20, height: 194, overflow: "hidden", justifyContent: "center" }, kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4, color: "#FFD76B", marginBottom: 8 }, heroTitle: { fontSize: 27, lineHeight: 31, letterSpacing: -0.8, fontWeight: "900", color: "white" }, heroSub: { fontSize: 11, lineHeight: 16, color: "#D7E6FF", marginTop: 8 },
  assurance: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderColor: "#E8E4EF" }, assuranceText: { fontSize: 10, color: colors.muted, fontWeight: "600" }, section: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 15 }, heading: { flex: 1, fontSize: 20, fontWeight: "800", letterSpacing: -0.6, color: colors.ink }, action: { fontSize: 11, fontWeight: "800", color: colors.green, paddingVertical: 8, paddingLeft: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 9, marginBottom: 6 }, category: { width: "23.5%", minHeight: 84, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#EEE5E0", paddingVertical: 8 }, categoryCardSelected: { borderColor: colors.green, backgroundColor: "#FFF0E9" }, categoryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, categorySelected: { borderWidth: 2, borderColor: colors.green }, categoryImage: { width: 34, height: 34, borderRadius: 14 }, categoryLetter: { fontSize: 18, fontWeight: "800", color: colors.green }, categoryName: { fontSize: 9.5, fontWeight: "800", textAlign: "center", marginTop: 6, color: colors.ink, paddingHorizontal: 3 },
  shop: { width: 218, marginRight: 13, borderRadius: 15, overflow: "hidden", borderWidth: 1, borderColor: "#E8E4EF", backgroundColor: "white" }, shopImage: { height: 112, width: "100%" }, shopPlaceholder: { backgroundColor: "#E5EDD9", alignItems: "center", justifyContent: "center" }, shopInitial: { fontSize: 30, fontWeight: "900", color: colors.green }, open: { fontSize: 10, fontWeight: "700", marginTop: 8 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, stat: { width: "48%", padding: 19, borderRadius: 18, backgroundColor: "white", marginBottom: 12, borderWidth: 1, borderColor: colors.line }, statValue: { fontSize: 26, fontWeight: "800", color: colors.green }, sortText: { fontSize: 11, fontWeight: "700", color: colors.ink }, savedBanner: { backgroundColor: "#FFF0E5", borderRadius: 18, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20 }, savedIcon: { fontSize: 30, color: colors.green },
});








