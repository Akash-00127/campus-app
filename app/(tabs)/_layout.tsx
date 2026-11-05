import { Redirect, Tabs } from "expo-router";
import { useSession } from "../../src/session";
import { colors, Loading } from "../../src/ui";
import { NavIcon } from "../../src/nav-icon";
export default function Layout() {
  const { session, ready, cart, setAccountSection } = useSession();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  const vendor = session.user.role === "VENDOR";
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 18,
          bottom: 14,
          height: 74,
          borderRadius: 24,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderColor: colors.line,
          shadowColor: colors.navy,
          shadowOpacity: 0.12,
          shadowOffset: { width: 0, height: 7 },
          shadowRadius: 20,
          elevation: 10,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", fontSize: 10, letterSpacing: 0.15 },
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
        name="search"
        options={{
          title: "Search",
          href: vendor ? null : undefined,
          tabBarIcon: ({ color, focused }) => <NavIcon name="search" color={color} focused={focused} />,
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
        name="cart"
        options={{
          title: vendor ? "Products" : "Cart",
          tabBarIcon: ({ color, focused }) => <NavIcon name="cart" color={color} focused={focused} count={vendor ? 0 : cartCount} />,
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
