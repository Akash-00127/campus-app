import AsyncStorage from "@react-native-async-storage/async-storage";

const themeKey = (userId: string) => `campus-account-theme-${userId}`;

export async function readDarkMode(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(themeKey(userId))) === "dark";
}

export async function writeDarkMode(userId: string, darkMode: boolean): Promise<void> {
  await AsyncStorage.setItem(themeKey(userId), darkMode ? "dark" : "light");
}
