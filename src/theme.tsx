import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "./session";
import { readDarkMode, writeDarkMode } from "./theme-storage";

type ThemeContextValue = {
  darkMode: boolean;
  ready: boolean;
  setDarkMode: (darkMode: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  ready: false,
  setDarkMode: async () => { throw new Error("Theme provider missing"); },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [darkMode, setDarkModeState] = useState(false);
  const [ready, setReady] = useState(!userId);
  const generation = useRef(0);
  const updateId = useRef(0);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    const current = ++generation.current;
    setDarkModeState(false);
    setReady(!userId);
    if (!userId) return;

    void readDarkMode(userId).then((value) => {
      if (generation.current === current) setDarkModeState(value);
    }).catch((error: unknown) => {
      console.error("Could not load the saved appearance preference.", error);
    }).finally(() => {
      if (generation.current === current) setReady(true);
    });
    return () => { generation.current += 1; };
  }, [userId]);

  const setDarkMode = useCallback(async (next: boolean) => {
    if (!userId || !ready) throw new Error("Appearance settings are still loading. Please try again.");
    const currentGeneration = generation.current;
    const currentUpdate = ++updateId.current;
    const previous = darkMode;
    setDarkModeState(next);
    const write = writes.current.catch(() => {}).then(() => writeDarkMode(userId, next));
    writes.current = write;
    try {
      await write;
    } catch (error) {
      if (generation.current === currentGeneration && updateId.current === currentUpdate) {
        setDarkModeState(previous);
      }
      throw error;
    }
  }, [darkMode, ready, userId]);

  return <ThemeContext.Provider value={{ darkMode, ready, setDarkMode }}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
