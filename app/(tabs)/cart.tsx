import * as Crypto from "expo-crypto";
import * as SecureStore from "../../src/secure";
import { useCallback, useState, useRef, useEffect } from "react";
import { useFocusEffect, router } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import {
  request,
  type Address,
  type Order,
  type Product,
  type Profile,
} from "../../src/api";
import { useSession } from "../../src/session";
import { Button, Field, Notice, Screen, Title, money, s } from "../../src/ui";
const newKey = () => Crypto.randomUUID();
type Quote = { totalPaise: number; discountPaise: number; subtotalPaise: number; deliveryFeePaise: number; platformFeePaise: number };
export default function Cart() {
  const { session, cart, quantity, note, clear, replaceCart } = useSession();
  const [coupon,setCoupon]=useState('');
  const [quote,setQuote]=useState<Quote>();
  const token = session!.accessToken;
  const vendor = session!.user.role === "VENDOR";
  const [profile, setProfile] = useState<Profile>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    if (vendor || !cart.length || !selected) { setQuote(undefined); return; }
    let active = true;
    setQuote(undefined);
    void request<Quote>("/checkout/quote", token, "POST", {
      vendorId: cart[0].product.vendorId,
      addressId: selected,
      paymentMethod: "COD",
      idempotencyKey: newKey(),
      ...(coupon ? { couponCode: coupon } : {}),
      items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    }).then((next) => { if (active) setQuote(next); })
      .catch((caught) => { if (active) setError((caught as Error).message); });
    return () => { active = false; };
  }, [cart, coupon, selected, token, vendor]);
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
  const attempt = useRef<{ key: string; payload: string } | null>(null);
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
    if(!quote){setError('Review the server-verified order total before placing the order.');return;}
    if (!selected) {
      setError("Select a delivery address first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = {
        vendorId: cart[0].product.vendorId,
        addressId: selected,
        paymentMethod: "COD",
        expectedTotalPaise: quote.totalPaise,
        ...(coupon?{couponCode:coupon}:{}),
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          ...(l.note?{note:l.note}:{}),
        })),
      };
      const payload = JSON.stringify(input);
      const stored = await SecureStore.getItemAsync(
        "campus-checkout-" + session!.user.id,
      );
      if (!attempt.current && stored) {
        try {
          attempt.current = JSON.parse(stored);
        } catch {}
      }
      if (!attempt.current || attempt.current.payload !== payload)
        attempt.current = { key: newKey(), payload };
      await SecureStore.setItemAsync(
        "campus-checkout-" + session!.user.id,
        JSON.stringify(attempt.current),
      );
      const order = await request<Order>("/orders", token, "POST", {
        ...input,
        idempotencyKey: attempt.current.key,
      });
      clear();
      attempt.current = null;
      await SecureStore.deleteItemAsync("campus-checkout-" + session!.user.id);
      Alert.alert(
        "Order placed",
        `${order.code} · ${money(order.totalPaise)} due in cash. Follow your order in the Orders tab.`,
      );
      router.push("/(tabs)/orders");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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
  const subtotal = cart.reduce(
    (n, l) => n + l.product.pricePaise * l.quantity,
    0,
  );
  const campus = profile?.campus;
  const fee = (campus?.deliveryFeePaise || 0) + (campus?.platformFeePaise || 0);
  return (
    <Screen>
      <Title
        eyebrow={vendor ? "YOUR CATALOG" : "ONE SHOP. ONE DELIVERY."}
        title={vendor ? "Products" : "Your basket"}
        subtitle={
          vendor
            ? "Keep products, prices and stock up to date."
            : "Clear pricing, local delivery, cash at your door."
        }
      />
      {error && <Notice text={error} />}
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
      ) : cart.length ? (
        <>
          <Text style={s.badge}>{cart[0].product.vendor.name}</Text>
          <View style={{ marginTop: 18 }}>
            {cart.map((l) => (
              <View style={s.card} key={l.product.id}>
                <Text style={s.h3}>{l.product.name}</Text>
                <View style={s.row}>
                  <Text style={s.price}>
                    {money(l.product.pricePaise * l.quantity)}
                  </Text>
                  <View style={s.row}>
                    <Button
                      secondary
                      disabled={busy}
                      onPress={() => quantity(l.product.id, l.quantity - 1)}
                    >
                      −
                    </Button>
                    <Text>{l.quantity}</Text>
                    <Button
                      secondary
                      disabled={busy}
                      onPress={() => quantity(l.product.id, l.quantity + 1)}
                    >
                      +
                    </Button>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Button secondary disabled={busy} onPress={async()=>{setBusy(true);try{const lines=await Promise.all(cart.map(async l=>({...l,product:await request<Product>(`/products/${l.product.id}`,token)})));replaceCart(lines);await load();setError('Basket refreshed with current prices.');}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>Refresh prices & availability</Button>
          {cart.map(l=><Field key={l.product.id} label={`Instructions for ${l.product.name}`} value={l.note||''} maxLength={300} onChangeText={v=>note(l.product.id,v)}/>)}
          <Text style={s.h2}>Deliver to</Text>
          {addresses.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setSelected(a.id)}
              style={[
                s.card,
                selected === a.id && { borderColor: "#236348", borderWidth: 2 },
              ]}
            >
              <Text style={s.h3}>
                {a.label} · {a.building}
              </Text>
              <Text style={s.muted}>
                {a.details} · {a.phone}
              </Text>
            </Pressable>
          ))}
          <View style={s.row}><Button secondary onPress={() => router.push("/addresses")}>Manage addresses</Button><Button secondary onPress={() => router.push("/addresses")}>Add address</Button></View>
          <View style={[s.card, { marginTop: 24 }]}>
            <Text style={s.h2}>Payment</Text>
            <Text style={s.h3}>Cash on delivery</Text>
            <Text style={s.muted}>Pay the exact verified total when your order arrives. Online payment is not enabled yet.</Text>
            <Field label="Coupon code (optional)" value={coupon} autoCapitalize="characters" onChangeText={v=>setCoupon(v.toUpperCase().trim())}/>
            <Text style={s.muted}>{quote ? "Total checked with the campus server." : selected ? "Checking latest prices and availability…" : "Choose an address to calculate your total."}</Text>
            {[
              ["Items", quote?.subtotalPaise ?? subtotal],
              ["Coupon savings", -(quote?.discountPaise || 0)],
              ["Delivery", quote?.deliveryFeePaise ?? campus?.deliveryFeePaise ?? 0],
              ["Platform fee", quote?.platformFeePaise ?? campus?.platformFeePaise ?? 0],
              ["Total due in cash", quote?.totalPaise ?? subtotal + fee],
            ].map(([label, value]) => (
              <View style={[s.row, { paddingVertical: 8 }]} key={String(label)}>
                <Text>{label}</Text>
                <Text style={s.h3}>{money(Number(value))}</Text>
              </View>
            ))}
          </View>
          <Notice text="Cash on delivery. Prices and availability are checked again by the server when you place your order." />
          <Button
            disabled={
              busy ||
              !quote ||
              !campus?.codEnabled ||
              !campus?.serviceEnabled ||
              !cart[0].product.vendor.codEnabled
            }
            onPress={() => void checkout()}
          >
            {busy ? "Placing order…" : !selected ? "Choose a delivery address" : !quote ? "Checking order total…" : `Place COD order · ${money(quote.totalPaise)}`}
          </Button>
        </>
      ) : (
        <>
          <Notice text="Your basket is waiting for something good." />
          <Button onPress={() => router.push("/(tabs)/home")}>
            Explore your campus
          </Button>
        </>
      )}
    </Screen>
  );
}

