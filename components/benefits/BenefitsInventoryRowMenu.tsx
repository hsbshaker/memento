"use client";

import { useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { BenefitsInventoryItem } from "@/lib/types/server-data";

type BenefitMenuVariant = "unused" | "used" | "not_tracked";

type BenefitsInventoryRowMenuProps = {
  item: BenefitsInventoryItem;
  variant: BenefitMenuVariant;
  disabled?: boolean;
  onMarkUsed: (item: BenefitsInventoryItem) => void;
  onMarkNotUsed: (item: BenefitsInventoryItem) => void;
  onDoNotTrack: (item: BenefitsInventoryItem) => void;
  onStartTracking: (item: BenefitsInventoryItem) => void;
};

type MenuItem = {
  label: string;
  onSelect: () => void;
  muted?: boolean;
};

export function BenefitsInventoryRowMenu({
  item,
  variant,
  disabled = false,
  onMarkUsed,
  onMarkNotUsed,
  onDoNotTrack,
  onStartTracking,
}: BenefitsInventoryRowMenuProps) {
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
            "text-muted-foreground transition-colors",
            "hover:bg-hover hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
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
          className="z-[130] w-44 rounded-lg border border-border bg-surface-raised p-1 shadow-lg backdrop-blur-md outline-none"
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
                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                "focus-visible:outline-none focus-visible:bg-hover",
                menuItem.muted
                  ? "text-muted-foreground hover:bg-hover hover:text-foreground"
                  : "text-foreground hover:bg-hover",
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
