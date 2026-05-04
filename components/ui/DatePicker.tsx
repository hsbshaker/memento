"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type DatePickerProps = {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplayDate(value: string): string {
  if (!value) return "";
  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function DatePicker({ value, onChange, placeholder = "Select date", className }: DatePickerProps) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync calendar view to the selected value when opening
  useEffect(() => {
    if (!open) return;
    if (value) {
      const parts = value.split("-");
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      if (y && !Number.isNaN(m)) {
        setViewYear(y);
        setViewMonth(m);
      }
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  // Parse selected date for highlighting
  const selParts = value ? value.split("-") : [];
  const selYear = selParts[0] ? Number(selParts[0]) : null;
  const selMonth = selParts[1] ? Number(selParts[1]) - 1 : null;
  const selDay = selParts[2] ? Number(selParts[2]) : null;

  // Build 42-cell grid (6 rows × 7 cols)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const displayValue = formatDisplayDate(value);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white/[0.05] px-3.5 text-sm transition focus:outline-none",
          open ? "border-[#7FB6FF]/35" : "border-white/10",
          displayValue ? "text-white" : "text-white/28",
        )}
      >
        <span>{displayValue || placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-white/36" />
      </button>

      {/* Calendar popover */}
      {open ? (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[252px] rounded-xl border border-white/10 bg-[#111113] p-3 shadow-[0_16px_48px_-20px_rgba(0,0,0,0.92)]">
          {/* Month navigation */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/46 transition hover:bg-white/8 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/46 transition hover:bg-white/8 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day name headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-white/32">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              const isSelected =
                day !== null &&
                day === selDay &&
                viewMonth === selMonth &&
                viewYear === selYear;
              const isToday =
                day !== null &&
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <div key={i} className="flex items-center justify-center">
                  {day !== null ? (
                    <button
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md text-xs transition",
                        isSelected
                          ? "bg-[#7FB6FF]/18 font-medium text-[#7FB6FF]"
                          : isToday
                          ? "border border-white/16 text-white/80 hover:bg-white/8"
                          : "text-white/62 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="h-7 w-7" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
