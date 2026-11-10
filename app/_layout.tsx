import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/session";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { Loading } from "../src/ui";
import { PreferencesProvider } from "../src/preferences";
import { ThemeProvider, useAppTheme } from "../src/theme";
import { ProfilePhotoProvider } from "../src/profile-photo";
import { StyleSheet, View } from "react-native";
import { FloatingCartButton } from "../src/cart-button";

function AppStatusBar() {
  const { darkMode } = useAppTheme();
  return <StatusBar style={darkMode ? "light" : "dark"} />;
}

function AppRoutes() {
  return <View style={styles.root}>
    <Stack screenOptions={{ headerShown: false }} />
    <View pointerEvents="box-none" style={styles.cartLayer}>
      <FloatingCartButton />
    </View>
  </View>;
}

export default function Layout() {
  const [loaded, error] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!loaded && !error) return <Loading />;
  return (
    <SessionProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <ProfilePhotoProvider>
            <AppStatusBar />
            <AppRoutes />
          </ProfilePhotoProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cartLayer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 100 },
});
