import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const storageKey = (userId: string) => `campus-profile-photo-${userId}`;
const photoDirectoryUri = (directoryUri: string) => directoryUri.endsWith("/") ? directoryUri : `${directoryUri}/`;

export type SelectedProfilePhoto = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
};

function extensionFor(mimeType?: string | null) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function readProfilePhoto(userId: string): Promise<string | null> {
  const uri = await AsyncStorage.getItem(storageKey(userId));
  if (!uri || Platform.OS === "web" || uri.startsWith("data:image/")) return uri;

  const { File } = await import("expo-file-system");
  if (new File(uri).exists) return uri;
  await AsyncStorage.removeItem(storageKey(userId));
  return null;
}

export async function writeProfilePhoto(userId: string, photo: SelectedProfilePhoto): Promise<string> {
  const key = storageKey(userId);
  const previousUri = await AsyncStorage.getItem(key);
  let uri: string;

  if (Platform.OS === "web") {
    if (!photo.base64) throw new Error("The selected photo could not be saved. Please choose another image.");
    if (photo.base64.length > 4_000_000) throw new Error("This photo is too large. Choose a smaller image and try again.");
    uri = `data:${photo.mimeType || "image/jpeg"};base64,${photo.base64}`;
    await AsyncStorage.setItem(key, uri);
    return uri;
  }

  const { Directory, File, Paths } = await import("expo-file-system");
  const directory = new Directory(Paths.document, "profile-photos", userId);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });

  const suffix = Math.random().toString(36).slice(2, 8);
  const destination = new File(directory, `profile-${Date.now()}-${suffix}.${extensionFor(photo.mimeType)}`);
  await new File(photo.uri).copy(destination);
  try {
    await AsyncStorage.setItem(key, destination.uri);
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
  uri = destination.uri;

  if (previousUri?.startsWith(photoDirectoryUri(directory.uri)) && previousUri !== uri) {
    try {
      const previousFile = new File(previousUri);
      if (previousFile.exists) previousFile.delete();
    } catch (error) {
      console.warn("Could not remove the previous profile photo.", error);
    }
  }

  return uri;
}

export async function removeProfilePhoto(userId: string): Promise<void> {
  const key = storageKey(userId);
  const uri = await AsyncStorage.getItem(key);
  await AsyncStorage.removeItem(key);

  if (Platform.OS === "web" || !uri) return;
  const { Directory, File, Paths } = await import("expo-file-system");
  const directory = new Directory(Paths.document, "profile-photos", userId);
  if (!uri.startsWith(photoDirectoryUri(directory.uri))) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
