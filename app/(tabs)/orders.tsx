import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ChefHat from "lucide-react-native/icons/chef-hat";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleX from "lucide-react-native/icons/circle-x";
import Clock3 from "lucide-react-native/icons/clock-3";
import MapPin from "lucide-react-native/icons/map-pin";
import PackageCheck from "lucide-react-native/icons/package-check";
import ReceiptText from "lucide-react-native/icons/receipt-text";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import ShoppingBag from "lucide-react-native/icons/shopping-bag";
import Star from "lucide-react-native/icons/star";
import Truck from "lucide-react-native/icons/truck";
import X from "lucide-react-native/icons/x";
import type { LucideIcon } from "lucide-react-native";
import { request, type Order, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import { CartButton } from "../../src/cart-button";
import { Field, Notice, Screen, ThemeContent, colors, money } from "../../src/ui";
import { useAppTheme } from "../../src/theme";

const next: Record<string, [string, string]> = {
  PLACED: ["VENDOR_ACCEPTED", "Accept order"],
  VENDOR_ACCEPTED: ["PREPARING", "Start preparing"],
  PREPARING: ["READY_FOR_PICKUP", "Mark as ready"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "Start delivery"],
  OUT_FOR_DELIVERY: ["DELIVERED", "Confirm delivery"],
};

type OrderFilter = "ALL" | "ACTIVE" | "PAST";
type StatusTone = "orange" | "blue" | "green" | "muted" | "red";
type StatusMeta = { label: string; description: string; tone: StatusTone; Icon: LucideIcon };

const terminalStatuses = ["DELIVERED", "CANCELLED_BY_USER", "CANCELLED_BY_VENDOR", "CANCELLED_BY_ADMIN", "PAYMENT_FAILED", "REFUNDED"];
const statusMeta: Record<string, StatusMeta> = {
  PLACED: { label: "Order placed", description: "Waiting for the shop to confirm", tone: "orange", Icon: Clock3 },
  VENDOR_ACCEPTED: { label: "Confirmed", description: "The shop accepted your order", tone: "blue", Icon: CircleCheck },
  PREPARING: { label: "Preparing", description: "Your order is being prepared", tone: "blue", Icon: ChefHat },
  READY_FOR_PICKUP: { label: "Ready", description: "Packed and ready for delivery", tone: "green", Icon: PackageCheck },
  OUT_FOR_DELIVERY: { label: "On the way", description: "Your campus delivery is moving", tone: "green", Icon: Truck },
  DELIVERED: { label: "Delivered", description: "Order completed successfully", tone: "green", Icon: CircleCheck },
  CANCELLED_BY_USER: { label: "Cancelled", description: "Cancelled by you", tone: "red", Icon: CircleX },
  CANCELLED_BY_VENDOR: { label: "Cancelled", description: "Cancelled by the shop", tone: "red", Icon: CircleX },
  CANCELLED_BY_ADMIN: { label: "Cancelled", description: "Cancelled by support", tone: "red", Icon: CircleX },
  PAYMENT_FAILED: { label: "Payment failed", description: "Payment could not be completed", tone: "red", Icon: CircleX },
  REFUNDED: { label: "Refunded", description: "Your payment was refunded", tone: "muted", Icon: RotateCcw },
};

export default function Orders() {
  const { session, replaceCart, cart } = useSession();
  const {darkMode}=useAppTheme();
  const vendor = session!.user.role === "VENDOR";
  const token = session!.accessToken;
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OrderFilter>(vendor ? "ACTIVE" : "ALL");
  const [expanded, setExpanded] = useState("");
  const [cancelling, setCancelling] = useState("");
  const [details, setDetails] = useState<Record<string, Order>>({});

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await request<{ items: Order[]; total: number }>(`/orders?page=${page}`, token);
      setOrders(result.items);
      setTotal(result.total);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useFocusEffect(useCallback(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]));

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const past = terminalStatuses.includes(order.status);
    return filter === "ALL" || (filter === "ACTIVE" ? !past : past);
  }), [filter, orders]);
  const activeCount = orders.filter((order) => !terminalStatuses.includes(order.status)).length;

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function change(order: Order, status: string) {
    setBusy(true);
    setError("");
    try {
      await request(`/orders/${order.id}/status`, token, "PATCH", {
        status,
        ...(status === "DELIVERED" ? { pin: pins[order.id] || "" } : {}),
        ...(status.startsWith("CANCELLED") ? { reason: reasons[order.id] || "" } : {}),
      });
      setCancelling("");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function collect(order: Order) {
    setBusy(true);
    setError("");
    try {
      await request(`/orders/${order.id}/cash`, token, "POST", { amountPaise: order.totalPaise });
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reorder(order: Order) {
    setBusy(true);
    setError("");
    try {
      const lines = await Promise.all(order.items.map(async (item) => ({ product: await request<Product>(`/products/${item.productId}`, token), quantity: item.quantity })));
      if (lines.some((line) => !line.product.available || !line.product.vendor.acceptingOrders || (line.product.stock !== null && line.product.stock < line.quantity))) throw new Error("Some items are unavailable. Please browse the shop again.");
      const apply = () => { replaceCart(lines); router.push("/basket"); };
      if (cart.length) Alert.alert("Replace current basket?", "Reorder uses current prices and availability.", [{ text: "Keep basket", style: "cancel" }, { text: "Replace", onPress: apply }]);
      else apply();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleDetails(order: Order) {
    if (expanded === order.id) {
      setExpanded("");
      return;
    }
    setExpanded(order.id);
    if (!details[order.id]) {
      try {
        const detail = await request<Order>(`/orders/${order.id}`, token);
        setDetails((current) => ({ ...current, [order.id]: detail }));
      } catch (caught) {
        setError((caught as Error).message);
      }
    }
  }

  return <Screen backgroundColor="#F5F4F0">
    <View style={o.header}>
      <View style={{ flex: 1 }}><Text style={o.eyebrow}>{vendor ? "SELLER OPERATIONS" : "CAMPUS DELIVERY"}</Text><Text style={o.title}>{vendor ? "Order inbox" : "Your orders"}</Text><Text style={o.subtitle}>{vendor ? "Move new orders from acceptance to delivery." : "Track every craving from the shop to your door."}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh orders" disabled={refreshing} onPress={() => void refresh()} style={({ pressed }) => [o.refreshButton, pressed && o.pressed]}><RefreshCw size={19} color={colors.green} strokeWidth={2} style={refreshing ? { opacity: .45 } : undefined} /></Pressable>
      {!vendor && <CartButton compact />}
    </View>

    <View style={o.summaryCard}>
      <View style={o.summaryGlow} />
      <View style={o.summaryIcon}><ShoppingBag size={22} color="#FFD4C5" strokeWidth={1.8} /></View>
      <View style={{ flex: 1 }}><Text style={o.summaryLabel}>{vendor ? "LIVE ORDER QUEUE" : "ORDER ACTIVITY"}</Text><Text style={o.summaryValue}>{activeCount} active</Text><Text style={o.summaryMeta}>{total} total {total === 1 ? "order" : "orders"}{vendor ? " · Auto-refreshes every 15 sec" : " · On this page"}</Text></View>
      <View style={o.livePill}><View style={o.liveDot} /><Text style={o.liveText}>LIVE</Text></View>
    </View>

    {error && <Notice text={error} />}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={o.filters}>
      {([['ALL', 'All orders'], ['ACTIVE', 'Active'], ['PAST', 'Past orders']] as [OrderFilter, string][]).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => [o.filter, filter === value && o.filterActive, pressed && o.pressed]}><Text style={[o.filterText, filter === value && o.filterTextActive]}>{label}{value === "ACTIVE" && activeCount ? `  ${activeCount}` : ""}</Text></Pressable>)}
    </ScrollView>

    <View style={o.listHeading}><Text style={o.listTitle}>{filter === "ACTIVE" ? "In progress" : filter === "PAST" ? "Order history" : "Recent orders"}</Text><Text style={o.listCount}>{visibleOrders.length} shown</Text></View>
    {loading ? <OrderSkeleton /> : visibleOrders.map((order) => <OrderCard
      key={order.id}
      order={order}
      detail={details[order.id]}
      vendor={vendor}
      busy={busy}
      open={expanded === order.id}
      cancelling={cancelling === order.id}
      pin={pins[order.id] || ""}
      reason={reasons[order.id] || ""}
      onToggle={() => void toggleDetails(order)}
      onReorder={() => void reorder(order)}
      onReview={() => router.push({ pathname: "/review", params: { orderId: order.id } })}
      onAdvance={() => void change(order, next[order.status][0])}
      onCollect={() => Alert.alert("Confirm cash received", `Have you collected ${money(order.totalPaise)} in cash?`, [{ text: "Not yet", style: "cancel" }, { text: "Cash received", onPress: () => void collect(order) }])}
      onPinChange={(value) => setPins((current) => ({ ...current, [order.id]: value.replace(/\D/g, "").slice(0, 6) }))}
      onReasonChange={(value) => setReasons((current) => ({ ...current, [order.id]: value }))}
      onToggleCancel={() => setCancelling((current) => current === order.id ? "" : order.id)}
      onCancel={() => Alert.alert("Cancel this order?", "The cancellation will be recorded and reserved stock released.", [{ text: "Keep order", style: "cancel" }, { text: "Confirm cancellation", style: "destructive", onPress: () => void change(order, vendor ? "CANCELLED_BY_VENDOR" : "CANCELLED_BY_USER") }])}
    />)}

    {!loading && !visibleOrders.length && <View style={o.empty}><View style={o.emptyIcon}><ShoppingBag size={30} color={colors.green} strokeWidth={1.7} /></View><Text style={o.emptyTitle}>{filter === "ACTIVE" ? "No active orders" : filter === "PAST" ? "No past orders yet" : vendor ? "Your order queue is ready" : "Good things are on the way"}</Text><Text style={o.emptyCopy}>{filter === "ACTIVE" ? "New and ongoing orders will appear here." : filter === "PAST" ? "Completed and cancelled orders will be kept here." : vendor ? "New campus orders will appear as soon as students order." : "Your campus orders and delivery updates will appear here."}</Text></View>}

    {(page > 1 || page * 30 < total) && <View style={o.pagination}>
      <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage((value) => Math.max(1, value - 1))} style={({ pressed }) => [o.pageButton, page <= 1 && o.pageDisabled, pressed && page > 1 && o.pressed]}><ChevronLeft size={17} color={darkMode?"#F4F6F3":colors.ink} /><Text style={o.pageText}>Previous</Text></Pressable>
      <View style={o.pageNumber}><Text style={o.pageNumberText}>{page}</Text></View>
      <Pressable accessibilityRole="button" disabled={page * 30 >= total} onPress={() => setPage((value) => value + 1)} style={({ pressed }) => [o.pageButton, page * 30 >= total && o.pageDisabled, pressed && page * 30 < total && o.pressed]}><Text style={o.pageText}>Next</Text><ChevronRight size={17} color={darkMode?"#F4F6F3":colors.ink} /></Pressable>
    </View>}
  </Screen>;
}

function OrderCard({ order, detail, vendor, busy, open, cancelling, pin, reason, onToggle, onReorder, onReview, onAdvance, onCollect, onPinChange, onReasonChange, onToggleCancel, onCancel }: {
  order: Order;
  detail?: Order;
  vendor: boolean;
  busy: boolean;
  open: boolean;
  cancelling: boolean;
  pin: string;
  reason: string;
  onToggle: () => void;
  onReorder: () => void;
  onReview: () => void;
  onAdvance: () => void;
  onCollect: () => void;
  onPinChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onToggleCancel: () => void;
  onCancel: () => void;
}) {
  const {darkMode}=useAppTheme();
  const meta = statusMeta[order.status] || { label: order.status.replaceAll("_", " "), description: "Order status updated", tone: "muted" as const, Icon: Clock3 };
  const cancelled = order.status.startsWith("CANCELLED") || order.status === "PAYMENT_FAILED";
  const active = !terminalStatuses.includes(order.status);
  const canCancel = order.status === "PLACED" || (vendor && order.status === "VENDOR_ACCEPTED");
  const canCollect = vendor && ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status) && !order.cashCollectedAt;
  const action = vendor ? next[order.status] : undefined;

  return <ThemeContent><View style={o.card}>
    <View style={o.cardTop}>
      <View style={[o.statusIcon, toneBackground(meta.tone)]}><meta.Icon size={20} color={toneColor(meta.tone)} strokeWidth={2} /></View>
      <View style={{ flex: 1 }}><Text style={o.orderCode}>{order.code}</Text><View style={o.dateLine}><CalendarDays size={11} color={darkMode?"#A7B3B4":colors.muted} strokeWidth={1.8} /><Text style={o.orderDate}>{formatOrderDate(order.createdAt)}</Text></View></View>
      <View style={[o.statusBadge, toneBackground(meta.tone)]}><Text style={[o.statusBadgeText, { color: toneColor(meta.tone) }]}>{meta.label.toUpperCase()}</Text></View>
    </View>

    <Text style={o.statusDescription}>{meta.description}</Text>
    {active && !cancelled && <OrderProgress status={order.status} />}

    <View style={o.itemsBox}>
      {order.items.slice(0, 3).map((item) => <View key={item.id} style={o.itemRow}><View style={o.quantityBubble}><Text style={o.quantityText}>{item.quantity}×</Text></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={o.itemName}>{item.name}</Text>{item.note ? <Text numberOfLines={1} style={o.itemNote}>{item.note}</Text> : null}</View><Text style={o.itemPrice}>{money(item.unitPricePaise * item.quantity)}</Text></View>)}
      {order.items.length > 3 && <Text style={o.moreItems}>+ {order.items.length - 3} more {order.items.length - 3 === 1 ? "item" : "items"}</Text>}
      <View style={o.totalRow}><Text style={o.totalLabel}>{order.items.reduce((count, item) => count + item.quantity, 0)} items · Order total</Text><Text style={o.totalValue}>{money(order.totalPaise)}</Text></View>
    </View>

    {!vendor && order.deliveryPin && active && <View style={o.pinCard}><View><Text style={o.pinLabel}>DELIVERY PIN</Text><Text style={o.pinHint}>Share only after your order arrives</Text></View><Text accessibilityLabel={`Delivery PIN ${order.deliveryPin}`} style={o.pinValue}>{order.deliveryPin}</Text></View>}

    {vendor && order.status === "OUT_FOR_DELIVERY" && <View style={o.vendorInput}><Field label="Customer’s six-digit delivery PIN" value={pin} onChangeText={onPinChange} keyboardType="number-pad" maxLength={6} /></View>}

    {action && <Pressable accessibilityRole="button" disabled={busy || (order.status === "OUT_FOR_DELIVERY" && pin.length !== 6)} onPress={onAdvance} style={({ pressed }) => [o.primaryAction, (busy || (order.status === "OUT_FOR_DELIVERY" && pin.length !== 6)) && o.disabled, pressed && !busy && o.primaryPressed]}><Text style={o.primaryActionText}>{action[1]}</Text><ChevronRight size={18} color="#FFFFFF" strokeWidth={2.2} /></Pressable>}

    <View style={o.actions}>
      <ActionButton Icon={open ? ChevronUp : ChevronDown} label={open ? "Hide details" : "Details"} onPress={onToggle} disabled={busy} />
      {!vendor && !cancelled && <ActionButton Icon={RotateCcw} label="Order again" onPress={onReorder} disabled={busy} />}
      {!vendor && order.status === "DELIVERED" && <ActionButton Icon={Star} label="Rate order" onPress={onReview} disabled={busy} accent />}
      {canCollect && <ActionButton Icon={ReceiptText} label="Cash received" onPress={onCollect} disabled={busy} />}
      {canCancel && <ActionButton Icon={X} label={vendor ? "Reject" : "Cancel"} onPress={onToggleCancel} disabled={busy} danger />}
    </View>

    {cancelling && canCancel && <View style={o.cancelPanel}><Text style={o.cancelTitle}>{vendor ? "Reject or cancel this order" : "Cancel this order"}</Text><Text style={o.cancelCopy}>Add a short reason so the cancellation is clear.</Text><Field label="Cancellation reason" value={reason} onChangeText={onReasonChange} placeholder="Tell us why" /><View style={o.cancelActions}><Pressable accessibilityRole="button" onPress={onToggleCancel} style={({ pressed }) => [o.keepButton, pressed && o.pressed]}><Text style={o.keepButtonText}>Keep order</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={({ pressed }) => [o.cancelButton, busy && o.disabled, pressed && !busy && o.pressed]}><Text style={o.cancelButtonText}>Confirm cancellation</Text></Pressable></View></View>}

    {open && <ExpandedDetails order={order} detail={detail} />}
  </View></ThemeContent>;
}

function ActionButton({ Icon, label, onPress, disabled, accent = false, danger = false }: { Icon: LucideIcon; label: string; onPress: () => void; disabled: boolean; accent?: boolean; danger?: boolean }) {
  const {darkMode}=useAppTheme();
  const color = danger ? "#B64B3C" : accent ? (darkMode?"#C4B5FD":colors.green) : (darkMode?"#F4F6F3":colors.ink);
  return <ThemeContent><Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [o.actionButton, accent && o.actionAccent, danger && o.actionDanger, disabled && o.disabled, pressed && !disabled && o.pressed]}><Icon size={14} color={color} strokeWidth={2} /><Text style={[o.actionText, { color }]}>{label}</Text></Pressable></ThemeContent>;
}

