"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type UndoToastItem = {
  id: string;
  message: string;
  onUndo: () => void;
  onExpire: () => void;
};

const UNDO_WINDOW_MS = 4000;

function UndoToast({ toast, onDismiss }: { toast: UndoToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slide in
    const rafId = requestAnimationFrame(() => setVisible(true));

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        toast.onExpire();
        onDismiss(toast.id);
      }, 250);
    }, UNDO_WINDOW_MS);

    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onDismiss]);

  const handleUndo = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    toast.onUndo();
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-full border border-border bg-surface-raised px-4 py-1.5 shadow-lg backdrop-blur-md",
        "transition-all duration-250 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <p className="text-sm text-muted-foreground">{toast.message}</p>
      <span className="text-subtle-foreground" aria-hidden>·</span>
      <button
        type="button"
        onClick={handleUndo}
        className="text-sm font-medium text-accent transition-opacity hover:opacity-75 focus-visible:outline-none"
      >
        Undo
      </button>
    </div>
  );
}

export function UndoToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: UndoToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <UndoToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
