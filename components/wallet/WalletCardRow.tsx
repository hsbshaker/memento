"use client";

import { ChevronRight, CreditCard } from "lucide-react";
import type { WalletCardListItem } from "@/lib/types/server-data";
import { cn } from "@/lib/cn";
import { ROW_PRIMARY_TEXT_CLASS, ROW_SECONDARY_TEXT_CLASS } from "@/components/ui/row-typography";

type WalletCardRowProps = {
  card: WalletCardListItem;
  isSelected: boolean;
  onSelect: (userCardId: string) => void;
};

function formatOpenedDate(openedDate: string | null): string | null {
  if (!openedDate) return null;

  const parsed = new Date(`${openedDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function getCardTileLabel(cardName: string): string {
  return cardName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildSecondaryLine(card: WalletCardListItem): string {
  const cardTypeLabel = card.userCardType ? `${card.userCardType.charAt(0).toUpperCase()}${card.userCardType.slice(1)}` : null;
  const parts = [card.nickname, cardTypeLabel, card.issuer, card.lastFour ? `Last Four: ${card.lastFour}` : null].filter(Boolean);
  return parts.join(" • ");
}

export function WalletCardRow({ card, isSelected, onSelect }: WalletCardRowProps) {
  const secondaryLine = buildSecondaryLine(card);
  const openedDateLabel = formatOpenedDate(card.openedDate);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(card.userCardId)}
      className={cn(
        "group relative block w-full rounded-xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220]",
        isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.035]",
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3.5 sm:px-4">
        <span
          className={cn(
            "absolute inset-y-2 left-0 w-0.5 rounded-full bg-transparent transition-colors",
            isSelected && "bg-[#7FB6FF]/80",
          )}
          aria-hidden="true"
        />
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] text-white/70">
          <CreditCard className="h-3.5 w-3.5" />
          <span className="mt-0.5 text-[9px] font-semibold tracking-[0.16em]">{getCardTileLabel(card.cardName)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <h2 className={cn("truncate", ROW_PRIMARY_TEXT_CLASS)}>{card.cardName}</h2>
          <p className={cn("mt-0.5 truncate", ROW_SECONDARY_TEXT_CLASS)}>
            {secondaryLine || card.issuer}
            {openedDateLabel ? ` • Opened ${openedDateLabel}` : ""}
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-white/24 transition-colors group-hover:text-white/38" />
      </div>
    </button>
  );
}
