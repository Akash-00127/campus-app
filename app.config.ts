import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Campus Drop",
  slug: "campus-app",
  scheme: "campusdrop",
  plugins: ["expo-router", "expo-secure-store", "expo-notifications", "expo-status-bar"],
  android: {
    ...config.android,
    softwareKeyboardLayoutMode: "resize",
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
  extra: {
    ...config.extra,
    firebaseConfigured: !!process.env.GOOGLE_SERVICES_JSON,
  },
});
