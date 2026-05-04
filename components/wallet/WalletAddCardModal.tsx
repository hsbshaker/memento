"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, LoaderCircle, Search, X } from "lucide-react";
import type { AddWalletCardResult, CardSearchResult } from "@/lib/types/server-data";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Surface } from "@/components/ui/Surface";
import {
  ROW_MICRO_TEXT_CLASS,
  ROW_PRIMARY_TEXT_CLASS,
  ROW_SECONDARY_TEXT_CLASS,
} from "@/components/ui/row-typography";
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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lock body scroll + Escape key
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

  // Search
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/cards/search?query=${encodeURIComponent(deferredQuery.trim())}`,
          { method: "GET", credentials: "include" },
        );

        // Safely parse JSON — the server might return HTML on unexpected errors
        let payload: SearchCardsResponse = {};
        try {
          payload = (await response.json()) as SearchCardsResponse;
        } catch {
          /* non-JSON body — leave payload empty */
        }

        if (!cancelled) {
          if (response.ok) {
            setResults(payload.results ?? []);
          } else if (deferredQuery.trim()) {
            // Only surface an error when the user has actively typed something
            setSearchError(payload.error ?? "Search failed. Please try again.");
            setResults([]);
          }
          // For empty-query failures (initial load), fall through silently
        }
      } catch (error) {
        if (!cancelled && deferredQuery.trim()) {
          setSearchError(
            error instanceof Error ? error.message : "Search failed. Please try again.",
          );
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

  // Reset all state on close
  useEffect(() => {
    if (open) return;
    setQuery("");
    setResults([]);
    setLoading(false);
    setSearchError(null);
    setSelectedCard(null);
    setNickname("");
    setLastFour("");
    setOpenedDate("");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: selectedCard.cardId,
          nickname,
          lastFour,
          openedDate,
          userCardType: null,
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

  // Only show search errors when the user has typed something
  const showSearchError = Boolean(searchError) && query.trim().length > 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6"
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
            <Surface className="max-h-[92vh] overflow-y-auto rounded-xl border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_60px_-32px_rgba(0,0,0,0.92)]">

              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Add card</h2>
                  <p className={cn("mt-1", ROW_SECONDARY_TEXT_CLASS)}>
                    Search for a card, then add any details you want to keep.
                  </p>
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

              <div className="mt-5 space-y-4">

                {/* Search input */}
                <label className="block">
                  <span className={ROW_MICRO_TEXT_CLASS}>Search</span>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/32" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by card name or issuer"
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.05] pr-4 pl-10 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                    />
                  </div>
                </label>

                {/* Results */}
                {loading ? (
                  <div className="overflow-hidden rounded-lg border border-white/10">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[52px] animate-pulse border-b border-white/8 bg-white/[0.03] last:border-b-0"
                      />
                    ))}
                  </div>
                ) : showSearchError ? (
                  <div className="rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3.5 py-3 text-sm text-rose-100/88">
                    {searchError}
                  </div>
                ) : results.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-3 text-sm text-white/45">
                    {query.trim() ? "No cards found." : "Start typing to search for a card."}
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02]">
                    {results.map((card) => {
                      const isSelected = selectedCard?.cardId === card.cardId;
                      return (
                        <button
                          key={card.cardId}
                          type="button"
                          onClick={() => setSelectedCard(card)}
                          className={cn(
                            "flex w-full items-center gap-3 border-b border-white/8 px-3.5 py-2.5 text-left last:border-b-0 transition-colors focus-visible:outline-none",
                            isSelected ? "bg-[#7FB6FF]/[0.07]" : "hover:bg-white/[0.04]",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={ROW_MICRO_TEXT_CLASS}>{card.issuer}</p>
                            <p className={cn("mt-0.5 truncate", ROW_PRIMARY_TEXT_CLASS)}>
                              {getCleanCardName(card.displayName, card.cardName)}
                            </p>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-[#7FB6FF]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Optional details form — shown after a card is selected */}
                {selectedCard ? (
                  <div className="space-y-4 border-t border-white/8 pt-4">
                    <div>
                      <p className={ROW_MICRO_TEXT_CLASS}>Selected card</p>
                      <p className={cn("mt-1", ROW_PRIMARY_TEXT_CLASS)}>
                        {getCleanCardName(selectedCard.displayName, selectedCard.cardName)}
                      </p>
                      <p className={cn("mt-0.5", ROW_SECONDARY_TEXT_CLASS)}>{selectedCard.issuer}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Nickname</span>
                        <input
                          value={nickname}
                          onChange={(event) => setNickname(event.target.value)}
                          placeholder="Optional"
                          className="h-10 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className={ROW_MICRO_TEXT_CLASS}>Last Four</span>
                        <input
                          value={lastFour}
                          inputMode="numeric"
                          onChange={(event) =>
                            setLastFour(normalizeLastFourInput(event.target.value))
                          }
                          placeholder="Optional"
                          className="h-10 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className={ROW_MICRO_TEXT_CLASS}>Date Opened</span>
                      <DatePicker
                        value={openedDate}
                        onChange={setOpenedDate}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                ) : null}

                {submitError ? (
                  <p className="text-sm text-rose-200/88">{submitError}</p>
                ) : null}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-white/8 pt-4">
                  <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSubmit()}
                    disabled={!selectedCard || submitting}
                  >
                    {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {submitting ? "Adding..." : "Add card"}
                  </Button>
                </div>

              </div>
            </Surface>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
