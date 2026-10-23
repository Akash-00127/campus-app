import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { mediaUrl, request, type Product } from "../../src/api";
import { useSession } from "../../src/session";
import { Button, Loading, Notice, Screen, Title, money, s } from "../../src/ui";
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, add, replace, saved, toggleSaved } = useSession();
  const [product, setProduct] = useState<Product>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (session)
      void request<Product>(`/products/${id}`, session.accessToken)
        .then(setProduct)
        .catch((e) => setError(e.message));
    else router.replace("/welcome");
  }, [id, session]);
  return (
    <Screen>
      <Button secondary onPress={() => router.back()}>
        ← Back to campus
      </Button>
      {error && <Notice text={error} />}
      {!product ? (
        <Loading />
      ) : (
        <>
          <View style={{ marginTop: 20 }}>
            {product.image && (
              <Image
                source={{ uri: mediaUrl(product.image) }}
                resizeMode="cover"
                style={{ height: 260, borderRadius: 24, marginBottom: 24 }}
              />
            )}
            <Title
              eyebrow={product.vendor.name}
              title={product.name}
              subtitle={product.category?.name}
            />
            <Text style={s.price}>{money(product.pricePaise)}</Text>
            {product.vegetarian && <Text style={[s.badge, { alignSelf: "flex-start", marginTop: 10 }]}>VEGETARIAN</Text>}
            <Button secondary onPress={()=>toggleSaved(product)}>{saved.some(p=>p.id===product.id)?'♥ Saved · tap to remove':'♡ Save for later'}</Button>
            <Text style={s.muted}>
              {product.description ||
                "Prepared or supplied by your campus shop."}
            </Text>
            <View style={[s.card, { marginTop: 25 }]}>
              <Text style={s.h3}>{product.vendor.name}</Text>
              <Button secondary onPress={()=>router.push(`/vendor/${product.vendorId}`)}>Visit shop & reviews →</Button>
              <Text style={s.muted}>{product.vendor.address}</Text>
              <Text style={s.muted}>
                Preparation estimate: approximately{" "}
                {product.vendor.preparationMinutes} minutes. Delivery time
                depends on shop workload.
              </Text>
              <Text style={s.badge}>
                {product.vendor.acceptingOrders
                  ? "ACCEPTING ORDERS"
                  : "NOT ACCEPTING ORDERS"}
              </Text>
            </View>
            <Button
              disabled={
                !product.available ||
                product.stock === 0 ||
                !product.vendor.acceptingOrders
              }
              onPress={() => {
                if (add(product)) Alert.alert("Added to basket", product.name);
                else
                  Alert.alert(
                    "Start a new basket?",
                    "Your basket contains products from another shop.",
                    [
                      { text: "Keep basket", style: "cancel" },
                      {
                        text: "Clear and add",
                        onPress: () => replace(product),
                      },
                    ],
                  );
              }}
            >
              Add to basket
            </Button>
            <Button secondary onPress={() => router.push("/(tabs)/cart")}>
              View basket
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}
