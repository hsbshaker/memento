"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LoaderCircle, X } from "lucide-react";
import type { WalletCardListItem, WalletCardMetadataResult } from "@/lib/types/server-data";
import { DatePicker } from "@/components/ui/DatePicker";
import { Surface } from "@/components/ui/Surface";
import {
  ROW_MICRO_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";
import { cn } from "@/lib/cn";
import { normalizeWalletCardMetadata } from "@/lib/wallet/wallet-card-metadata";

type WalletCardModalProps = {
  card: WalletCardListItem | null;
  open: boolean;
  onClose: () => void;
  onCardUpdated: (card: WalletCardMetadataResult) => void;
  onCardRemoved: (userCardId: string) => void;
};

type SaveState = {
  state: "idle" | "saving" | "saved" | "error";
  message: string | null;
};

function formatSaveState(saveState: SaveState) {
  if (saveState.state === "saving") return "Saving...";
  if (saveState.state === "saved") return "Saved";
  if (saveState.state === "error") return saveState.message ?? "Could not save";
  return null;
}

function normalizeLastFourInput(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 4);
}

function getCardTileLabel(cardName: string): string {
  return cardName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function WalletCardModalPanel({
  card,
  onClose,
  onCardUpdated,
  onCardRemoved,
}: {
  card: WalletCardListItem;
  onClose: () => void;
  onCardUpdated: (card: WalletCardMetadataResult) => void;
  onCardRemoved: (userCardId: string) => void;
}) {
  const router = useRouter();
  const [nickname, setNickname] = useState(card.nickname ?? "");
  const [lastFour, setLastFour] = useState(card.lastFour ?? "");
  const [openedDate, setOpenedDate] = useState(card.openedDate ?? "");
  const userCardType = card.userCardType ?? null;
  const [persistedValues, setPersistedValues] = useState({
    nickname: card.nickname ?? null,
    lastFour: card.lastFour ?? null,
    openedDate: card.openedDate ?? null,
    userCardType: card.userCardType ?? null,
  });
  const [saveState, setSaveState] = useState<SaveState>({ state: "idle", message: null });
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  const normalizedDraft = useMemo(() => {
    try {
      return {
        data: normalizeWalletCardMetadata({
          nickname,
          lastFour,
          openedDate,
          userCardType,
        }),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not validate card details.",
      };
    }
  }, [lastFour, nickname, openedDate, userCardType]);

  const isDirty = useMemo(() => {
    if (!normalizedDraft.data) return false;

    return (
      normalizedDraft.data.nickname !== persistedValues.nickname ||
      normalizedDraft.data.lastFour !== persistedValues.lastFour ||
      normalizedDraft.data.openedDate !== persistedValues.openedDate ||
      normalizedDraft.data.userCardType !== persistedValues.userCardType
    );
  }, [normalizedDraft.data, persistedValues]);

  const handleDraftChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setSaveState((current) => (current.state === "idle" ? current : { state: "idle", message: null }));
  };

  const handleSave = async () => {
    if (!normalizedDraft.data) {
      setSaveState({ state: "error", message: normalizedDraft.error });
      return;
    }

    if (!isDirty) return;

    setSaveState({ state: "saving", message: null });

    try {
      const response = await fetch("/api/wallet/update-card-metadata", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userCardId: card.userCardId,
          nickname,
          lastFour,
          openedDate,
          userCardType,
        }),
      });

      const result = (await response.json()) as WalletCardMetadataResult & { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save card details.");
      }

      setPersistedValues({
        nickname: result.nickname,
        lastFour: result.lastFour,
        openedDate: result.openedDate,
        userCardType: result.userCardType,
      });
      onCardUpdated(result);
      setSaveState({ state: "saved", message: null });

      if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = window.setTimeout(() => {
        setSaveState({ state: "idle", message: null });
      }, 1400);
    } catch (error) {
      setSaveState({
        state: "error",
        message: error instanceof Error ? error.message : "Failed to save card details.",
      });
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setRemoveError(null);

    try {
      const response = await fetch("/api/wallet/remove-card", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCardId: card.userCardId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove card.");
      }

      onCardRemoved(card.userCardId);
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Failed to remove card.");
      setRemoving(false);
    }
  };

  const saveMessage = normalizedDraft.error ?? formatSaveState(saveState);
  const saveDisabled = !isDirty || saveState.state === "saving" || removing || Boolean(normalizedDraft.error);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full max-w-[40rem]"
      onClick={(event) => event.stopPropagation()}
    >
      <Surface className="max-h-[88vh] overflow-y-auto rounded-xl border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_60px_-32px_rgba(0,0,0,0.92)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] text-white/70">
              <CreditCard className="h-4 w-4" />
              <span className="mt-0.5 text-[9px] font-semibold tracking-[0.16em]">{getCardTileLabel(card.cardName)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-white">{card.cardName}</h2>
              <p className={cn("mt-0.5", ROW_SECONDARY_TEXT_CLASS)}>{card.issuer}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
            aria-label="Close card details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="mt-5 space-y-5">
          <div className="space-y-4">
            <label className="block">
              <span className={ROW_MICRO_TEXT_CLASS}>Nickname</span>
              <input
                value={nickname}
                onChange={(event) => handleDraftChange(setNickname, event.target.value)}
                placeholder="Optional"
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className={ROW_MICRO_TEXT_CLASS}>Last Four</span>
              <input
                value={lastFour}
                inputMode="numeric"
                onChange={(event) => handleDraftChange(setLastFour, normalizeLastFourInput(event.target.value))}
                placeholder="Optional"
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
              />
            </label>

            <div>
              <span className={ROW_MICRO_TEXT_CLASS}>Date Opened</span>
              <DatePicker
                value={openedDate}
                onChange={(v) => handleDraftChange(setOpenedDate, v)}
                placeholder="Optional"
                className="mt-2"
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-white/8 pt-4">
          {saveMessage ? (
            <p className={cn("mb-3 text-xs", saveState.state === "error" || normalizedDraft.error ? "text-rose-200/88" : "text-white/42")}>
              {saveMessage}
            </p>
          ) : null}
          {removeError ? (
            <p className="mb-3 text-xs text-rose-100/72">{removeError}</p>
          ) : null}

          <div className="flex items-center gap-2">
            {confirmingRemove ? (
              <>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => setConfirmingRemove(false)}
                  className="inline-flex items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/10 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => void handleRemove()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-300/10 px-4 py-2 text-sm font-semibold text-rose-200/85 ring-1 ring-rose-300/20 transition hover:bg-rose-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {removing ? "Removing..." : "Confirm remove"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/benefits?userCardId=${card.userCardId}`);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  View benefits
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-rose-300/10 px-4 py-2 text-sm font-semibold text-rose-200/85 ring-1 ring-rose-300/20 transition hover:bg-rose-300/15"
                >
                  Remove card
                </button>
              </>
            )}

            <div className="flex-1" />

            <button
              type="button"
              disabled={saveDisabled}
              onClick={() => void handleSave()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7FB6FF] px-4 py-2 text-sm font-semibold text-[#08111F] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveState.state === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {saveState.state === "saving" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Surface>
    </motion.div>
  );
}

export function WalletCardModal({ card, open, onClose, onCardUpdated, onCardRemoved }: WalletCardModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && card ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6"
          onClick={onClose}
        >
          <WalletCardModalPanel
            key={card.userCardId}
            card={card}
            onClose={onClose}
            onCardUpdated={onCardUpdated}
            onCardRemoved={onCardRemoved}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
