"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/lib/stores/toastStore";
import { cn } from "@/lib/utils/cn";

const variantStyles: Record<
  ToastVariant,
  { box: string; icon: string; Icon: typeof AlertCircle }
> = {
  error: {
    box: "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/90 dark:text-red-100",
    icon: "text-red-600 dark:text-red-300",
    Icon: AlertCircle,
  },
  success: {
    box: "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  info: {
    box: "border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-950/90 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-300",
    Icon: Info,
  },
};

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => {
        const style = variantStyles[item.variant];
        const Icon = style.Icon;
        return (
          <div
            key={item.id}
            role="alert"
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2",
              style.box,
            )}
          >
            <Icon size={18} className={cn("mt-0.5 shrink-0", style.icon)} />
            <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed">
              {item.message}
            </p>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
