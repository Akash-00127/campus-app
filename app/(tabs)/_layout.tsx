import { Redirect, Tabs } from "expo-router";
import { useSession } from "../../src/session";
import { colors, Loading } from "../../src/ui";
import { NavIcon } from "../../src/nav-icon";
export default function Layout() {
  const { session, ready, cart, setAccountSection } = useSession();
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
          marginHorizontal: 16,
          bottom: 14,
          height: 74,
          borderRadius: 26,
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
        tabBarLabelStyle: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 10 },
        tabBarBadgeStyle: { backgroundColor: colors.green, color: "white", fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: vendor ? "Dashboard" : "Discover",
          tabBarIcon: ({ color, focused }) => <NavIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: vendor ? "Products" : "Cart",
          tabBarBadge: !vendor&&cart.length ? cart.reduce((n,l)=>n+l.quantity,0):undefined,
          tabBarIcon: ({ color, focused }) => <NavIcon name="cart" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => <NavIcon name="orders" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={{ tabPress: () => setAccountSection("OVERVIEW") }}
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => <NavIcon name="profile" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
