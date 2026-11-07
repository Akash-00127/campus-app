import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "./session";
import { defaultPreferences, readPreferences, writePreferences, type DiscoveryPreferences } from "./preference-storage";

export type { DiscoveryPreferences } from "./preference-storage";
type PreferencesContextValue = {
  preferences: DiscoveryPreferences;
  ready: boolean;
  savePreferences: (next: DiscoveryPreferences) => Promise<void>;
};
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(defaultPreferences);
  const [ready, setReady] = useState(false);
  const generation = useRef(0);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    const current = ++generation.current;
    setReady(false);
    setPreferences(defaultPreferences);
    if (!userId) return;
    void writes.current.catch(() => {}).then(() => readPreferences(userId)).then((stored) => {
      if (generation.current === current) setPreferences(stored);
    }).catch((error: unknown) => {
      console.error("Could not load discovery preferences.", error);
    }).finally(() => {
      if (generation.current === current) setReady(true);
    });
    return () => { generation.current += 1; };
  }, [userId]);

  const savePreferences = useCallback(async (next: DiscoveryPreferences) => {
    if (!userId || !ready) throw new Error("Preferences are still loading. Please try again.");
    const current = generation.current;
    const write = writes.current.catch(() => {}).then(() => writePreferences(userId, next));
    writes.current = write;
    await write;
    if (generation.current === current) setPreferences(next);
  }, [ready, userId]);

  return <PreferencesContext.Provider value={{ preferences, ready, savePreferences }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Preferences provider missing");
  return value;
}
