"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

export type ConfirmDialogVariant = "default" | "destructive" | "info";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  icon?: ReactNode;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "Hủy",
  variant = "default",
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  const isInfo = variant === "info";
  const isDestructive = variant === "destructive";

  const handleConfirm = async () => {
    await onConfirm();
  };

  const handleCancel = () => {
    if (loading) return;
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[400px]"
      >
        <DialogHeader className="space-y-3 px-6 pb-2 pt-6 text-center sm:text-center">
          {icon ? (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {icon}
            </div>
          ) : null}
          <DialogTitle className="text-base font-semibold leading-snug">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-0 border-t p-0 sm:flex-col sm:space-x-0">
          <div
            className={cn(
              "grid w-full",
              isInfo ? "grid-cols-1" : "grid-cols-2 divide-x",
            )}
          >
            {!isInfo && (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={handleCancel}
                className="h-12 rounded-none text-sm font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={loading}
              onClick={() => void handleConfirm()}
              className={cn(
                "h-12 rounded-none text-sm font-semibold hover:bg-muted/70",
                isDestructive
                  ? "text-red-600 hover:text-red-700"
                  : "text-sky-600 hover:text-sky-700",
              )}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
