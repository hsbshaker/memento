"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Surface } from "@/components/ui/Surface";
import { getCleanCardName, getIssuerShortLabel } from "@/lib/format-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CardSearchResult } from "@/lib/types/server-data";

type ToastState = {
  id: string;
  message: string;
};

type SelectedOnboardingCard = CardSearchResult;
type PersistedUserCardRow = {
  card_id: string;
  cards: {
    id: string;
    card_name: string;
    display_name: string | null;
    issuer: string;
    source_url: string | null;
    card_status: "active" | "no_trackable_benefits" | "retired" | null;
  } | {
    id: string;
    card_name: string;
    display_name: string | null;
    issuer: string;
    source_url: string | null;
    card_status: "active" | "no_trackable_benefits" | "retired" | null;
  }[] | null;
};
type CardsRouteRow = {
  id: string;
  issuer: string;
  card_name: string;
  display_name: string | null;
  network: string | null;
  card_status: "active" | "no_trackable_benefits";
};

function CardArtPreview({ card }: { card: CardSearchResult }) {
  if (card.cardArtUrl) {
    return (
      <div className="relative h-11 w-[70px] overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <Image
          src={card.cardArtUrl}
          alt=""
          fill
          sizes="70px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-[70px] items-end overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(74,158,255,0.45),rgba(200,169,75,0.28))] px-2 py-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">
        {getIssuerShortLabel(card.issuer)}
      </span>
    </div>
  );
}

function formatCardCount(count: number) {
  return `${count} ${count === 1 ? "Card" : "Cards"}`;
}

export function LineupCardSearch() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<SelectedOnboardingCard[]>([]);
  const [persistedCardIds, setPersistedCardIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedCardIds = useMemo(() => new Set(selectedCards.map((card) => card.cardId)), [selectedCards]);
  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0;

  useEffect(() => {
    if (!showResults) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      abortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cards?q=${encodeURIComponent(trimmedQuery)}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        const rawPayload = (await response.json()) as CardsRouteRow[] | { error?: string };

        if (!response.ok) {
          const message =
            !Array.isArray(rawPayload) && typeof rawPayload.error === "string"
              ? rawPayload.error
              : `Failed to search cards. (${response.status})`;
          throw new Error(message);
        }

        const payload = Array.isArray(rawPayload) ? rawPayload : [];
        setResults(
          payload.map((card) => ({
            cardId: card.id,
            cardName: card.card_name,
            displayName: card.display_name,
            issuer: card.issuer,
            cardArtUrl: null,
            cardStatus: card.card_status,
          })),
        );
      } catch (searchError) {
        if (controller.signal.aborted) return;
        const message = searchError instanceof Error ? searchError.message : "Failed to search cards.";
        setError(message);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [showResults, trimmedQuery]);

  useEffect(() => {
    let isMounted = true;

    const loadExistingWallet = async () => {
      setIsWalletLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (authError || !user) {
        setIsWalletLoading(false);
        return;
      }

      const { data, error: walletError } = await supabase
        .from("user_cards")
        .select("card_id, cards!inner(id, card_name, display_name, issuer, source_url, card_status)")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (!isMounted) return;

      if (walletError) {
        setSaveError("We couldn’t load your saved cards. Please refresh and try again.");
        setIsWalletLoading(false);
        return;
      }

      const walletRows = (data ?? []) as PersistedUserCardRow[];
      const persistedCards: SelectedOnboardingCard[] = [];

      for (const row of walletRows) {
        const card = Array.isArray(row.cards) ? row.cards[0] : row.cards;
        if (!card) continue;

        persistedCards.push({
          cardId: row.card_id,
          cardName: card.card_name,
          displayName: card.display_name,
          issuer: card.issuer,
          cardArtUrl: null,
          cardStatus: card.card_status === "no_trackable_benefits" ? "no_trackable_benefits" : "active",
        });
      }

      persistedCards.sort((a, b) =>
        getCleanCardName(a.displayName, a.cardName).localeCompare(getCleanCardName(b.displayName, b.cardName)),
      );

      setSelectedCards(persistedCards);
      setPersistedCardIds(new Set(persistedCards.map((card) => card.cardId)));
      setIsWalletLoading(false);
    };

    void loadExistingWallet();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    const id = `${Date.now()}-${message}`;
    setToast({ id, message });

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  };

  const handleSelectCard = (card: CardSearchResult) => {
    if (selectedCardIds.has(card.cardId)) return;

    setSelectedCards((current) => [...current, card]);
    setSaveError(null);
    setQuery("");
    setResults([]);
    setError(null);
    abortRef.current?.abort();
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    if (card.cardStatus === "no_trackable_benefits") {
      showToast(
        "This card will still be added to your wallet, but it does not currently have any trackable benefits in Memento.",
      );
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    const card = selectedCards.find((selectedCard) => selectedCard.cardId === cardId);
    const cardLabel = card ? getCleanCardName(card.displayName, card.cardName) : "this card";
    const confirmed = window.confirm(`Remove ${cardLabel} from your wallet?`);

    if (!confirmed) return;

    if (persistedCardIds.has(cardId)) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setSaveError("We couldn’t update your lineup. Please try again.");
        return;
      }

      const { error: deleteError } = await supabase
        .from("user_cards")
        .delete()
        .eq("user_id", user.id)
        .eq("card_id", cardId);

      if (deleteError) {
        setSaveError("We couldn’t update your lineup. Please try again.");
        return;
      }
    }

    setSelectedCards((current) => current.filter((card) => card.cardId !== cardId));
    setPersistedCardIds((current) => {
      const next = new Set(current);
      next.delete(cardId);
      return next;
    });
    setSaveError(null);
  };

  const handleContinue = async () => {
    if (selectedCards.length === 0 || isContinuing) return;

    setIsContinuing(true);
    setSaveError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/auth/login");
        return;
      }

      const selectedCardIdsList = selectedCards.map((card) => card.cardId);
      const { data: existingRows, error: existingError } = await supabase
        .from("user_cards")
        .select("id, card_id, status")
        .eq("user_id", user.id)
        .in("card_id", selectedCardIdsList);

      if (existingError) {
        throw new Error("Could not save your selected cards.");
      }

      const activeCardIds = new Set(
        ((existingRows ?? []) as Array<{ card_id: string; status: "active" | "removed" }>)
          .filter((row) => row.status === "active")
          .map((row) => row.card_id),
      );

      const cardsToInsert = selectedCardIdsList.filter((cardId) => !activeCardIds.has(cardId));

      if (cardsToInsert.length > 0) {
        const insertRows = cardsToInsert.map((cardId) => ({
          user_id: user.id,
          card_id: cardId,
          status: "active" as const,
        }));

        const { error: insertError } = await supabase.from("user_cards").insert(insertRows);
        if (insertError) {
          throw new Error("Could not save your selected cards.");
        }

        for (const cardId of cardsToInsert) {
          const { error: bootstrapError } = await supabase.rpc("bootstrap_user_benefits_for_card", {
            p_user_id: user.id,
            p_card_id: cardId,
          });

          if (bootstrapError) {
            console.error(`Failed to bootstrap user benefits for card ${cardId}`, bootstrapError);
          }
        }
      }

      router.push("/onboarding/confirm-benefits");
    } catch (continueError) {
      setSaveError(
        continueError instanceof Error
          ? continueError.message
          : "We couldn’t save your selected cards. Please try again.",
      );
    } finally {
      setIsContinuing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="relative mb-8">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            abortRef.current?.abort();
            setQuery("");
            setResults([]);
            setError(null);
          }}
          placeholder="Search cards (e.g. Platinum, Sapphire...)"
          className="w-full rounded-xl border border-white/10 bg-white/[0.045] py-4 pl-12 pr-4 text-white shadow-[0_18px_40px_-28px_rgba(0,0,0,0.95)] outline-none backdrop-blur-md transition-all placeholder:text-white/35 focus:border-[#4A9EFF]/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#4A9EFF]/20"
        />

        {showResults ? (
          <Surface className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden border-white/10 bg-[#11131A]/90 p-1 shadow-[0_28px_80px_-40px_rgba(0,0,0,0.95)]">
            {error ? <p className="px-4 py-3 text-sm text-[#F7C948]">{error}</p> : null}
            {isLoading ? <p className="px-4 py-3 text-sm text-white/55">Searching cards...</p> : null}

            {!error && !isLoading ? (
              results.length > 0 ? (
                <ul className="max-h-[26rem] overflow-y-auto py-1">
                  {results.map((card) => {
                    const isSelected = selectedCardIds.has(card.cardId);
                    const cardLabel = getCleanCardName(card.displayName, card.cardName);
                    const issuerLabel = getIssuerShortLabel(card.issuer);

                    return (
                      <li key={card.cardId}>
                        <button
                          type="button"
                          onClick={() => handleSelectCard(card)}
                          disabled={isSelected}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                            isSelected
                              ? "cursor-not-allowed opacity-55"
                              : "text-white/92 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A9EFF]/30"
                          }`}
                        >
                          <CardArtPreview card={card} />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{cardLabel}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/45">
                              <span>{issuerLabel}</span>
                              {card.cardStatus === "no_trackable_benefits" ? (
                                <span className="rounded-full border border-[#C8A94B]/20 bg-[#C8A94B]/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-[#E5CD83]">
                                  No trackable benefits yet
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="text-xs text-white/45">Added</span>
                            ) : (
                              <span className="text-xs font-medium text-[#9CC8FF]">Add</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-white/55">No cards match that search.</p>
              )
            ) : null}
          </Surface>
        ) : null}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2">
          <div className="rounded-xl border border-[#C8A94B]/20 bg-[#18150E]/92 px-4 py-3 text-sm leading-relaxed text-[#F1E2B0] shadow-[0_22px_60px_-36px_rgba(0,0,0,0.95)] backdrop-blur-md">
            {toast.message}
          </div>
        </div>
      ) : null}

      <section className="mt-auto pt-2">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">Your Wallet</h2>
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/80">
            {formatCardCount(selectedCards.length)}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] shadow-[0_22px_60px_-42px_rgba(0,0,0,0.95)] backdrop-blur-md">
          {isWalletLoading ? (
            <div className="flex min-h-[200px] items-center justify-center px-6 py-12">
              <p className="text-sm text-white/40">Loading your saved cards…</p>
            </div>
          ) : selectedCards.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center px-6 py-12">
              <p className="text-sm text-white/40">No cards added yet.</p>
            </div>
          ) : (
            <div className="px-6">
              {selectedCards.map((card, index) => {
                const cardLabel = getCleanCardName(card.displayName, card.cardName);
                const issuerLabel = getIssuerShortLabel(card.issuer);

                return (
                  <div
                    key={card.cardId}
                    className={`flex items-center justify-between gap-4 py-3 ${
                      index === 0 ? "" : "border-t border-white/6"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-4">
                      <p className="truncate text-sm font-medium leading-none text-white">{cardLabel}</p>
                      <span aria-hidden className="shrink-0 text-[10px] leading-none text-white/22">
                        •
                      </span>
                      <p className="truncate text-xs leading-none text-white/45">{issuerLabel}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleRemoveCard(card.cardId)}
                      className="shrink-0 text-rose-300/70 transition-colors hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/30"
                      aria-label={`Remove ${cardLabel}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {saveError ? <p className="mb-4 text-sm text-rose-100/88">{saveError}</p> : null}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={selectedCards.length === 0 || isContinuing}
            onClick={() => void handleContinue()}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 font-semibold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isContinuing ? "Saving..." : "Continue to reminders"}
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
