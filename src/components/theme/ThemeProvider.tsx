"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ThemePreference } from "@/lib/types/settings";
import {
  FONT_SIZE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyFontSize,
  applyTheme,
  readStoredFontSize,
  readStoredTheme,
  type FontSize,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemePreference;
  fontSize: FontSize;
  setTheme: (theme: ThemePreference) => void;
  setFontSize: (size: FontSize) => void;
  saveAppearance: () => Promise<void>;
  isSaving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [fontSize, setFontSizeState] = useState<FontSize>("md");
  const [isSaving, setIsSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    const storedFont = readStoredFontSize();
    setThemeState(storedTheme);
    setFontSizeState(storedFont);
    applyTheme(storedTheme);
    applyFontSize(storedFont);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [ready, theme]);

  useEffect(() => {
    if (!ready || !isAuthenticated || !user?.userId) return;

    let cancelled = false;
    void settingsApi
      .getAll()
      .then((settings) => {
        if (cancelled) return;
        const nextTheme = settings.userSettings?.theme;
        if (
          nextTheme === "light" ||
          nextTheme === "dark" ||
          nextTheme === "system"
        ) {
          setThemeState(nextTheme);
          applyTheme(nextTheme);
          localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }
      })
      .catch(() => {
        // Keep local preference if settings API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready, user?.userId]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const setFontSize = useCallback((next: FontSize) => {
    setFontSizeState(next);
    applyFontSize(next);
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, next);
  }, []);

  const saveAppearance = useCallback(async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
      if (isAuthenticated) {
        await settingsApi.updateGeneral({ theme });
      }
    } finally {
      setIsSaving(false);
    }
  }, [fontSize, isAuthenticated, theme]);

  const value = useMemo(
    () => ({
      theme,
      fontSize,
      setTheme,
      setFontSize,
      saveAppearance,
      isSaving,
    }),
    [fontSize, isSaving, saveAppearance, setFontSize, setTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return context;
}
