import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Alert, Text, View } from "react-native";
import { request, type Order, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import { Button, Field, Notice, Screen, Title, money, s } from "../../src/ui";
const next: Record<string, [string, string]> = {
  PLACED: ["VENDOR_ACCEPTED", "Accept order"],
  VENDOR_ACCEPTED: ["PREPARING", "Start preparing"],
  PREPARING: ["READY_FOR_PICKUP", "Mark ready"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "Start delivery"],
  OUT_FOR_DELIVERY: ["DELIVERED", "Confirm delivery"],
};
export default function Orders() {
  const { session, replaceCart, cart } = useSession();
  const vendor = session!.user.role === "VENDOR";
  const token = session!.accessToken;
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState("");
  const [details, setDetails] = useState<Record<string, Order>>({});
  const load = useCallback(async () => {
    try {
      const result = await request<{ items: Order[]; total: number }>(
        `/orders?page=${page}`,
        token,
      );
      setOrders(result.items);
      setTotal(result.total);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, page]);
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 15000);
      return () => clearInterval(timer);
    }, [load]),
  );
  async function change(o: Order, status: string) {
    setBusy(true);
    setError("");
    try {
      await request(`/orders/${o.id}/status`, token, "PATCH", {
        status,
        ...(status === "DELIVERED" ? { pin: pins[o.id] || "" } : {}),
        ...(status.startsWith("CANCELLED")
          ? { reason: reasons[o.id] || "" }
          : {}),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function collect(o: Order) {
    setBusy(true);
    try {
      await request(`/orders/${o.id}/cash`, token, "POST", {
        amountPaise: o.totalPaise,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(o:Order){
    setBusy(true);try{
      const lines=await Promise.all(o.items.map(async i=>({product:await request<Product>(`/products/${i.productId}`,token),quantity:i.quantity})));
      if(lines.some(l=>!l.product.available||!l.product.vendor.acceptingOrders||(l.product.stock!==null&&l.product.stock<l.quantity)))throw new Error('Some items are unavailable. Please browse the shop again.');
      const apply=()=>{replaceCart(lines);router.push('/(tabs)/cart')};
      if(cart.length)Alert.alert('Replace current basket?','Reorder uses current prices and availability.',[{text:'Keep basket',style:'cancel'},{text:'Replace',onPress:apply}]);else apply();
    }catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  async function toggleDetails(order: Order) {
    if (expanded === order.id) { setExpanded(""); return; }
    setExpanded(order.id);
    if (!details[order.id]) {
      try { const detail = await request<Order>(`/orders/${order.id}`, token); setDetails((current) => ({ ...current, [order.id]: detail })); }
      catch (caught) { setError((caught as Error).message); }
    }
  }

  if (!vendor) return (
    <Screen>
      <Title eyebrow="CAMPUS ORDERS" title="Your orders" subtitle="Your latest campus food and essentials, in one place." />
      {error && <Notice text={error} />}
      <Button secondary onPress={() => void load()}>Refresh orders</Button>
      <View style={{ marginTop: 16 }}>
        {orders.map((order) => {
          const detail = details[order.id]; const open = expanded === order.id; const cancelled = order.status.startsWith("CANCELLED");
          return <View style={s.card} key={order.id}>
            <View style={s.row}><View><Text style={s.h3}>{order.code}</Text><Text style={s.muted}>Campus vendor</Text></View><Text style={[s.badge, { alignSelf: "flex-start" }]}>{order.status.replaceAll("_", " ")}</Text></View>
            <View style={{ marginTop: 13 }}>{order.items.map((item) => <View key={item.id} style={[s.row, { paddingVertical: 7 }]}><Text style={{ flex: 1, color: "#1E2030", fontWeight: "600" }}>{item.quantity} × {item.name}</Text><Text>{money(item.unitPricePaise * item.quantity)}</Text></View>)}</View>
            <View style={[s.row, { borderTopWidth: 1, borderTopColor: "#E9E6F1", marginTop: 9, paddingTop: 12 }]}><Text style={s.muted}>Order total</Text><Text style={s.price}>{money(order.totalPaise)}</Text></View>
            <Button secondary disabled={busy} onPress={() => void toggleDetails(order)}>{open ? "Hide order details" : "Show order details"}</Button>
            {open && <View style={{ marginTop: 13 }}>{!detail ? <Text style={s.muted}>Loading order details…</Text> : <><Text style={s.muted}>Ordered on {new Date(detail.createdAt).toLocaleString()}</Text><View style={[s.row, { paddingTop: 12 }]}><Text>Items</Text><Text>{money(detail.subtotalPaise)}</Text></View><View style={[s.row, { paddingTop: 8 }]}><Text>Delivery fee</Text><Text>{money(detail.deliveryFeePaise)}</Text></View><View style={[s.row, { paddingTop: 8 }]}><Text>Platform fee</Text><Text>{money(detail.platformFeePaise)}</Text></View>{detail.discountPaise > 0 && <View style={[s.row, { paddingTop: 8 }]}><Text>Discount</Text><Text>-{money(detail.discountPaise)}</Text></View>}<Text style={[s.muted, { marginTop: 13 }]}>Delivered to: {detail.deliveryAddress}</Text><Text style={[s.muted, { marginTop: 7 }]}>Cash on delivery · {detail.paymentStatus === "SUCCESS" ? "Cash collected" : "Cash payable on delivery"}</Text>{detail.history?.length ? <View style={{ marginTop: 14 }}><Text style={s.h3}>Order updates</Text>{detail.history.map((entry) => <Text style={s.muted} key={entry.id}>{new Date(entry.createdAt).toLocaleString()} · {entry.status.replaceAll("_", " ")}{entry.reason ? ` · ${entry.reason}` : ""}</Text>)}</View> : null}</>}{order.deliveryPin && <Notice text={`Delivery PIN: ${order.deliveryPin}\nShare it only when your order arrives.`} />}</View>}
            {!cancelled && <Button secondary disabled={busy} onPress={() => void reorder(order)}>Order again</Button>}{order.status === "DELIVERED" && <Button secondary onPress={() => router.push({ pathname: "/review", params: { orderId: order.id } })}>Rate this order</Button>}{order.status === "PLACED" && <><Field label="Cancellation reason" value={reasons[order.id] || ""} onChangeText={(value) => setReasons({ ...reasons, [order.id]: value })} /><Button secondary disabled={busy} onPress={() => Alert.alert("Cancel order?", "The vendor will be informed and stock will be released.", [{ text: "Keep order", style: "cancel" }, { text: "Cancel order", style: "destructive", onPress: () => void change(order, "CANCELLED_BY_USER") }])}>Cancel order</Button></>}
          </View>;
        })}
      </View>
      {!orders.length && <Notice text="No orders yet. Your campus orders will appear here." />}
      <View style={s.row}>{page > 1 && <Button secondary onPress={() => setPage(page - 1)}>Previous</Button>}{page * 30 < total && <Button secondary onPress={() => setPage(page + 1)}>Next</Button>}</View>
    </Screen>
  );

  return (
    <Screen>
      <Title
        eyebrow={vendor ? "SELLER DELIVERY" : "FROM SHOP TO YOUR DOOR"}
        title={vendor ? "Order inbox" : "Your orders"}
        subtitle={
          vendor
            ? "Orders refresh every 15 seconds while this screen is open."
            : "Keep your delivery PIN private until your order arrives."
        }
      />
      {error && <Notice text={error} />}
      <Button secondary onPress={() => void load()}>
        Refresh orders
      </Button>
      <View style={{ marginTop: 20 }}>
        {orders.map((o) => (
          <View style={s.card} key={o.id}>
            <View style={s.row}>
              <Text style={s.h3}>{o.code}</Text>
              <Text style={s.price}>{money(o.totalPaise)}</Text>
            </View>
            <Text style={[s.badge, { alignSelf: "flex-start", marginTop: 12 }]}>
              {o.status.replaceAll("_", " ")}
            </Text>
            <Text style={s.muted}>
              {new Date(o.createdAt).toLocaleString()}
            </Text>
            {!vendor&&<Button secondary disabled={busy} onPress={()=>void reorder(o)}>Order again</Button>}
            {!vendor&&o.status==='DELIVERED'&&<Button secondary onPress={()=>router.push({pathname:'/review',params:{orderId:o.id}})}>Rate this order</Button>}
            {o.items.map((i) => (
              <Text key={i.id} style={{ marginTop: 8 }}>
                {i.quantity} × {i.name}
                {i.note ? ` · ${i.note}` : ""}
              </Text>
            ))}
            <Text style={s.muted}>{o.deliveryAddress}</Text>
            <Text style={s.muted}>
              COD ·{" "}
              {o.paymentStatus === "SUCCESS"
                ? "Cash collection recorded"
                : "Cash not yet recorded"}
            </Text>
            {!vendor && o.deliveryPin && (
              <Notice
                text={`Delivery PIN: ${o.deliveryPin}\nShare only when the seller arrives with your order.`}
              />
            )}
            {vendor && next[o.status] && (
              <>
                {o.status === "OUT_FOR_DELIVERY" && (
                  <Field
                    label="Customer’s six-digit delivery PIN"
                    value={pins[o.id] || ""}
                    onChangeText={(v) => setPins({ ...pins, [o.id]: v })}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                )}
                <Button
                  disabled={busy}
                  onPress={() => void change(o, next[o.status][0])}
                >
                  {next[o.status][1]}
                </Button>
              </>
            )}
            {vendor &&
              ["OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status) &&
              !o.cashCollectedAt && (
                <Button
                  secondary
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Confirm cash received",
                      `Have you collected ${money(o.totalPaise)} in cash?`,
                      [
                        { text: "Not yet", style: "cancel" },
                        {
                          text: "Cash received",
                          onPress: () => void collect(o),
                        },
                      ],
                    )
                  }
                >
                  Record cash collected
                </Button>
              )}
            {(o.status === "PLACED" ||
              (vendor && o.status === "VENDOR_ACCEPTED")) && (
              <>
                <Field
                  label="Reason, if cancelling"
                  value={reasons[o.id] || ""}
                  onChangeText={(v) => setReasons({ ...reasons, [o.id]: v })}
                />
                <Button
                  secondary
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Cancel this order?",
                      "The cancellation will be recorded and reserved stock released.",
                      [
                        { text: "Keep order", style: "cancel" },
                        {
                          text: "Confirm cancellation",
                          style: "destructive",
                          onPress: () =>
                            void change(
                              o,
                              vendor
                                ? "CANCELLED_BY_VENDOR"
                                : "CANCELLED_BY_USER",
                            ),
                        },
                      ],
                    )
                  }
                >
                  {vendor ? "Reject / cancel" : "Cancel order"}
                </Button>
              </>
            )}
            <Button
              secondary
              onPress={() => {
                void request<Order>(`/orders/${o.id}`, token)
                  .then((d) =>
                    Alert.alert(
                      "Order timeline",
                      d.history
                        ?.map(
                          (h) =>
                            `${h.status.replaceAll("_", " ")}\n${new Date(h.createdAt).toLocaleString()}${h.reason ? " · " + h.reason : ""}`,
                        )
                        .join("\n\n") || "No updates yet",
                    ),
                  )
                  .catch((e) => setError(e.message));
              }}
            >
              View timeline
            </Button>
          </View>
        ))}
      </View>
      {!orders.length && (
        <Notice text="No orders yet. Your campus orders will appear here." />
      )}
      <View style={s.row}>
        {page > 1 && (
          <Button secondary onPress={() => setPage(page - 1)}>
            Previous
          </Button>
        )}
        {page * 30 < total && (
          <Button secondary onPress={() => setPage(page + 1)}>
            Next
          </Button>
        )}
      </View>
    </Screen>
  );
}


