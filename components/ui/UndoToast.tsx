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
        "flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#0F1823]/90 px-4 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur-md",
        "transition-all duration-250 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <p className="text-[13px] text-white/70">{toast.message}</p>
      <span className="text-white/20" aria-hidden>·</span>
      <button
        type="button"
        onClick={handleUndo}
        className="text-[13px] font-medium text-[#F7C948]/90 transition-opacity hover:opacity-75 focus-visible:outline-none"
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
