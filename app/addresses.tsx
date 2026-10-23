import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { request, type Address } from "../src/api";
import { useSession } from "../src/session";
import { Button, Field, Loading, Notice, Screen, Title, colors, s } from "../src/ui";

type AddressForm = Pick<Address, "label" | "building" | "details" | "phone">;
const blankAddress: AddressForm = { label: "", building: "", details: "", phone: "" };

export default function Addresses() {
  const { session } = useSession();
  const [items, setItems] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<AddressForm>(blankAddress);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError("");
      setItems(await request<Address[]>("/addresses", session.accessToken));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openNew() {
    setEditing(null);
    setForm(blankAddress);
    setShowForm(true);
  }

  function openEdit(address: Address) {
    setEditing(address);
    setForm({ label: address.label, building: address.building, details: address.details, phone: address.phone });
    setShowForm(true);
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await request(
        editing ? `/addresses/${editing.id}` : "/addresses",
        session.accessToken,
        editing ? "PATCH" : "POST",
        form,
      );
      setShowForm(false);
      setEditing(null);
      setForm(blankAddress);
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(address: Address) {
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await request(`/addresses/${address.id}`, session.accessToken, "DELETE");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={a.back}>
        <Text style={a.backText}>← Back to checkout</Text>
      </Pressable>
      <Title title="Delivery addresses" subtitle="Save hostels, classrooms, and campus spots for faster checkout." />
      {error && <Notice text={error} />}
      {loading && <Loading />}

      {showForm ? (
        <View style={s.card}>
          <Text style={s.h2}>{editing ? "Edit delivery address" : "Add delivery address"}</Text>
          <Field label="Address name · Hostel, Library, Classroom" value={form.label} onChangeText={(label) => setForm((current) => ({ ...current, label }))} />
          <Field label="Building or hostel" value={form.building} onChangeText={(building) => setForm((current) => ({ ...current, building }))} />
          <Field label="Room, floor and delivery instructions" value={form.details} onChangeText={(details) => setForm((current) => ({ ...current, details }))} multiline />
          <Field label="Delivery phone number" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} keyboardType="phone-pad" />
          <Button disabled={busy} onPress={() => void save()}>{busy ? "Saving…" : editing ? "Save changes" : "Save address"}</Button>
          <Button secondary disabled={busy} onPress={() => { setShowForm(false); setEditing(null); setForm(blankAddress); }}>Cancel</Button>
        </View>
      ) : (
        <>
          <Button onPress={openNew}>+ Add a delivery address</Button>
          <View style={{ height: 10 }} />
          {items.map((address) => (
            <View key={address.id} style={a.addressCard}>
              <View style={a.addressTop}>
                <View style={a.marker}><Text style={a.markerText}>⌖</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.h3}>{address.label}</Text>
                  <Text style={a.building}>{address.building}</Text>
                  <Text style={s.muted}>{address.details}</Text>
                  <Text style={a.phone}>{address.phone}</Text>
                </View>
              </View>
              <View style={a.actions}>
                <Pressable accessibilityRole="button" onPress={() => openEdit(address)} style={a.action}><Text style={a.actionText}>Edit</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => Alert.alert("Remove this address?", "Your past orders keep their saved delivery details.", [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void remove(address) }])} style={a.action}><Text style={[a.actionText, { color: "#C9493F" }]}>Remove</Text></Pressable>
              </View>
            </View>
          ))}
          {!loading && !items.length && <Notice text="No delivery address yet. Add one to place your first order." />}
        </>
      )}
    </Screen>
  );
}

const a = StyleSheet.create({
  back: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 12 },
  backText: { color: colors.green, fontSize: 13, fontWeight: "800" },
  addressCard: { backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 },
  addressTop: { flexDirection: "row", gap: 12 },
  marker: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFF0E5", alignItems: "center", justifyContent: "center" },
  markerText: { fontSize: 21, color: colors.green },
  building: { color: colors.ink, fontWeight: "700", fontSize: 13, marginTop: 3 },
  phone: { color: colors.muted, fontSize: 12, marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 15, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#EFEAF2" },
  action: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingHorizontal: 16, paddingVertical: 9 },
  actionText: { color: colors.green, fontSize: 12, fontWeight: "800" },
});
