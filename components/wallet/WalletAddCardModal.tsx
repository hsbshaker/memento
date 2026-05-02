"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, Search, X } from "lucide-react";
import type { UserCardType } from "@/lib/constants/memento-schema";
import type { AddWalletCardResult, CardSearchResult } from "@/lib/types/server-data";
import { Button } from "@/components/ui/Button";
import {
  ROW_ACTION_TEXT_CLASS,
  ROW_MICRO_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";
import { getCleanCardName } from "@/lib/format-card";

type WalletAddCardModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: (result: AddWalletCardResult) => void;
};

type SearchCardsResponse = {
  results?: CardSearchResult[];
  error?: string;
};

type AddCardResponse = AddWalletCardResult & {
  error?: string;
};

function normalizeLastFourInput(value: string): string {
  return value.replace(/\D+/g, "").slice(0, 4);
}

function formatCardTypeLabel(value: UserCardType) {
  return value === "personal" ? "Personal" : "Business";
}

export function WalletAddCardModal({ open, onClose, onAdded }: WalletAddCardModalProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(null);
  const [nickname, setNickname] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [openedDate, setOpenedDate] = useState("");
  const [userCardType, setUserCardType] = useState<UserCardType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasMetadata = useMemo(
    () => nickname.trim() || lastFour.trim() || openedDate.trim() || userCardType,
    [lastFour, nickname, openedDate, userCardType],
  );

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

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/cards/search?query=${encodeURIComponent(deferredQuery.trim())}`, {
          credentials: "include",
        });
        const payload = (await response.json()) as SearchCardsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to search cards.");
        }

        if (!cancelled) {
          setResults(payload.results ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : "Failed to search cards.");
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery, open]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setResults([]);
    setSearchError(null);
    setSelectedCard(null);
    setNickname("");
    setLastFour("");
    setOpenedDate("");
    setUserCardType(null);
    setSubmitting(false);
    setSubmitError(null);
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedCard) {
      setSubmitError("Choose a card to add.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/wallet/add-card", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: selectedCard.cardId,
          nickname,
          lastFour,
          openedDate,
          userCardType,
        }),
      });

      const payload = (await response.json()) as AddCardResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to add card.");
      }

      onAdded(payload);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to add card.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[#050914]/56 p-3 sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-[30rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <Surface className="max-h-[92vh] overflow-y-auto rounded-xl border-white/12 bg-[#0D1525] p-5 shadow-[0_20px_60px_-32px_rgba(0,0,0,0.9)]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight text-white">Add card</h2>
                  <p className="text-sm text-white/56">Search for a card, then add any details you want to keep.</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/68 transition hover:bg-white/[0.08]"
                  aria-label="Close add card modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className={ROW_MICRO_TEXT_CLASS}>Search</span>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/32" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by card name or issuer"
                      className="h-10 w-full rounded-lg border border-white/10 bg-[#0D1420]/85 pr-4 pl-10 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                    />
                  </div>
                </label>

                <div className="space-y-2.5">
                  {loading ? (
                    <div className="space-y-2.5">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-[68px] animate-pulse rounded-lg border border-white/10 bg-white/[0.05]" />
                      ))}
                    </div>
                  ) : searchError ? (
                    <Surface className="rounded-lg border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100/88">
                      {searchError}
                    </Surface>
                  ) : results.length === 0 ? (
                    <Surface className="rounded-lg border-white/10 bg-white/[0.04] p-4 text-sm text-white/58">
                      {query.trim() ? "No cards found." : "Start typing to search for a card."}
                    </Surface>
                  ) : (
                    <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
                      {results.map((card) => {
                        const isSelected = selectedCard?.cardId === card.cardId;

                        return (
                          <button
                            key={card.cardId}
                            type="button"
                            onClick={() => setSelectedCard(card)}
                            className="block w-full text-left"
                          >
                            <Surface
                              className={cn(
                                "rounded-lg border-white/10 bg-white/[0.035] p-3.5 transition hover:border-white/18 hover:bg-white/[0.055]",
                                isSelected && "border-[#7FB6FF]/35 bg-[#7FB6FF]/[0.08]",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className={ROW_MICRO_TEXT_CLASS}>{card.issuer}</p>
                                  <h3 className={cn("mt-1.5", ROW_PRIMARY_TEXT_CLASS)}>
                                    {getCleanCardName(card.displayName, card.cardName)}
                                  </h3>
                                </div>
                                {isSelected ? <Check className="mt-1 h-4 w-4 shrink-0 text-[#7FB6FF]" /> : null}
                              </div>
                            </Surface>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedCard ? (
                  <div className="space-y-4 border-t border-white/8 pt-4">
                    <div className="space-y-1">
                      <p className={ROW_MICRO_TEXT_CLASS}>Selected card</p>
                      <h3 className={ROW_PRIMARY_TEXT_CLASS}>{getCleanCardName(selectedCard.displayName, selectedCard.cardName)}</h3>
                      <p className={ROW_SECONDARY_TEXT_CLASS}>{selectedCard.issuer}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Nickname</span>
                        <input
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                          placeholder="Optional"
                          className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Last Four</span>
                        <input
                          value={lastFour}
                          inputMode="numeric"
                          onChange={(event) => setLastFour(normalizeLastFourInput(event.target.value))}
                          placeholder="Optional"
                          className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Opened</span>
                        <input
                          type="date"
                          value={openedDate}
                          onChange={(event) => setOpenedDate(event.target.value)}
                          className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/85 px-3.5 text-sm text-white focus:border-[#7FB6FF]/35 focus:outline-none"
                        />
                      </label>

                      <div className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Card type</span>
                        <div className="inline-flex rounded-lg border border-white/10 bg-[#0D1420]/80 p-1">
                          {(["personal", "business"] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setUserCardType((current) => (current === value ? null : value))}
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
                ) : null}

                {submitError ? <p className="text-sm text-rose-200/88">{submitError}</p> : null}

                <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-white/42">
                    {hasMetadata ? "Optional details will be saved with this card." : "You can add details later from the drawer."}
                  </p>
                  <div className="flex gap-3">
                    <Button variant="secondary" size="sm" className={ROW_ACTION_TEXT_CLASS} onClick={onClose} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button size="sm" className={ROW_ACTION_TEXT_CLASS} onClick={handleSubmit} disabled={!selectedCard || submitting}>
                      {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                      <span>{submitting ? "Adding..." : "Add card"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Surface>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
