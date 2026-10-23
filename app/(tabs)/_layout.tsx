import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useSession } from "../../src/session";
import { colors, Loading } from "../../src/ui";
export default function Layout() {
  const { session, ready, cart } = useSession();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  const vendor = session.user.role === "VENDOR";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 10,
          height: 68,
          borderRadius: 21,
          backgroundColor: "rgba(255,255,255,0.98)",
          borderTopWidth: 0,
          shadowColor: "#091A41",
          shadowOpacity: 0.13,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 18,
          elevation: 12,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: "800", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: vendor ? "Dashboard" : "Discover",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>⌂</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: vendor ? "Products" : "Cart",
          tabBarBadge: !vendor&&cart.length ? cart.reduce((n,l)=>n+l.quantity,0):undefined,
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>▦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 19 }}>≡</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18 }}>○</Text>
          ),
        }}
      />
    </Tabs>
  );
}
