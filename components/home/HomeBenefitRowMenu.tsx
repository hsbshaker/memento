"use client";

import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { HomeFeedItem } from "@/lib/types/server-data";

type BenefitMenuVariant = "unused" | "used" | "not_tracked";

type HomeBenefitRowMenuProps = {
  item: HomeFeedItem;
  variant: BenefitMenuVariant;
  disabled?: boolean;
  onMarkUsed: (item: HomeFeedItem) => void;
  onMarkNotUsed: (item: HomeFeedItem) => void;
  onDoNotTrack: (item: HomeFeedItem) => void;
  onStartTracking: (item: HomeFeedItem) => void;
};

type MenuItem = {
  label: string;
  onSelect: () => void;
  muted?: boolean;
};

export function HomeBenefitRowMenu({
  item,
  variant,
  disabled = false,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
}: HomeBenefitRowMenuProps) {
  const [open, setOpen] = useState(false);

  const menuItems: MenuItem[] =
    variant === "not_tracked"
      ? [{ label: "Start Tracking", onSelect: () => onStartTracking(item) }]
      : variant === "used"
        ? [
            { label: "Mark as Unused", onSelect: () => onMarkNotUsed(item) },
            { label: "Do Not Track", onSelect: () => onDoNotTrack(item), muted: true },
          ]
        : [
            { label: "Mark as Used", onSelect: () => onMarkUsed(item) },
            { label: "Do Not Track", onSelect: () => onDoNotTrack(item), muted: true },
          ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open benefit actions"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "text-white/28 transition-colors",
            "hover:bg-white/[0.06] hover:text-white/65",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FB6FF]/70",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <MoreHorizontal size={15} strokeWidth={1.8} aria-hidden />
        </button>
      </PopoverTrigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-[130] w-44 rounded-[9px] border border-white/[0.12] bg-[#0F1823]/96 p-1 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.88)] backdrop-blur-md outline-none"
        >
          {menuItems.map((menuItem) => (
            <button
              key={menuItem.label}
              type="button"
              onClick={() => {
                menuItem.onSelect();
                setOpen(false);
              }}
              className={cn(
                "w-full rounded-[6px] px-3 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:bg-white/[0.06]",
                menuItem.muted
                  ? "text-white/50 hover:bg-white/[0.05] hover:text-white/68"
                  : "text-white/82 hover:bg-white/[0.07] hover:text-white/96",
              )}
            >
              {menuItem.label}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