function ExpandedDetails({ order, detail }: { order: Order; detail?: Order }) {
  if (!detail) return <ThemeContent><View style={o.detailsPanel}><Text style={o.loadingDetails}>Loading order details…</Text></View></ThemeContent>;
  return <ThemeContent><View style={o.detailsPanel}>
    <Text style={o.detailHeading}>Order summary</Text>
    <ReceiptRow label="Item subtotal" value={money(detail.subtotalPaise)} />
    <ReceiptRow label="Delivery fee" value={money(detail.deliveryFeePaise)} />
    <ReceiptRow label="Platform fee" value={money(detail.platformFeePaise)} />
    {detail.discountPaise > 0 && <ReceiptRow label="Discount" value={`−${money(detail.discountPaise)}`} success />}
    <View style={o.detailDivider} />
    <View style={o.addressRow}><View style={o.detailIcon}><MapPin size={15} color={colors.green} strokeWidth={2} /></View><View style={{ flex: 1 }}><Text style={o.detailLabel}>DELIVERY ADDRESS</Text><Text style={o.addressText}>{detail.deliveryAddress}</Text></View></View>
    <View style={o.paymentRow}><Text style={o.paymentLabel}>Cash on delivery</Text><Text style={[o.paymentState, detail.paymentStatus === "SUCCESS" && o.paymentSuccess]}>{detail.paymentStatus === "SUCCESS" ? "COLLECTED" : "PAYABLE"}</Text></View>
    {!!detail.history?.length && <View style={o.timeline}><Text style={o.detailHeading}>Order updates</Text>{detail.history.map((entry, index) => <View key={entry.id} style={o.timelineRow}><View style={o.timelineRail}>{index < detail.history!.length - 1 && <View style={o.timelineLine} />}<View style={o.timelineDot} /></View><View style={o.timelineCopy}><Text style={o.timelineTitle}>{humanStatus(entry.status)}</Text><Text style={o.timelineDate}>{formatOrderDate(entry.createdAt)}</Text>{entry.reason ? <Text style={o.timelineReason}>{entry.reason}</Text> : null}</View></View>)}</View>}
    {order.deliveryPin && <View style={o.detailPin}><Text style={o.detailPinLabel}>Delivery PIN</Text><Text style={o.detailPinValue}>{order.deliveryPin}</Text></View>}
  </View></ThemeContent>;
}

