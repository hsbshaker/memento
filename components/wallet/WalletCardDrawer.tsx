"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, LoaderCircle, X } from "lucide-react";
import type { UserCardType } from "@/lib/constants/memento-schema";
import type { WalletCardListItem, WalletCardMetadataResult } from "@/lib/types/server-data";
import { Button } from "@/components/ui/Button";
import {
  ROW_ACTION_TEXT_CLASS,
  ROW_MICRO_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";
import { cn } from "@/lib/cn";
import { normalizeWalletCardMetadata } from "@/lib/wallet/wallet-card-metadata";

type WalletCardDrawerProps = {
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

function formatCardTypeLabel(value: UserCardType) {
  return value === "personal" ? "Personal" : "Business";
}

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

function WalletCardDrawerPanel({
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
  const [nickname, setNickname] = useState(card.nickname ?? "");
  const [lastFour, setLastFour] = useState(card.lastFour ?? "");
  const [openedDate, setOpenedDate] = useState(card.openedDate ?? "");
  const [userCardType, setUserCardType] = useState<UserCardType | null>(card.userCardType ?? null);
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

    if (!isDirty) {
      return;
    }

    setSaveState({ state: "saving", message: null });

    try {
      const response = await fetch("/api/wallet/update-card-metadata", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (savedTimerRef.current) {
        window.clearTimeout(savedTimerRef.current);
      }
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
        headers: {
          "Content-Type": "application/json",
        },
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
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 14, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full w-full md:max-w-[25rem]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex h-full max-h-[100dvh] flex-col border-l border-white/10 bg-[#0D1525] px-4 py-4 shadow-[-24px_0_48px_-36px_rgba(0,0,0,0.92)] sm:px-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-white/72">
              <CreditCard className="h-4 w-4" />
              <span className="mt-0.5 text-[9px] font-semibold tracking-[0.16em]">{getCardTileLabel(card.cardName)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-white">{card.cardName}</h2>
              <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS)}>{card.issuer}</p>
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

        <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <div className="space-y-1">
            <p className={ROW_MICRO_TEXT_CLASS}>Card details</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className={ROW_MICRO_TEXT_CLASS}>Card name</p>
              <p className={ROW_PRIMARY_TEXT_CLASS}>{card.cardName}</p>
            </div>

            <div className="space-y-1">
              <p className={ROW_MICRO_TEXT_CLASS}>Issuer</p>
              <p className={ROW_SECONDARY_TEXT_CLASS}>{card.issuer}</p>
            </div>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className={ROW_MICRO_TEXT_CLASS}>Nickname</span>
              </div>
              <input
                value={nickname}
                onChange={(event) => handleDraftChange(setNickname, event.target.value)}
                placeholder="Optional"
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className={ROW_MICRO_TEXT_CLASS}>Last Four</span>
              </div>
              <input
                value={lastFour}
                inputMode="numeric"
                onChange={(event) => handleDraftChange(setLastFour, normalizeLastFourInput(event.target.value))}
                placeholder="Optional"
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-3">
                <span className={ROW_MICRO_TEXT_CLASS}>Opened</span>
              </div>
              <input
                type="date"
                value={openedDate}
                onChange={(event) => handleDraftChange(setOpenedDate, event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white focus:border-[#7FB6FF]/35 focus:outline-none"
              />
            </label>

            <div>
              <div className="flex items-center justify-between gap-3">
                <span className={ROW_MICRO_TEXT_CLASS}>Card type</span>
              </div>
              <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-[#0D1420]/80 p-1">
                {(["personal", "business"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleDraftChange(setUserCardType, userCardType === value ? null : value)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition",
                      userCardType === value ? "bg-[#7FB6FF]/12 text-[#7FB6FF]" : "text-white/62 hover:text-white",
                    )}
                  >
                    {formatCardTypeLabel(value)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4">
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "text-xs",
                saveState.state === "error" || normalizedDraft.error ? "text-rose-200/88" : "text-white/42",
              )}
            >
              {saveMessage}
            </span>
            <Button size="sm" className={ROW_ACTION_TEXT_CLASS} disabled={saveDisabled} onClick={() => void handleSave()}>
              {saveState.state === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              <span>{saveState.state === "saving" ? "Saving..." : "Save"}</span>
            </Button>
          </div>

          {removeError ? <p className="text-sm text-rose-100/72">{removeError}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="secondary" size="sm" className={cn("self-start", ROW_ACTION_TEXT_CLASS)} onClick={() => {}}>
              View all benefits
            </Button>

            {confirmingRemove ? (
              <div className="flex gap-3 self-start sm:self-auto">
                <Button variant="secondary" size="sm" className={ROW_ACTION_TEXT_CLASS} disabled={removing} onClick={() => setConfirmingRemove(false)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => void handleRemove()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/25 bg-rose-300/14 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-300/18 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  <span>{removing ? "Removing..." : "Remove card"}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRemove(true)}
                className="inline-flex items-center justify-center self-start rounded-lg border border-rose-300/18 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-100/90 transition hover:bg-rose-300/14 sm:self-auto"
              >
                Remove card
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function WalletCardDrawer({ card, open, onClose, onCardUpdated, onCardRemoved }: WalletCardDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
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
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[#050914]/48 p-0 md:items-stretch md:justify-end"
          onClick={onClose}
        >
          <div className="h-full w-full md:h-auto md:max-h-full md:w-auto">
            <WalletCardDrawerPanel
              key={card.userCardId}
              card={card}
              onClose={onClose}
              onCardUpdated={onCardUpdated}
              onCardRemoved={onCardRemoved}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
