import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NativeSecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore is native-only. The web preview uses AsyncStorage for sessions
// and checkout idempotency without changing native-device security behavior.
export const getItemAsync = (key: string): Promise<string | null> =>
  Platform.OS === "web"
    ? AsyncStorage.getItem(key)
    : NativeSecureStore.getItemAsync(key);

export const setItemAsync = (key: string, value: string): Promise<void> =>
  Platform.OS === "web"
    ? AsyncStorage.setItem(key, value)
    : NativeSecureStore.setItemAsync(key, value);

export const deleteItemAsync = (key: string): Promise<void> =>
  Platform.OS === "web"
    ? AsyncStorage.removeItem(key)
    : NativeSecureStore.deleteItemAsync(key);
