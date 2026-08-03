import type { ThemePreference } from "@/lib/types/settings";

export const THEME_STORAGE_KEY = "theme";
export const FONT_SIZE_STORAGE_KEY = "fontSize";

export type FontSize = "sm" | "md" | "lg";

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

export function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(theme) === "dark");
  root.dataset.theme = theme;
}

export function applyFontSize(size: FontSize) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = FONT_SIZE_MAP[size];
}

export function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function readStoredFontSize(): FontSize {
  if (typeof window === "undefined") return "md";
  const value = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
  if (value === "sm" || value === "md" || value === "lg") return value;
  return "md";
}

/** Inline script to avoid theme flash before React hydrates. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=document.documentElement;var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);d.dataset.theme=t;var f=localStorage.getItem('${FONT_SIZE_STORAGE_KEY}');if(f==='sm')d.style.fontSize='14px';else if(f==='lg')d.style.fontSize='18px';else d.style.fontSize='16px';}catch(e){}})();`;
