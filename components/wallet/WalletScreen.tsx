"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { AddWalletCardResult, WalletCardListItem, WalletCardMetadataResult } from "@/lib/types/server-data";
import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { WalletAddCardButton } from "@/components/wallet/WalletAddCardButton";
import { WalletAddCardModal } from "@/components/wallet/WalletAddCardModal";
import { WalletCardDrawer } from "@/components/wallet/WalletCardDrawer";
import { WalletCardRow } from "@/components/wallet/WalletCardRow";
import { WalletEmptyState } from "@/components/wallet/WalletEmptyState";

type WalletSortOption = "recently_added" | "card_name" | "opened_date";

type WalletScreenProps = {
  cards: WalletCardListItem[];
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

export function WalletScreen({ cards }: WalletScreenProps) {
  const [walletCards, setWalletCards] = useState(cards);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<WalletSortOption>("recently_added");
  const [issuerFilter, setIssuerFilter] = useState("All issuers");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cards[0]?.userCardId ?? null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
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
    setDrawerOpen(false);
    setSelectedCardId((current) => (current === userCardId ? null : current));
  };

  const handleCardAdded = (result: AddWalletCardResult) => {
    setWalletCards((current) => [result.card, ...current]);
    setSelectedCardId(result.card.userCardId);
    setAddModalOpen(false);
    setDrawerOpen(true);
  };

  if (walletCards.length === 0) {
    return (
      <AppShell containerClassName="max-w-5xl px-0 md:px-6">
        <MobilePageContainer className="pb-20">
          <div className="space-y-8 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Wallet</h1>
                <p className="text-sm text-white/58 sm:text-base">Manage your lineup.</p>
              </div>
              <WalletAddCardButton className="w-full sm:w-auto" onClick={() => setAddModalOpen(true)} />
            </div>

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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Wallet</h1>
              <p className="text-sm text-white/58 sm:text-base">Manage your lineup.</p>
            </div>
            <WalletAddCardButton className="w-full sm:w-auto" onClick={() => setAddModalOpen(true)} />
          </div>

          <div className="border-b border-white/8 pb-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px]">
              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-white/42 uppercase">Search</span>
                <input
                  value={query}
                  onChange={handleSearchChange}
                  placeholder="Search cards"
                  className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/80 px-3.5 text-sm text-white placeholder:text-white/28 focus:border-[#7FB6FF]/35 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-white/42 uppercase">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as WalletSortOption)}
                  className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/80 px-3.5 text-sm text-white focus:border-[#7FB6FF]/35 focus:outline-none"
                >
                  <option value="recently_added">Recently added</option>
                  <option value="card_name">Card name A-Z</option>
                  <option value="opened_date">Opened date</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-white/42 uppercase">Issuer</span>
                <select
                  value={issuerFilter}
                  onChange={(event) => setIssuerFilter(event.target.value)}
                  className="h-10 rounded-lg border border-white/10 bg-[#0D1420]/80 px-3.5 text-sm text-white focus:border-[#7FB6FF]/35 focus:outline-none"
                >
                  <option value="All issuers">All issuers</option>
                  {issuers.map((issuer) => (
                    <option key={issuer} value={issuer}>
                      {issuer}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="py-8">
              <h2 className="text-xl font-semibold tracking-tight text-white">No matches found</h2>
              <p className="mt-3 text-sm text-white/56">Try a different search, sort, or issuer filter.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
              {filteredCards.map((card) => (
                <div key={card.userCardId} className="border-b border-white/8 last:border-b-0">
                  <WalletCardRow
                    card={card}
                    isSelected={selectedCardId === card.userCardId}
                    onSelect={(userCardId) => {
                      setSelectedCardId(userCardId);
                      setDrawerOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </MobilePageContainer>
      <WalletCardDrawer
        open={drawerOpen}
        card={selectedCard}
        onClose={() => setDrawerOpen(false)}
        onCardUpdated={handleCardUpdated}
        onCardRemoved={handleCardRemoved}
      />
      <WalletAddCardModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onAdded={handleCardAdded} />
    </AppShell>
  );
}