function ReceiptRow({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  return <ThemeContent><View style={o.receiptRow}><Text style={o.receiptLabel}>{label}</Text><Text style={[o.receiptValue, success && { color: colors.success }]}>{value}</Text></View></ThemeContent>;
}

const progressStages = ["PLACED", "VENDOR_ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
function OrderProgress({ status }: { status: string }) {
  const normalized = status === "READY_FOR_PICKUP" ? "OUT_FOR_DELIVERY" : status;
  const current = Math.max(0, progressStages.indexOf(normalized));
  return <ThemeContent><View style={o.progress}><View style={o.progressRail} />{progressStages.map((stage, index) => <View key={stage} style={o.progressStage}><View style={[o.progressDot, index <= current && o.progressDotDone, index === current && o.progressDotCurrent]}>{index < current && <Text style={o.progressCheck}>✓</Text>}</View><Text numberOfLines={1} style={[o.progressLabel, index <= current && o.progressLabelActive]}>{["Placed", "Confirmed", "Preparing", "Ready / way", "Delivered"][index]}</Text></View>)}</View></ThemeContent>;
}

function OrderSkeleton() {
  return <ThemeContent>{[0, 1].map((item) => <View key={item} style={o.skeleton}><View style={o.skeletonTop}><View style={o.skeletonIcon} /><View style={{ flex: 1 }}><View style={o.skeletonLine} /><View style={[o.skeletonLine, { width: "42%" }]} /></View></View><View style={o.skeletonItems} /><View style={o.skeletonAction} /></View>)}</ThemeContent>;
}

function toneColor(tone: StatusTone) {
  return tone === "green" ? colors.success : tone === "blue" ? "#34789A" : tone === "red" ? "#B64B3C" : tone === "orange" ? colors.green : "#6E7A7D";
}
function toneBackground(tone: StatusTone) {
  return { backgroundColor: tone === "green" ? "#E8F5EE" : tone === "blue" ? "#E9F2F7" : tone === "red" ? "#FFF0EC" : tone === "orange" ? colors.lime : "#EFF1EF" };
}
function humanStatus(status: string) {
  return statusMeta[status]?.label || status.replaceAll("_", " ").toLowerCase().replace(/^./, (value) => value.toUpperCase());
}
function formatOrderDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const o = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingTop: 4, marginBottom: 19 }, eyebrow: { color: colors.green, fontSize: 9, letterSpacing: 1.7, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 }, title: { color: colors.ink, fontSize: 31, lineHeight: 37, letterSpacing: -1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, subtitle: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 4, maxWidth: 310 }, refreshButton: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: "0px 3px 12px rgba(24,50,61,.055)" }, pressed: { opacity: .72, transform: [{ scale: .97 }] },
  summaryCard: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 23, overflow: "hidden", backgroundColor: colors.navy, padding: 18, marginBottom: 18, boxShadow: "0px 7px 22px rgba(24,50,61,.14)" }, summaryGlow: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "#31525A", right: -52, top: -76 }, summaryIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.10)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)" }, summaryLabel: { color: "#FFB69B", fontSize: 7, letterSpacing: 1.2, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, summaryValue: { color: "#FFFFFF", fontSize: 20, letterSpacing: -.4, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 4 }, summaryMeta: { color: "#BFD0D3", fontSize: 8, marginTop: 3 }, livePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)", paddingHorizontal: 8, paddingVertical: 6 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ED39E" }, liveText: { color: "#FFFFFF", fontSize: 7, letterSpacing: .6, fontWeight: "800" },
  filters: { gap: 8, paddingBottom: 5, paddingRight: 8 }, filter: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, filterActive: { backgroundColor: colors.ink, borderColor: colors.ink }, filterText: { color: colors.ink, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, filterTextActive: { color: "#FFFFFF" }, listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 12 }, listTitle: { color: colors.ink, fontSize: 19, letterSpacing: -.5, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, listCount: { color: colors.muted, fontSize: 9 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: "#E5E7E2", borderRadius: 23, padding: 17, marginBottom: 15, boxShadow: "0px 5px 18px rgba(24,50,61,.055)" }, cardTop: { flexDirection: "row", alignItems: "center", gap: 11 }, statusIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" }, orderCode: { color: colors.ink, fontSize: 14, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, dateLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }, orderDate: { color: colors.muted, fontSize: 8 }, statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, maxWidth: 105 }, statusBadgeText: { fontSize: 7, letterSpacing: .45, textAlign: "center", fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" }, statusDescription: { color: colors.muted, fontSize: 9, marginTop: 11 },
  progress: { height: 47, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", position: "relative", marginTop: 13, marginBottom: 4 }, progressRail: { position: "absolute", left: "8%", right: "8%", top: 7, height: 2, backgroundColor: "#E4E7E3" }, progressStage: { width: "20%", alignItems: "center" }, progressDot: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#E4E7E3", borderWidth: 2, borderColor: colors.surface, zIndex: 2 }, progressDotDone: { backgroundColor: colors.green }, progressDotCurrent: { boxShadow: "0px 0px 0px 4px rgba(217,79,50,.13)" }, progressCheck: { color: "#FFFFFF", fontSize: 7, fontWeight: "900" }, progressLabel: { color: "#9AA2A1", fontSize: 6, marginTop: 5, textAlign: "center" }, progressLabelActive: { color: colors.ink, fontWeight: "700" },
  itemsBox: { borderRadius: 16, backgroundColor: "#F6F6F2", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 11, marginTop: 8 }, itemRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E3E6E1" }, quantityBubble: { minWidth: 26, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, quantityText: { color: colors.green, fontSize: 8, fontWeight: "800" }, itemName: { color: colors.ink, fontSize: 10, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" }, itemNote: { color: colors.muted, fontSize: 7, marginTop: 2 }, itemPrice: { color: colors.ink, fontSize: 9, fontWeight: "700" }, moreItems: { color: colors.green, fontSize: 8, fontWeight: "700", paddingTop: 8 }, totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 11 }, totalLabel: { color: colors.muted, fontSize: 8 }, totalValue: { color: colors.ink, fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  pinCard: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 15, backgroundColor: "#FFF2EC", borderWidth: 1, borderColor: "#F4D7CB", paddingHorizontal: 14, marginTop: 12 }, pinLabel: { color: colors.green, fontSize: 7, letterSpacing: .9, fontWeight: "900" }, pinHint: { color: colors.muted, fontSize: 7, marginTop: 3 }, pinValue: { color: colors.ink, fontSize: 19, letterSpacing: 3, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, vendorInput: { marginTop: 13 }, primaryAction: { minHeight: 49, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 15, backgroundColor: colors.green, paddingHorizontal: 17, marginTop: 12, boxShadow: "0px 5px 14px rgba(217,79,50,.18)" }, primaryActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, primaryPressed: { opacity: .86, transform: [{ scale: .99 }] }, disabled: { opacity: .45 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }, actionButton: { minHeight: 39, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: "#F3F4F1", borderWidth: 1, borderColor: "#E5E7E2", paddingHorizontal: 11, flexGrow: 1 }, actionAccent: { backgroundColor: colors.lime, borderColor: "#F1D2C6" }, actionDanger: { backgroundColor: "#FFF3EF", borderColor: "#F0D5CD" }, actionText: { fontSize: 8, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, cancelPanel: { borderRadius: 17, backgroundColor: "#FFF7F4", borderWidth: 1, borderColor: "#F0D7CF", padding: 13, marginTop: 12 }, cancelTitle: { color: "#713E35", fontSize: 11, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, cancelCopy: { color: "#9B766F", fontSize: 8, marginTop: 3, marginBottom: 11 }, cancelActions: { flexDirection: "row", gap: 8 }, keepButton: { minHeight: 42, flex: 1, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, keepButtonText: { color: colors.ink, fontSize: 9, fontWeight: "800" }, cancelButton: { minHeight: 42, flex: 1.3, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#B64B3C" }, cancelButtonText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
  detailsPanel: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 14 }, loadingDetails: { color: colors.muted, fontSize: 9, textAlign: "center", paddingVertical: 15 }, detailHeading: { color: colors.ink, fontSize: 12, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", marginBottom: 7 }, receiptRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 5 }, receiptLabel: { color: colors.muted, fontSize: 9 }, receiptValue: { color: colors.ink, fontSize: 9, fontWeight: "700" }, detailDivider: { height: 1, backgroundColor: colors.line, marginVertical: 10 }, addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, detailIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime }, detailLabel: { color: colors.muted, fontSize: 7, letterSpacing: .8, fontWeight: "800" }, addressText: { color: colors.ink, fontSize: 9, lineHeight: 14, marginTop: 3 }, paymentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, backgroundColor: "#F3F4F1", padding: 11, marginTop: 11 }, paymentLabel: { color: colors.ink, fontSize: 9, fontWeight: "700" }, paymentState: { color: colors.green, fontSize: 7, fontWeight: "900", letterSpacing: .6 }, paymentSuccess: { color: colors.success }, timeline: { marginTop: 16 }, timelineRow: { minHeight: 44, flexDirection: "row" }, timelineRail: { width: 24, alignItems: "center" }, timelineLine: { position: "absolute", top: 10, bottom: -5, width: 1.5, backgroundColor: "#DDE1DC" }, timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface, zIndex: 2 }, timelineCopy: { flex: 1, paddingBottom: 11 }, timelineTitle: { color: colors.ink, fontSize: 9, fontWeight: "800" }, timelineDate: { color: colors.muted, fontSize: 7, marginTop: 2 }, timelineReason: { color: "#9A655B", fontSize: 8, marginTop: 3 }, detailPin: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, backgroundColor: colors.lime, padding: 11, marginTop: 7 }, detailPinLabel: { color: colors.green, fontSize: 8, fontWeight: "800" }, detailPinValue: { color: colors.ink, fontSize: 14, letterSpacing: 2, fontWeight: "800" },
  empty: { alignItems: "center", borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 25, paddingVertical: 38 }, emptyIcon: { width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.lime, marginBottom: 12 }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" }, emptyCopy: { maxWidth: 290, color: colors.muted, fontSize: 10, lineHeight: 17, textAlign: "center", marginTop: 6 }, pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 7 }, pageButton: { minHeight: 45, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, pageDisabled: { opacity: .35 }, pageText: { color: colors.ink, fontSize: 9, fontWeight: "800" }, pageNumber: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy }, pageNumberText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  skeleton: { borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 17, marginBottom: 15 }, skeletonTop: { flexDirection: "row", gap: 11, alignItems: "center" }, skeletonIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#ECEEEA" }, skeletonLine: { width: "68%", height: 9, borderRadius: 5, backgroundColor: "#ECEEEA", marginVertical: 4 }, skeletonItems: { height: 98, borderRadius: 16, backgroundColor: "#F1F2EF", marginTop: 15 }, skeletonAction: { height: 40, borderRadius: 13, backgroundColor: "#ECEEEA", marginTop: 12 },
});
