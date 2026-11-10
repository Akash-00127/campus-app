import { newCheckoutKey as newKey } from "../../src/checkout-key";
import * as SecureStore from "../../src/secure";
import { useCallback, useState, useRef, useEffect } from "react";
import { useFocusEffect, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, CircleCheck, CreditCard, MapPin, MessageSquareText, Minus, Plus, RotateCw, ShieldCheck, ShoppingCart, Store, TicketPercent, Trash2 } from "lucide-react-native";
import {
  mediaUrl, request,
  type Address,
  type Order,
  type Product,
  type Profile,
} from "../../src/api";
import { useSession } from "../../src/session";
import { useAppTheme } from "../../src/theme";
import { groupCheckoutLines } from "../../src/buy-now";
import { Button, Field, Notice, Screen, Title, ThemeContent, colors, money, s } from "../../src/ui";
type Quote = { totalPaise: number; discountPaise: number; subtotalPaise: number; deliveryFeePaise: number; platformFeePaise: number };
type VerifiedQuote = Quote & { inputKey: string };
type PlacedReceipt = { shops: { name: string; code: string; totalPaise: number }[]; totalPaise: number };
export default function Cart() {
  const { checkout: checkoutMode } = useLocalSearchParams<{ checkout?: string }>();
  const { session, cart, buyNowCheckout, quantity, note, clear, replaceCart, replaceBuyNow, buyNowQuantity, buyNowNote, clearBuyNow } = useSession();
  const isBuyNow = checkoutMode === "buy-now" && Boolean(buyNowCheckout);
  const orderLines = isBuyNow ? buyNowCheckout!.lines : cart;
  const updateQuantity = isBuyNow ? buyNowQuantity : quantity;
  const updateNote = isBuyNow ? buyNowNote : note;
  const { darkMode } = useAppTheme();
  const [coupon,setCoupon]=useState('');
  const [couponDraft, setCouponDraft] = useState("");
  const [quote,setQuote]=useState<Record<string, VerifiedQuote>>();
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [placingShop, setPlacingShop] = useState<{ name: string; index: number; total: number }>();
  const [placedReceipt, setPlacedReceipt] = useState<PlacedReceipt>();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);
  const token = session!.accessToken;
  const vendor = session!.user.role === "VENDOR";
  const [profile, setProfile] = useState<Profile>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState("");
  const orderGroups = groupCheckoutLines(orderLines);
  const quoteInputKey = JSON.stringify({ addressId: selected, coupon, groups: orderGroups.map((group) => [group.vendorId, group.lines.map((line) => [line.product.id, line.quantity, line.product.pricePaise, line.product.stock, line.product.available, line.product.vendor.acceptingOrders])]) });
  const verifiedQuotes = Object.fromEntries(orderGroups.flatMap((group) => {
    const value = quote?.[group.vendorId];
    const groupInputKey = JSON.stringify({ addressId: selected, coupon, vendorId: group.vendorId, items: group.lines.map((line) => [line.product.id, line.quantity, line.product.pricePaise, line.product.stock, line.product.available, line.product.vendor.acceptingOrders]) });
    return value?.inputKey === groupInputKey ? [[group.vendorId, value]] : [];
  }));
  const verifiedQuote = orderGroups.length && orderGroups.every((group) => verifiedQuotes[group.vendorId])
    ? orderGroups.reduce((total, group) => {
      const current = verifiedQuotes[group.vendorId];
      return { totalPaise: total.totalPaise + current.totalPaise, discountPaise: total.discountPaise + current.discountPaise, subtotalPaise: total.subtotalPaise + current.subtotalPaise, deliveryFeePaise: total.deliveryFeePaise + current.deliveryFeePaise, platformFeePaise: total.platformFeePaise + current.platformFeePaise };
    }, { totalPaise: 0, discountPaise: 0, subtotalPaise: 0, deliveryFeePaise: 0, platformFeePaise: 0 })
    : undefined;
  useEffect(() => {
    if (vendor || !orderLines.length || !selected) { setQuote(undefined); setQuoteLoading(false); return; }
    let active = true;
    setQuote(undefined);
    setQuoteLoading(true);
    void Promise.all(orderGroups.map(async (group) => {
      const groupInputKey = JSON.stringify({ addressId: selected, coupon, vendorId: group.vendorId, items: group.lines.map((line) => [line.product.id, line.quantity, line.product.pricePaise, line.product.stock, line.product.available, line.product.vendor.acceptingOrders]) });
      const next = await request<Quote>("/checkout/quote", token, "POST", {
        vendorId: group.vendorId,
        addressId: selected,
        paymentMethod: "COD",
        idempotencyKey: newKey(),
        ...(coupon ? { couponCode: coupon } : {}),
        items: group.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });
      return [group.vendorId, { ...next, inputKey: groupInputKey }] as const;
    })).then((entries) => { if (active) { setQuote(Object.fromEntries(entries)); setError(""); } })
      .catch((caught) => { if (active) setError((caught as Error).message); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [quoteInputKey, token, vendor]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [vegetarian, setVegetarian] = useState(false);
  const [edit, setEdit] = useState<Product>();
  const attempt = useRef<Record<string, { key: string; payload: string; orderSignature?: string; order?: Order }> | null>(null);
  const load = useCallback(async () => {
    try {
      setProfile(await request<Profile>("/auth/me", token));
      if (vendor)
        setProducts(await request<Product[]>("/vendor/products", token));
      else {
        const savedAddresses = await request<Address[]>("/addresses", token);
        setAddresses(savedAddresses);
        setSelected((current) => savedAddresses.some((address) => address.id === current) ? current : savedAddresses[0]?.id || "");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, vendor]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function checkout() {
    if(!verifiedQuote){setError('Review the server-verified order total before placing the order.');return;}
    if (!selected) {
      setError("Select a delivery address first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const stored = await SecureStore.getItemAsync(
        "campus-checkout-" + session!.user.id,
      );
      if (!attempt.current && stored) {
        try {
          const parsed = JSON.parse(stored);
          attempt.current = parsed.attempts || (parsed.key && parsed.payload ? { [orderGroups[0]?.vendorId]: parsed } : {});
        } catch {}
      }
      attempt.current ||= {};
      const attempts = attempt.current;
      const orders: Order[] = [];
      for (const [index, group] of orderGroups.entries()) {
        setPlacingShop({ name: group.vendorName, index: index + 1, total: orderGroups.length });
        const quoteForGroup = verifiedQuotes[group.vendorId];
        const input = {
          vendorId: group.vendorId,
          addressId: selected,
          paymentMethod: "COD",
          expectedTotalPaise: quoteForGroup.totalPaise,
          ...(coupon ? { couponCode: coupon } : {}),
          items: group.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, ...(line.note ? { note: line.note } : {}) })),
        };
        const payload = JSON.stringify(input);
        const orderSignature = JSON.stringify({ vendorId: group.vendorId, addressId: selected, coupon, items: input.items });
        const previous = attempts[group.vendorId];
        if (previous?.order && previous.orderSignature === orderSignature) {
          orders.push(previous.order);
          continue;
        }
        if (!previous || previous.payload !== payload) attempts[group.vendorId] = { key: newKey(), payload, orderSignature };
        await SecureStore.setItemAsync("campus-checkout-" + session!.user.id, JSON.stringify({ attempts }));
        const order = await request<Order>("/orders", token, "POST", { ...input, idempotencyKey: attempts[group.vendorId].key });
        attempts[group.vendorId] = { ...attempts[group.vendorId], orderSignature, order };
        await SecureStore.setItemAsync("campus-checkout-" + session!.user.id, JSON.stringify({ attempts }));
        orders.push(order);
      }
      if (!isBuyNow || buyNowCheckout?.includesCart) clear();
      if (isBuyNow) clearBuyNow();
      setCoupon("");
      setCouponDraft("");
      attempt.current = null;
      await SecureStore.deleteItemAsync("campus-checkout-" + session!.user.id);
      setPlacedReceipt({
        shops: orders.map((order, index) => ({ name: orderGroups[index].vendorName, code: order.code, totalPaise: order.totalPaise })),
        totalPaise: orders.reduce((total, order) => total + order.totalPaise, 0),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlacingShop(undefined);
      setBusy(false);
    }
  }
  function viewOrders() {
    setPlacedReceipt(undefined);
    router.replace("/(tabs)/orders");
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const amount = Number(price);
      if (!Number.isFinite(amount) || amount <= 0)
        throw new Error("Enter a valid price in rupees.");
      await request(
        edit ? `/vendor/products/${edit.id}` : "/vendor/products",
        token,
        edit ? "PATCH" : "POST",
        {
          name,
          pricePaise: Math.round(amount * 100),
          description,
          image,
           vegetarian,
          ...(stock !== "" ? { stock: Number(stock) } : {}),
          ...(edit ? { active: edit.active, available: edit.available } : {}),
        },
      );
      setEdit(undefined);
      setName("");
      setPrice("");
      setStock("");
      setDescription("");
      setImage("");
      setVegetarian(false);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(p: Product) {
    setBusy(true);
    try {
      await request(`/vendor/products/${p.id}`, token, "PATCH", {
        name: p.name,
        pricePaise: p.pricePaise,
        available: !p.available,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function refreshCart() {
    setBusy(true);
    setError("");
    setRefreshMessage("");
    try {
      const lines = await Promise.all(orderLines.map(async (line) => ({ ...line, product: await request<Product>(`/products/${line.product.id}`, token) })));
      if (isBuyNow) replaceBuyNow(lines);
      else replaceCart(lines);
      setRefreshMessage("Prices and availability updated.");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const subtotal = orderLines.reduce(
    (n, l) => n + l.product.pricePaise * l.quantity,
    0,
  );
  const campus = profile?.campus;
  const fee = ((campus?.deliveryFeePaise || 0) + (campus?.platformFeePaise || 0)) * orderGroups.length;
  const itemCount = orderLines.reduce((count, line) => count + line.quantity, 0);
  const unavailableItems = orderLines.some((line) => !line.product.available || !line.product.active || line.product.stock === 0 || !line.product.vendor.acceptingOrders || (line.product.stock !== null && line.quantity > line.product.stock));
  const missingCashOnDelivery = !campus?.codEnabled || orderGroups.some((group) => !group.lines[0].product.vendor.codEnabled);
  const checkoutDisabled = busy || quoteLoading || !verifiedQuote || !selected || unavailableItems || !campus?.serviceEnabled || missingCashOnDelivery;
  const checkoutHint = unavailableItems ? "Update or remove unavailable items to continue." : !selected ? "Add a delivery address to continue." : !campus?.serviceEnabled ? "Campus ordering is currently paused." : missingCashOnDelivery ? "Cash on delivery is unavailable for at least one shop in this order." : quoteLoading ? "Checking shop totals…" : !verifiedQuote ? "Every shop total must be verified before checkout." : `Totals verified for ${orderGroups.length} ${orderGroups.length === 1 ? "shop" : "shops"}. Pay in cash when your orders arrive.`;
  return (
    <>
    <Screen footer={!vendor && orderLines.length > 0 ? <View style={c.stickyBar}><View style={c.stickyInner}><View style={c.stickyTop}><View><Text style={c.stickyLabel}>{verifiedQuote ? "TOTAL TO PAY" : "ESTIMATED TOTAL"}</Text><Text style={c.stickyAmount}>{money(verifiedQuote?.totalPaise ?? subtotal + fee)}</Text></View><View style={c.stickyPayment}><CircleCheck size={15} color={colors.success} /><Text style={c.stickyPaymentText}>Cash on delivery</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel={busy && placingShop ? `Placing order ${placingShop.index} of ${placingShop.total} from ${placingShop.name}` : verifiedQuote ? `Place cash on delivery order for ${money(verifiedQuote.totalPaise)}` : "Checkout unavailable until total is verified"} disabled={checkoutDisabled} onPress={() => void checkout()} style={({ pressed }) => [c.checkoutButton, checkoutDisabled && c.checkoutDisabled, pressed && c.checkoutPressed]}>{busy ? <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={c.checkoutText}>{placingShop ? `Placing ${placingShop.index} of ${placingShop.total} · ${placingShop.name}` : "Placing orders…"}</Text></> : <><Text style={c.checkoutText}>{quoteLoading ? "Verifying total…" : "Place order"}</Text><ChevronRight size={21} color="#FFFFFF" strokeWidth={2.5} /></>}</Pressable><Text style={c.stickyHint}>{busy && placingShop ? `Preparing the separate order from ${placingShop.name}.` : checkoutHint}</Text></View></View> : undefined}>
      {vendor ? <Title eyebrow="YOUR CATALOG" title="Products" subtitle="Keep products, prices and stock up to date." /> : <ThemeContent><>
        <View style={c.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/home")} style={({ pressed }) => [c.back, pressed && c.pressed]}><Text style={c.backText}>‹</Text></Pressable>
          <View style={{ flex: 1 }}><Text style={c.eyebrow}>{isBuyNow ? "BUY NOW" : "YOUR ORDER"}</Text><Text style={c.title}>{isBuyNow ? "Review order" : "Your cart"}</Text><Text style={c.subtitle}>{itemCount ? `${itemCount} ${itemCount === 1 ? "item" : "items"} · Ready for checkout` : "Good food starts here"}</Text></View>
        </View>
        {isBuyNow && <View style={c.buyNowBanner}><CircleCheck size={19} color={colors.success} /><View style={{ flex: 1 }}><Text style={c.buyNowTitle}>{buyNowCheckout?.includesCart ? "Buying with your cart" : "Buying only this selection"}</Text><Text style={c.buyNowCopy}>{buyNowCheckout?.includesCart ? "This checkout includes the selected product and all cart items, grouped into shop orders." : "Your saved cart will not be changed when this order is placed."}</Text></View></View>}
        {!!orderLines.length && <View style={c.sectionHeading}><View><Text style={c.sectionEyebrow}>{isBuyNow ? "BUYING NOW" : "IN YOUR BAG"}</Text><Text style={c.sectionTitle}>{orderLines.length} {orderLines.length === 1 ? "product" : "products"} · {orderGroups.length} {orderGroups.length === 1 ? "shop" : "shops"}</Text></View>{!isBuyNow && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setClearConfirm(true)} style={({ pressed }) => [c.clearLink, busy && { opacity: .5 }, pressed && c.pressed]}><Trash2 size={15} color={darkMode ? "#FFB89F" : colors.green} /><Text style={c.clearText}>Clear all</Text></Pressable>}</View>}
        {clearConfirm && <View style={c.clearPanel}><Text style={c.clearPanelTitle}>Remove everything from your cart?</Text><Text style={c.clearPanelCopy}>You can add these products again from the shop.</Text><View style={c.clearActions}><Pressable accessibilityRole="button" onPress={() => setClearConfirm(false)} style={c.keepButton}><Text style={c.keepText}>Keep items</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { clear(); setCoupon(""); setCouponDraft(""); setClearConfirm(false); setRefreshMessage(""); }} style={c.confirmClear}><Text style={c.confirmClearText}>Clear cart</Text></Pressable></View></View>}
      </></ThemeContent>}
      {error && <Notice text={error} />}
      {!!refreshMessage && <ThemeContent><View style={c.refreshSuccess}><CircleCheck size={17} color={colors.success} /><Text style={c.refreshSuccessText}>{refreshMessage}</Text></View></ThemeContent>}
      {vendor ? (
        <>
          {profile?.vendor?.approvalStatus !== "APPROVED" ? (
            <Notice text="Your shop must be approved before products can be managed." />
          ) : (
            <>
              <View style={s.card}>
                <Text style={s.h2}>
                  {edit ? "Edit product" : "Add a product"}
                </Text>
                <Field
                  label="Product name"
                  value={name}
                  onChangeText={setName}
                />
                <Field
                  label="Price in rupees"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
                <Field
                  label="Stock quantity · leave blank for untracked stock"
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                />
                <Field
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
                <Field
                  label="Product image HTTPS URL · optional"
                  value={image}
                  onChangeText={setImage}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setVegetarian((value) => !value)} style={[s.card, { padding: 13, borderColor: vegetarian ? "#FF6B00" : undefined }]}>
                  <Text style={s.h3}>{vegetarian ? "✓ Vegetarian item" : "Mark as vegetarian"}</Text>
                  <Text style={s.muted}>This controls the Veg only filter shown to students.</Text>
                </Pressable>
                <Button onPress={() => void save()} disabled={busy}>
                  {busy ? "Saving…" : edit ? "Save product" : "Add product"}
                </Button>
                {edit && (
                  <Button
                    secondary
                    onPress={() => {
                      setEdit(undefined);
                      setName("");
                      setPrice("");
                      setStock("");
                      setDescription("");
                      setImage("");
                      setVegetarian(false);
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </View>
              {products.map((p) => (
                <View style={s.card} key={p.id}>
                  <View style={s.row}>
                    <Text style={s.h3}>{p.name}</Text>
                    <Text style={s.price}>{money(p.pricePaise)}</Text>
                  </View>
                  <Text style={s.muted}>
                    Stock: {p.stock ?? "Untracked"} ·{" "}
                    {p.available ? "Available" : "Unavailable"}
                  </Text>
                  <View style={s.row}>
                    <Button
                      secondary
                      onPress={() => {
                        setEdit(p);
                        setName(p.name);
                        setPrice(String(p.pricePaise / 100));
                        setStock(p.stock === null ? "" : String(p.stock));
                        setDescription(p.description || "");
                        setImage(p.image || "");
                        setVegetarian(Boolean(p.vegetarian));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      secondary
                      disabled={busy}
                      onPress={() => void toggle(p)}
                    >
                      {p.available ? "Pause item" : "Make available"}
                    </Button>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      ) : orderLines.length ? (
        <>
          <View style={{ marginTop: 4 }}>
            {orderGroups.map((group) => <View key={group.vendorId}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Visit ${group.vendorName}`} onPress={() => router.push(`/vendor/${group.vendorId}`)} style={({ pressed }) => [c.vendorStrip, pressed && c.pressed]}><View style={c.vendorMark}><Store size={21} color={colors.green} strokeWidth={2} /></View><View style={{ flex: 1 }}><Text style={c.vendorLabel}>ORDER FROM · {group.lines.length} {group.lines.length === 1 ? "PRODUCT" : "PRODUCTS"}</Text><Text numberOfLines={1} style={c.vendorName}>{group.vendorName}</Text><Text style={c.vendorMeta}>Separate order for this shop</Text></View><ChevronRight size={19} color="#C7D9D9" /></Pressable>
            {group.lines.map((l) => (
              <ThemeContent key={l.product.id}><View style={c.lineCard}>
                <View style={c.lineMain}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`View ${l.product.name}`} onPress={() => router.push(`/product/${l.product.id}`)} style={c.lineImageWrap}>{l.product.image ? <Image source={{ uri: mediaUrl(l.product.image) }} resizeMode="cover" style={c.lineImage} /> : <View style={c.lineFallback}><Text style={c.lineInitial}>{l.product.name.slice(0, 1).toUpperCase()}</Text></View>}</Pressable>
                  <View style={c.lineBody}>
                    <View style={c.lineTop}><Pressable accessibilityRole="button" onPress={() => router.push(`/product/${l.product.id}`)} style={{ flex: 1 }}><Text numberOfLines={2} style={c.lineName}>{l.product.name}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${l.product.name} from order`} hitSlop={8} disabled={busy} onPress={() => updateQuantity(l.product.id, 0)} style={({ pressed }) => [c.remove, pressed && c.pressed]}><Trash2 size={17} color={darkMode ? "#FFB89F" : colors.green} /></Pressable></View>
                    <Text style={c.lineUnit}>{money(l.product.pricePaise)} per item</Text>
                    <Text style={[c.lineStatus, (!l.product.available || !l.product.active || l.product.stock === 0 || !l.product.vendor.acceptingOrders || (l.product.stock !== null && l.quantity > l.product.stock)) && c.lineStatusOff]}>{l.product.stock === 0 ? "Sold out" : !l.product.available || !l.product.active || !l.product.vendor.acceptingOrders ? "Currently unavailable" : l.product.stock !== null && l.quantity > l.product.stock ? `Only ${l.product.stock} left` : "Available to order"}</Text>
                  </View>
                </View>
                <View style={c.lineFooter}><View><Text style={c.lineTotalLabel}>ITEM TOTAL</Text><Text style={c.linePrice}>{money(l.product.pricePaise * l.quantity)}</Text></View><View style={c.stepper}><Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${l.product.name}`} disabled={busy} onPress={() => updateQuantity(l.product.id, l.quantity - 1)} style={({ pressed }) => [c.stepButton, pressed && c.stepPressed]}><Minus size={18} color={darkMode ? "#F4F6F3" : colors.green} strokeWidth={2.5} /></Pressable><Text style={c.stepCount}>{l.quantity}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Add one ${l.product.name}`} disabled={busy || l.quantity >= Math.min(50, l.product.stock ?? 50)} onPress={() => updateQuantity(l.product.id, l.quantity + 1)} style={({ pressed }) => [c.stepButton, pressed && c.stepPressed]}><Plus size={18} color={darkMode ? "#F4F6F3" : colors.green} strokeWidth={2.5} /></Pressable></View></View>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedNotes.includes(l.product.id) }} onPress={() => setExpandedNotes((current) => current.includes(l.product.id) ? current.filter((id) => id !== l.product.id) : [...current, l.product.id])} style={({ pressed }) => [c.noteToggle, pressed && c.pressed]}><MessageSquareText size={16} color={darkMode ? "#FFB89F" : colors.green} /><Text numberOfLines={1} style={c.noteToggleText}>{l.note ? `Note: ${l.note}` : "Add a note for this item"}</Text><ChevronRight size={15} color={darkMode ? "#A7B3B4" : colors.muted} style={expandedNotes.includes(l.product.id) ? { transform: [{ rotate: "90deg" }] } : undefined} /></Pressable>
                {expandedNotes.includes(l.product.id) && <View style={c.noteField}><Field label="Instructions for this item" value={l.note || ""} placeholder="e.g. less spicy, no onions" maxLength={300} onChangeText={(value) => updateNote(l.product.id, value)} /></View>}
              </View></ThemeContent>
            ))}</View>)}
          </View>
          <ThemeContent><View style={c.cartActions}>{!isBuyNow && <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/home")} style={({ pressed }) => [c.addMoreButton, pressed && c.pressed]}><Plus size={19} color={darkMode ? "#FFB89F" : colors.green} strokeWidth={2.5} /><Text style={c.addMoreText}>Add more products</Text><ChevronRight size={17} color={darkMode ? "#FFB89F" : colors.green} /></Pressable>}<Pressable accessibilityRole="button" disabled={busy} onPress={() => void refreshCart()} style={({ pressed }) => [c.refreshButton, isBuyNow && { flex: 1 }, pressed && c.pressed]}><RotateCw size={15} color={darkMode ? "#FFB89F" : colors.green} /><Text style={c.refreshText}>{busy ? "Refreshing…" : "Refresh items"}</Text></Pressable></View></ThemeContent>
          <ThemeContent><View style={c.sectionHeading}><View><Text style={c.sectionEyebrow}>CAMPUS DELIVERY</Text><Text style={c.sectionTitle}>Deliver to</Text></View><MapPin size={21} color={darkMode ? "#FFB89F" : colors.green} /></View></ThemeContent>
          {addresses.map((a) => (
            <ThemeContent key={a.id}><Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === a.id }}
              onPress={() => setSelected(a.id)}
              style={({ pressed }) => [c.addressCard, selected === a.id && c.addressSelected, pressed && c.pressed]}
            >
              <View style={[c.addressIcon, selected === a.id && c.addressIconSelected]}><MapPin size={18} color={selected === a.id ? "#FFFFFF" : colors.green} /></View>
              <View style={{ flex: 1 }}><Text style={c.addressLabel}>{a.label} · {a.building}</Text><Text numberOfLines={2} style={c.addressDetails}>{a.details} · {a.phone}</Text></View>
              <View style={[c.radio, selected === a.id && c.radioSelected]}>{selected === a.id && <View style={c.radioDot} />}</View>
            </Pressable></ThemeContent>
          ))}
          <ThemeContent><Pressable accessibilityRole="button" onPress={() => router.push("/addresses")} style={({ pressed }) => [c.addAddress, pressed && c.pressed]}><View style={c.addAddressIcon}><Plus size={17} color={darkMode ? "#FFB89F" : colors.green} /></View><Text style={c.addAddressText}>{addresses.length ? "Manage or add an address" : "Add a delivery address"}</Text><ChevronRight size={18} color={darkMode ? "#A7B3B4" : colors.muted} /></Pressable></ThemeContent>
          <ThemeContent><View style={c.sectionHeading}><View><Text style={c.sectionEyebrow}>SAVE ON YOUR ORDER</Text><Text style={c.sectionTitle}>Offers</Text></View><TicketPercent size={22} color={darkMode ? "#FFB89F" : colors.green} /></View><View style={c.couponCard}><View style={c.couponHeading}><View style={c.couponIcon}><TicketPercent size={20} color={darkMode ? "#FFB89F" : colors.green} /></View><View style={{ flex: 1 }}><Text style={c.couponTitle}>Have a coupon code?</Text><Text style={c.couponCopy}>Your savings appear in the verified total.</Text></View></View><Field label="Coupon code" placeholder="Enter code" value={couponDraft} autoCapitalize="characters" autoCorrect={false} onChangeText={v=>setCouponDraft(v.toUpperCase().trim())}/><View style={c.couponActions}>{!!coupon && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setCoupon(""); setCouponDraft(""); setError(""); }} style={c.couponRemove}><Text style={c.couponRemoveText}>Remove {coupon}</Text></Pressable>}<Pressable accessibilityRole="button" disabled={busy || !couponDraft || couponDraft === coupon} onPress={() => { setError(""); setCoupon(couponDraft); }} style={({ pressed }) => [c.couponApply, (busy || !couponDraft || couponDraft === coupon) && c.checkoutDisabled, pressed && c.pressed]}><Text style={c.couponApplyText}>{couponDraft === coupon && coupon ? "Code added" : "Apply code"}</Text></Pressable></View></View></ThemeContent>
          <ThemeContent><View style={c.summary}>
            <View style={c.summaryHead}><View style={c.summaryIcon}><ShieldCheck size={21} color={darkMode ? "#FFB89F" : colors.green} /></View><View style={{ flex: 1 }}><Text style={c.summaryTitle}>Price details</Text><Text style={c.summaryCopy}>{verifiedQuote ? "Latest total verified by Campus Drop" : "Final total appears after address selection"}</Text></View></View>
            {[
              ["Items", verifiedQuote?.subtotalPaise ?? subtotal],
              ["Coupon savings", -(verifiedQuote?.discountPaise || 0)],
              ["Delivery", verifiedQuote?.deliveryFeePaise ?? campus?.deliveryFeePaise ?? 0],
              ["Platform fee", verifiedQuote?.platformFeePaise ?? campus?.platformFeePaise ?? 0],
              [verifiedQuote ? "Total to pay" : "Estimated total", verifiedQuote?.totalPaise ?? subtotal + fee],
            ].map(([label, value]) => (
              <View style={[c.totalRow, (label === "Total to pay" || label === "Estimated total") && c.grandTotal]} key={String(label)}>
                <Text style={label === "Total to pay" || label === "Estimated total" ? c.grandLabel : c.totalLabel}>{label}</Text>
                <Text style={label === "Total to pay" || label === "Estimated total" ? c.grandValue : c.totalValue}>{money(Number(value))}</Text>
              </View>
            ))}
          </View></ThemeContent>
          <ThemeContent><View style={c.sectionHeading}><View><Text style={c.sectionEyebrow}>PAYMENT METHOD</Text><Text style={c.sectionTitle}>Pay on delivery</Text></View></View><View style={c.paymentCard}><View style={c.paymentIcon}><CreditCard size={21} color={darkMode ? "#FFB89F" : colors.green} /></View><View style={{ flex: 1 }}><Text style={c.paymentTitle}>Cash on delivery</Text><Text style={c.paymentCopy}>Pay when your campus order arrives.</Text></View><CircleCheck size={20} color={colors.success} /></View></ThemeContent>
        </>
      ) : (
        <>
          <ThemeContent><View style={c.emptyCard}><View style={c.emptyHalo}><ShoppingCart size={48} color={darkMode ? "#FFB89F" : colors.green} strokeWidth={1.7} /></View><Text style={c.emptyTitle}>{isBuyNow ? "Nothing selected" : "Your cart feels lonely"}</Text><Text style={c.emptyCopy}>{isBuyNow ? "Go back and choose the product you want to buy now." : "Explore campus favourites, add what you love, and come back when you’re ready to order."}</Text><Pressable accessibilityRole="button" onPress={() => isBuyNow && router.canGoBack() ? router.back() : router.push("/(tabs)/home")} style={({ pressed }) => [c.exploreButton, pressed && c.checkoutPressed]}><Text style={c.exploreText}>{isBuyNow ? "Go back" : "Explore campus"}</Text><ChevronRight size={18} color="#FFFFFF" /></Pressable></View></ThemeContent>
        </>
      )}
    </Screen>
    <Modal animationType="fade" onRequestClose={viewOrders} statusBarTranslucent transparent visible={Boolean(placedReceipt)}>
      <View style={c.receiptBackdrop}>
        <View style={[c.receiptCard, darkMode && c.receiptCardDark]}>
          <View style={c.receiptGlow} />
          <View style={c.receiptIcon}><CircleCheck size={34} color="#FFFFFF" strokeWidth={2.5} /></View>
          <Text style={c.receiptEyebrow}>ORDER CONFIRMED</Text>
          <Text accessibilityRole="header" style={[c.receiptTitle, darkMode && c.receiptTitleDark]}>{placedReceipt?.shops.length === 1 ? "Your order is placed" : `${placedReceipt?.shops.length ?? 0} shop orders placed`}</Text>
          <Text style={[c.receiptCopy, darkMode && c.receiptCopyDark]}>{placedReceipt?.shops.length === 1 ? "Your shop is getting everything ready." : "Each shop received its own order and will prepare it separately."}</Text>
          <View style={c.receiptOrders}>
            {placedReceipt?.shops.map((shop) => <View key={shop.code} style={[c.receiptOrder, darkMode && c.receiptOrderDark]}>
              <View style={c.receiptShopIcon}><Store size={17} color={colors.green} /></View>
              <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={[c.receiptShopName, darkMode && c.receiptTitleDark]}>{shop.name}</Text><Text style={[c.receiptOrderCode, darkMode && c.receiptCopyDark]}>Order {shop.code}</Text></View>
              <Text style={c.receiptOrderTotal}>{money(shop.totalPaise)}</Text>
            </View>)}
          </View>
          <View style={c.receiptTotalRow}><Text style={[c.receiptTotalLabel, darkMode && c.receiptCopyDark]}>TOTAL DUE ON DELIVERY</Text><Text style={c.receiptTotal}>{money(placedReceipt?.totalPaise ?? 0)}</Text></View>
          <Pressable accessibilityRole="button" onPress={viewOrders} style={({ pressed }) => [c.receiptButton, pressed && c.checkoutPressed]}><Text style={c.receiptButtonText}>Track my orders</Text><ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} /></Pressable>
          <Text style={[c.receiptFootnote, darkMode && c.receiptCopyDark]}>Pay each shop when its order arrives.</Text>
        </View>
      </View>
    </Modal>
    </>
  );
}

const c = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 13, paddingTop: 3, marginBottom: 22 },
  back: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  backText: { color: colors.ink, fontSize: 33, lineHeight: 35, marginTop: -4 },
  pressed: { opacity: .72, transform: [{ scale: .95 }] },
  eyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  title: { color: colors.ink, fontSize: 29, letterSpacing: -1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  buyNowBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 16, backgroundColor: "#E8F5ED", borderWidth: 1, borderColor: "#C7E3D2", marginBottom: 16 },
  buyNowTitle: { color: colors.success, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  buyNowCopy: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  vendorStrip: { minHeight: 89, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: colors.navy, borderRadius: 23, padding: 17, marginBottom: 22, boxShadow: "0px 8px 20px rgba(24,50,61,0.14)" },
  vendorMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  vendorLabel: { color: "#B4C8CA", fontSize: 9, letterSpacing: 1.2, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  vendorName: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 3 },
  vendorMeta: { color: "#D4E2E1", fontSize: 10, marginTop: 4 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20, marginBottom: 13 },
  sectionEyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.3, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 5 },
  sectionTitle: { color: colors.ink, fontSize: 21, letterSpacing: -.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  clearLink: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.lime },
  clearText: { color: colors.green, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  clearPanel: { backgroundColor: "#FFF4EE", borderWidth: 1, borderColor: "#F1CDBC", borderRadius: 17, padding: 15, marginBottom: 15 },
  clearPanelTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  clearPanelCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  clearActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 13 },
  keepButton: { minHeight: 35, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 13, justifyContent: "center" },
  keepText: { color: colors.ink, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  confirmClear: { minHeight: 35, borderRadius: 10, backgroundColor: colors.green, paddingHorizontal: 13, justifyContent: "center" },
  confirmClearText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  lineCard: { padding: 14, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 12, boxShadow: "0px 6px 18px rgba(24,50,61,0.06)" },
  lineMain: { flexDirection: "row", gap: 14 },
  lineImageWrap: { width: 104, height: 104, borderRadius: 17, overflow: "hidden", backgroundColor: "#F0F2EC" },
  lineImage: { width: "100%", height: "100%" },
  lineFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF2ED" },
  lineInitial: { color: colors.green, fontSize: 32, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  lineBody: { flex: 1, minWidth: 0, paddingVertical: 2 },
  lineTop: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  lineName: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  lineUnit: { color: colors.muted, fontSize: 11, marginTop: 7 },
  lineStatus: { color: colors.success, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", marginTop: 8 },
  lineStatusOff: { color: colors.green },
  remove: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  lineFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 13 },
  lineTotalLabel: { color: colors.muted, fontSize: 8, letterSpacing: 1.1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 3 },
  linePrice: { color: colors.green, fontSize: 18, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  stepper: { height: 42, flexDirection: "row", alignItems: "center", borderRadius: 13, backgroundColor: colors.lime, borderWidth: 1, borderColor: "#F3D7C9", paddingHorizontal: 3 },
  stepButton: { width: 35, height: 35, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  stepPressed: { backgroundColor: colors.lime, transform: [{ scale: .92 }] },
  stepCount: { minWidth: 35, textAlign: "center", color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  noteToggle: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 37, marginTop: 10, paddingHorizontal: 2 },
  noteToggleText: { flex: 1, color: colors.green, fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  noteField: { paddingTop: 5 },
  cartActions: { flexDirection: "row", gap: 9, marginTop: 3, marginBottom: 7 },
  addMoreButton: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 9, borderRadius: 15, backgroundColor: colors.lime },
  addMoreText: { color: colors.green, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", flexShrink: 1 },
  refreshButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10 },
  refreshText: { color: colors.green, fontSize: 10, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  refreshSuccess: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#E8F5ED", marginBottom: 12 },
  refreshSuccessText: { color: colors.success, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  addressCard: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 13, padding: 14, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 10 },
  addressSelected: { borderColor: colors.green, borderWidth: 1.5, backgroundColor: "#FFFAF7" },
  addressIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  addressIconSelected: { backgroundColor: colors.green },
  addressLabel: { color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  addressDetails: { color: colors.muted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#BBC3BE", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.green },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  addAddress: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 17, borderWidth: 1, borderStyle: "dashed", borderColor: "#E3B4A4", paddingHorizontal: 13, backgroundColor: colors.surface, marginBottom: 13 },
  addAddressIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  addAddressText: { flex: 1, color: colors.green, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  summary: { marginTop: 22, padding: 19, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 7px 22px rgba(24,50,61,0.065)" },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 13 },
  summaryIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  summaryTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  summaryCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  totalRow: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  totalLabel: { color: colors.muted, fontSize: 12 },
  totalValue: { color: colors.ink, fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  grandTotal: { minHeight: 58, borderBottomWidth: 0, marginTop: 5 },
  grandLabel: { color: colors.ink, fontSize: 14, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  grandValue: { color: colors.green, fontSize: 22, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  couponCard: { padding: 17, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginTop: 2 },
  couponHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  couponIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  couponTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  couponCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  couponActions: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  couponRemove: { minHeight: 40, justifyContent: "center", paddingHorizontal: 8 },
  couponRemoveText: { color: colors.green, fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  couponApply: { minHeight: 40, justifyContent: "center", paddingHorizontal: 17, borderRadius: 12, backgroundColor: colors.green },
  couponApplyText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  paymentCard: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 19, padding: 15, marginTop: 2 },
  paymentIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  paymentTitle: { color: colors.ink, fontSize: 13, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  paymentCopy: { color: colors.muted, fontSize: 10, marginTop: 4 },
  checkoutButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.green, borderRadius: 16 },
  checkoutDisabled: { opacity: .5 },
  checkoutPressed: { opacity: .82, transform: [{ scale: .985 }] },
  checkoutText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  stickyBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, boxShadow: "0px -7px 20px rgba(24,50,61,0.08)" },
  stickyInner: { width: "100%", maxWidth: 760, alignSelf: "center", paddingHorizontal: 22, paddingTop: 12, paddingBottom: 10 },
  stickyTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 11 },
  stickyLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  stickyAmount: { color: colors.ink, fontSize: 22, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 1 },
  stickyPayment: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, backgroundColor: "#EAF6EF", paddingHorizontal: 9, paddingVertical: 7 },
  stickyPaymentText: { color: "#267F54", fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  stickyHint: { color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: "center", marginTop: 7 },
  emptyCard: { minHeight: 380, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", padding: 26, marginTop: 18 },
  emptyHalo: { width: 110, height: 110, borderRadius: 38, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { color: colors.ink, fontSize: 21, letterSpacing: -.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", textAlign: "center" },
  emptyCopy: { color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 8, maxWidth: 270 },
  exploreButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 14, backgroundColor: colors.green, paddingHorizontal: 20, marginTop: 22 },
  exploreText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "rgba(9,25,31,.68)" },
  receiptCard: { width: "100%", maxWidth: 450, maxHeight: "90%", overflow: "hidden", borderRadius: 28, backgroundColor: "#FFFFFF", padding: 23, borderWidth: 1, borderColor: "rgba(255,255,255,.68)", boxShadow: "0px 18px 48px rgba(0,0,0,.26)" },
  receiptCardDark: { backgroundColor: "#18272C", borderColor: "#304247" },
  receiptGlow: { position: "absolute", top: -100, right: -70, width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(217,79,50,.10)" },
  receiptIcon: { width: 62, height: 62, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.success, marginBottom: 17, boxShadow: "0px 8px 20px rgba(35,155,104,.25)" },
  receiptEyebrow: { color: colors.success, fontSize: 9, letterSpacing: 1.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptTitle: { color: colors.ink, fontSize: 25, lineHeight: 31, letterSpacing: -.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 5 },
  receiptTitleDark: { color: "#F4F6F3" },
  receiptCopy: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  receiptCopyDark: { color: "#A7B3B4" },
  receiptOrders: { gap: 8, marginTop: 19 },
  receiptOrder: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 16, backgroundColor: "#F8F7F3", borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, paddingVertical: 9 },
  receiptOrderDark: { backgroundColor: "#1A292E", borderColor: "#304247" },
  receiptShopIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime },
  receiptShopName: { color: colors.ink, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptOrderCode: { color: colors.muted, fontSize: 9, marginTop: 3 },
  receiptOrderTotal: { color: colors.green, fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 15, marginTop: 16 },
  receiptTotalLabel: { color: colors.muted, fontSize: 8, letterSpacing: .8, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptTotal: { color: colors.ink, fontSize: 21, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptButton: { minHeight: 53, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 15, backgroundColor: colors.green, marginTop: 19 },
  receiptButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  receiptFootnote: { color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 10 },
});

