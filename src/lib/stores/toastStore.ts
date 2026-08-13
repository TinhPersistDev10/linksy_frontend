import { create } from "zustand";

export type ToastVariant = "error" | "success" | "info";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastState = {
  toasts: ToastItem[];
  show: (message: string, variant?: ToastVariant) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
};

const MAX_TOASTS = 3;
const DEFAULT_DURATION_MS = 4500;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, variant = "info") => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    set((state) => ({
      toasts: [...state.toasts, { id, message: trimmed, variant }].slice(
        -MAX_TOASTS,
      ),
    }));

    window.setTimeout(() => {
      get().dismiss(id);
    }, DEFAULT_DURATION_MS);
  },

  error: (message) => get().show(message, "error"),
  success: (message) => get().show(message, "success"),
  info: (message) => get().show(message, "info"),

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

/** Imperative helper for hooks that should not subscribe to the store. */
export const toast = {
  show: (message: string, variant?: ToastVariant) =>
    useToastStore.getState().show(message, variant),
  error: (message: string) => useToastStore.getState().error(message),
  success: (message: string) => useToastStore.getState().success(message),
  info: (message: string) => useToastStore.getState().info(message),
};
