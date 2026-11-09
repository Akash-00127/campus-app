import AsyncStorage from "@react-native-async-storage/async-storage";

export type DiscoveryPreferences = { vegetarianByDefault: boolean; openNowByDefault: boolean };
export const defaultPreferences: DiscoveryPreferences = { vegetarianByDefault: false, openNowByDefault: false };

export async function readPreferences(userId: string): Promise<DiscoveryPreferences> {
  const raw = await AsyncStorage.getItem(`campus-preferences-${userId}`);
  if (!raw) return { ...defaultPreferences };
  try {
    const value = JSON.parse(raw);
    return { vegetarianByDefault: value?.vegetarianByDefault === true, openNowByDefault: value?.openNowByDefault === true };
  } catch {
    return { ...defaultPreferences };
  }
}

export async function writePreferences(userId: string, preferences: DiscoveryPreferences): Promise<void> {
  await AsyncStorage.setItem(`campus-preferences-${userId}`, JSON.stringify(preferences));
}
