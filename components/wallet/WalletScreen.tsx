"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CreditCard, Plus } from "lucide-react";
import type { ChangeEvent } from "react";
import type { AddWalletCardResult, WalletCardListItem, WalletCardMetadataResult } from "@/lib/types/server-data";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { WalletAddCardModal } from "@/components/wallet/WalletAddCardModal";
import { WalletMetrics } from "@/components/wallet/WalletMetrics";
import { WalletCardModal } from "@/components/wallet/WalletCardDrawer";
import { WalletCardRow } from "@/components/wallet/WalletCardRow";
import { WalletEmptyState } from "@/components/wallet/WalletEmptyState";

type WalletSortOption = "recently_added" | "card_name" | "opened_date";

type WalletScreenProps = {
  cards: WalletCardListItem[];
  initialAddModalOpen?: boolean;
};

function getSearchableText(card: WalletCardListItem): string {
  return [card.cardName, card.issuer, card.nickname, card.lastFour].filter(Boolean).join(" ").toLowerCase();
}

function sortCards(cards: WalletCardListItem[], sort: WalletSortOption): WalletCardListItem[] {
  const sorted = [...cards];

  if (sort === "card_name") {
    sorted.sort((a, b) => a.cardName.localeCompare(b.cardName));
    return sorted;
  }

  if (sort === "opened_date") {
    sorted.sort((a, b) => {
      const left = a.openedDate ? Date.parse(`${a.openedDate}T00:00:00Z`) : Number.NEGATIVE_INFINITY;
      const right = b.openedDate ? Date.parse(`${b.openedDate}T00:00:00Z`) : Number.NEGATIVE_INFINITY;
      return right - left;
    });
    return sorted;
  }

  sorted.sort((a, b) => Date.parse(b.sortDate) - Date.parse(a.sortDate));
  return sorted;
}

export function WalletScreen({ cards, initialAddModalOpen = false }: WalletScreenProps) {
  const [walletCards, setWalletCards] = useState(cards);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WalletSortOption>("recently_added");
  const [issuerFilter, setIssuerFilter] = useState("All issuers");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.userCardId ?? null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(initialAddModalOpen);
  const deferredQuery = useDeferredValue(query);

  const issuers = useMemo(() => {
    return Array.from(new Set(walletCards.map((card) => card.issuer))).sort((a, b) => a.localeCompare(b));
  }, [walletCards]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    const visibleCards = walletCards.filter((card) => {
      if (issuerFilter !== "All issuers" && card.issuer !== issuerFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return getSearchableText(card).includes(normalizedQuery);
    });

    return sortCards(visibleCards, sort);
  }, [deferredQuery, issuerFilter, sort, walletCards]);

  const selectedCard = useMemo(
    () => walletCards.find((card) => card.userCardId === selectedCardId) ?? null,
    [selectedCardId, walletCards],
  );

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleCardUpdated = (result: WalletCardMetadataResult) => {
    setWalletCards((current) =>
      current.map((card) =>
        card.userCardId === result.userCardId
          ? {
              ...card,
              nickname: result.nickname,
              lastFour: result.lastFour,
              openedDate: result.openedDate,
              userCardType: result.userCardType,
            }
          : card,
      ),
    );
  };

  const handleCardRemoved = (userCardId: string) => {
    setWalletCards((current) => current.filter((card) => card.userCardId !== userCardId));
    setCardModalOpen(false);
    setSelectedCardId((current) => (current === userCardId ? null : current));
  };

  const handleCardAdded = (result: AddWalletCardResult) => {
    setWalletCards((current) => [result.card, ...current]);
    setAddModalOpen(false);
  };

  if (walletCards.length === 0) {
    return (
      <AppShell containerClassName="max-w-5xl px-0 md:px-6">
        <MobilePageContainer className="pb-20">
          <div className="space-y-8 pt-6">
            <p className="text-xs font-medium tracking-[0.24em] text-accent uppercase">Wallet</p>

            <WalletEmptyState onAddCard={() => setAddModalOpen(true)} />
          </div>
        </MobilePageContainer>
        <WalletAddCardModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdded={handleCardAdded} />
      </AppShell>
    );
  }

  return (
    <AppShell containerClassName="max-w-5xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-5 pt-6">
          <p className="text-xs font-medium tracking-[0.24em] text-accent uppercase">Wallet</p>

          <WalletMetrics cardCount={walletCards.length} />

          <div className="flex items-center gap-2 border-b border-border pb-4">
            <input
              aria-label="Search cards"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search cards"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
            />
            <select
              aria-label="Sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as WalletSortOption)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="recently_added">Recently added</option>
              <option value="card_name">A–Z</option>
              <option value="opened_date">Opened date</option>
            </select>
            <select
              aria-label="Filter by issuer"
              value={issuerFilter}
              onChange={(event) => setIssuerFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="All issuers">All issuers</option>
              {issuers.map((issuer) => (
                <option key={issuer} value={issuer}>
                  {issuer}
                </option>
              ))}
            </select>
            <div className="h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              aria-label="Add card"
              className="inline-flex shrink-0 items-center gap-1 rounded-md text-accent transition-colors hover:text-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Plus className="h-3.5 w-3.5" />
              <CreditCard className="h-4 w-4" />
            </button>
          </div>

          {filteredCards.length === 0 ? (
            <div className="py-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">No matches found</h2>
              <p className="mt-3 text-sm text-muted-foreground">Try a different search, sort, or issuer filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              {filteredCards.map((card) => (
                <div key={card.userCardId} className="border-b border-border-muted last:border-b-0">
                  <WalletCardRow
                    card={card}
                    isSelected={selectedCardId === card.userCardId}
                    onSelect={(userCardId) => {
                      setSelectedCardId(userCardId);
                      setCardModalOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

        </div>
      </MobilePageContainer>
      <WalletCardModal
        open={cardModalOpen}
        card={selectedCard}
        onClose={() => setCardModalOpen(false)}
        onCardUpdated={handleCardUpdated}
        onCardRemoved={handleCardRemoved}
      />
      <WalletAddCardModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdded={handleCardAdded} />
    </AppShell>
  );
}
