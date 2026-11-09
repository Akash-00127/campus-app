import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../src/session";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { Loading } from "../src/ui";
import { PreferencesProvider } from "../src/preferences";
import { ThemeProvider, useAppTheme } from "../src/theme";
import { ProfilePhotoProvider } from "../src/profile-photo";

function AppStatusBar() {
  const { darkMode } = useAppTheme();
  return <StatusBar style={darkMode ? "light" : "dark"} />;
}

export default function Layout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  if (!loaded && !error) return <Loading />;
  return (
    <SessionProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <ProfilePhotoProvider>
            <AppStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
          </ProfilePhotoProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
