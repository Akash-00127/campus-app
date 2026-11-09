import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "./session";
import { readProfilePhoto, removeProfilePhoto, writeProfilePhoto, type SelectedProfilePhoto } from "./profile-photo-storage";

type ProfilePhotoContextValue = {
  photoUri: string | null;
  ready: boolean;
  savePhoto: (photo: SelectedProfilePhoto) => Promise<void>;
  clearPhoto: () => Promise<void>;
};

const ProfilePhotoContext = createContext<ProfilePhotoContextValue | null>(null);

export function ProfilePhotoProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [ready, setReady] = useState(!userId);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setPhotoUri(null);
    setReady(!userId);
    if (!userId) return;

    void readProfilePhoto(userId).then((uri) => {
      if (generation.current === current) setPhotoUri(uri);
    }).catch((error: unknown) => {
      console.error("Could not load the saved profile photo.", error);
    }).finally(() => {
      if (generation.current === current) setReady(true);
    });
    return () => { generation.current += 1; };
  }, [userId]);

  const savePhoto = useCallback(async (photo: SelectedProfilePhoto) => {
    if (!userId || !ready) throw new Error("Your profile is still loading. Please try again.");
    const current = generation.current;
    const uri = await writeProfilePhoto(userId, photo);
    if (generation.current === current) setPhotoUri(uri);
  }, [ready, userId]);

  const clearPhoto = useCallback(async () => {
    if (!userId || !ready) throw new Error("Your profile is still loading. Please try again.");
    const current = generation.current;
    await removeProfilePhoto(userId);
    if (generation.current === current) setPhotoUri(null);
  }, [ready, userId]);

  return <ProfilePhotoContext.Provider value={{ photoUri, ready, savePhoto, clearPhoto }}>{children}</ProfilePhotoContext.Provider>;
}

export function useProfilePhoto() {
  const value = useContext(ProfilePhotoContext);
  if (!value) throw new Error("Profile photo provider missing");
  return value;
}
