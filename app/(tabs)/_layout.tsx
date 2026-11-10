import { Redirect, Tabs } from "expo-router";
import { useSession } from "../../src/session";
import { colors, Loading } from "../../src/ui";
import { NavIcon } from "../../src/nav-icon";
import { useAppTheme } from "../../src/theme";
export default function Layout() {
  const { session, ready, saved, setAccountSection } = useSession();
  const { darkMode } = useAppTheme();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  const vendor = session.user.role === "VENDOR";
  const savedCount = saved.length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: darkMode ? "#C4B5FD" : colors.green,
        tabBarInactiveTintColor: darkMode ? "#93A2A5" : colors.muted,
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 16,
          bottom: 14,
          height: 74,
          borderRadius: 26,
          backgroundColor: darkMode ? "#1B1938" : "rgba(255,255,255,0.97)",
          borderTopWidth: 1,
          borderColor: darkMode ? "#39365B" : colors.line,
          shadowColor: darkMode ? "#000000" : colors.ink,
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
          title: "Vendors",
          href: vendor ? null : undefined,
          tabBarIcon: ({ color, focused }) => <NavIcon name="vendors" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Products",
          href: vendor ? undefined : null,
          tabBarIcon: ({ color, focused }) => <NavIcon name="cart" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Likes",
          href: vendor ? null : undefined,
          tabBarIcon: ({ color, focused }) => <NavIcon name="likes" color={color} focused={focused} count={savedCount} />,
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
