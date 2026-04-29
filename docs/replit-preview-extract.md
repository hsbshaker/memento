# Replit Preview Extract — Hero Product Mockup

Use this file as the source of truth for the right-side hero product preview on the landing page.

Goal:
Match the Replit hero preview as closely as possible in:
- shell styling
- proportions
- internal spacing
- text sizing
- row density
- floating callout placement
- overall compactness

This file is ONLY for the right-side hero preview component.

Do not use this to change copy outside the preview or to redesign the landing page.

---

## 1. Outer Hero Preview Column

The preview sits inside this wrapper:

- `flex-1`
- `w-full`
- `max-w-lg`
- `lg:max-w-none`
- `relative`
- `mt-6`
- `lg:mt-0`

This matters because it controls how much width the preview gets relative to the left hero copy.

---

## 2. Preview Root Wrapper

The immediate preview wrapper is:

- `relative`
- `w-full`
- `select-none`
- `pointer-events-none`

This should remain non-interactive in the landing page hero.

---

## 3. Ambient Glow Behind Preview

Two blurred radial glow layers are used behind the preview.

### Blue glow
- `absolute -inset-10`
- `bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.12)_0%,transparent_70%)]`
- `blur-2xl`

### Gold glow
- `absolute -inset-10 top-20`
- `bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.08)_0%,transparent_65%)]`
- `blur-2xl`

These glows are important for the premium depth around the preview.

---

## 4. Main Preview Shell

The main preview card uses this exact styling direction:

- `relative`
- `rounded-2xl`
- `border border-white/10`
- `bg-[#0F0F14]/80`
- `backdrop-blur-xl`
- `shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]`
- `overflow-hidden`

This shell should not be replaced with a generic card style.

---

## 5. Preview Header Bar

The top bar of the preview uses:

- `flex items-center justify-between`
- `px-5`
- `py-3.5`
- `border-b border-white/[0.06]`

### Left side: 3 dots
Dot row:
- `flex items-center gap-1.5`

Each dot:
- `w-2.5 h-2.5`
- `rounded-full`
- `bg-white/10`

### Center title
- `text-[10px]`
- `font-medium`
- `text-white/30`
- `tracking-wider`

Text:
- `Memento — Dashboard`

### Right spacer
- `w-14`

Keep this header subtle and compact.

---

## 6. Main Internal Body

The body wrapper uses:

- `p-5`
- `space-y-4`

This spacing is a big part of the Replit preview density. Do not expand it.

---

## 7. Top Split Row

The first body row uses:

- `flex`
- `gap-3`

This row contains:
1. left value card
2. right "Your Cards" card

---

## 8. Value Remaining Card

The left top card uses:

- `flex-1`
- `rounded-xl`
- `bg-white/[0.03]`
- `border border-white/[0.06]`
- `p-4`

### Label
- `text-[9px]`
- `uppercase`
- `tracking-widest`
- `text-white/35`
- `font-semibold`
- `mb-1.5`

Text:
- `Value Remaining`

### Dollar amount
- `text-2xl`
- `font-bold`
- `text-white`
- `tracking-tight`

Text:
- `$2,419`

### Progress track
Wrapper:
- `mt-2.5`
- `h-1`
- `rounded-full`
- `bg-white/[0.07]`
- `overflow-hidden`

Fill:
- `h-full`
- `w-[88%]`
- `rounded-full`
- `bg-gradient-to-r`
- `from-[#4A9EFF]`
- `to-[#C8A94B]`

### Supporting line
- `mt-1.5`
- `text-[9px]`
- `text-white/30`

Text:
- `of $2,738 tracked this year`

---

## 9. Your Cards Side Card

The right top card uses:

- `w-28`
- `rounded-xl`
- `bg-white/[0.03]`
- `border border-white/[0.06]`
- `p-3`
- `flex flex-col justify-between`

### Label
- `text-[9px]`
- `uppercase`
- `tracking-widest`
- `text-white/35`
- `font-semibold`
- `mb-2`

Text:
- `Your Cards`

### Inner stack
- `space-y-1.5`

### Card pill 1
- `h-5`
- `rounded-md`
- `bg-gradient-to-r`
- `from-[#C8A94B]`
- `to-[#8C7531]`
- `flex items-center`
- `px-2`

Text span:
- `text-[7px]`
- `text-white/70`
- `font-semibold`
- `truncate`

Text:
- `Platinum`

### Card pill 2
- `h-5`
- `rounded-md`
- `bg-gradient-to-r`
- `from-[#C8A94B]`
- `to-[#9E7A22]`
- `flex items-center`
- `px-2`

Text span:
- `text-[7px]`
- `text-white/70`
- `font-semibold`
- `truncate`

Text:
- `Gold`

Important:
This side card is intentionally narrow and compact. Keep the `w-28`.

---

## 10. Attention Pill Row

This row uses:

- `flex items-center`
- `gap-2`

The pill itself uses:

- `flex items-center gap-1.5`
- `px-2 py-1`
- `rounded-full`
- `bg-[#C8A94B]/10`
- `border border-[#C8A94B]/20`

### Icon
- bell icon
- `w-2.5 h-2.5`
- `text-[#C8A94B]`

### Text
- `text-[9px]`
- `font-semibold`
- `text-[#C8A94B]`

Text:
- `3 benefits need attention`

This pill should stay very compact.

---

## 11. Benefits List Container

The list shell uses:

- `rounded-xl`
- `bg-white/[0.025]`
- `border border-white/[0.06]`
- `px-4`
- `py-1`

Important:
This is not a big roomy card. It is tight and compact.

---

## 12. Benefit Row Base Styling

Each benefit row uses:

- `flex items-center justify-between`
- `py-2.5`
- `border-b border-white/5`
- `last:border-0`

This `py-2.5` is critical. Do not make rows taller unless absolutely necessary.

### Left side of row
- `flex items-center`
- `gap-2.5`
- `min-w-0`

### Right side of row
- `flex items-center`
- `gap-2`
- `shrink-0`

---

## 13. Standard Benefit Dot

For non-used rows:
- `w-2 h-2`
- `rounded-full`
- `bg-[#4A9EFF]/70`
- `shrink-0`
- `shadow-[0_0_6px_rgba(74,158,255,0.6)]`

---

## 14. Standard Benefit Name

- `text-[11px]`
- `font-medium`
- `text-white/80`
- `truncate`

---

## 15. Standard Benefit Tag Pills

### Blue annual pill
- `text-[9px]`
- `font-semibold`
- `uppercase`
- `tracking-wider`
- `px-1.5`
- `py-0.5`
- `rounded-full`
- `bg-[#4A9EFF]/10`
- `text-[#4A9EFF]`

Text:
- `Annual`

### Gold expiry pill
- `text-[9px]`
- `font-semibold`
- `uppercase`
- `tracking-wider`
- `px-1.5`
- `py-0.5`
- `rounded-full`
- `bg-[#C8A94B]/10`
- `text-[#C8A94B]`

Text:
- `Expires Jun`

### Neutral monthly/used pill
- `text-[9px]`
- `font-semibold`
- `uppercase`
- `tracking-wider`
- `px-1.5`
- `py-0.5`
- `rounded-full`
- `bg-white/5`

For monthly:
- `text-white/40`

For used:
- `text-white/30`

---

## 16. Standard Value Text on Right

- `text-[11px]`
- `font-semibold`
- `text-white/90`

Examples:
- `$200`
- `$50`
- `$10/mo`
- `$199`

---

## 17. Used Row Variant

The used row has slightly different styling:

Row wrapper adds:
- `opacity-40`

Left icon wrapper:
- `w-4 h-4`
- `rounded-full`
- `bg-white/10`
- `flex items-center justify-center`
- `shrink-0`

Check icon:
- `w-2.5 h-2.5`
- `text-white/60`

Name remains:
- `text-[11px]`
- `font-medium`
- `text-white/80`

Text:
- `CLEAR Plus`

---

## 18. Exact Benefit Content Order

Use these rows in this order:

1. `Uber Cash`
   - tag: `Annual`
   - value: `$200`

2. `Airline Fee Credit`
   - tag: `Annual`
   - value: `$200`

3. `Saks Fifth Avenue`
   - tag: `Expires Jun`
   - value: `$50`

4. `Dining Credit`
   - tag: `Monthly`
   - value: `$10/mo`

5. `CLEAR Plus`
   - tag: `Used`
   - value: `$199`

---

## 19. Top Floating Callout

The top-right callout uses:

- `absolute`
- `-top-5`
- `-right-4`
- `md:-right-8`
- `rounded-xl`
- `bg-[#14141C]/90`
- `backdrop-blur-xl`
- `border border-white/10`
- `px-3.5`
- `py-2.5`
- `shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
- `flex items-center gap-2.5`

### Icon wrapper
- `w-6 h-6`
- `rounded-full`
- `bg-[#C8A94B]/15`
- `flex items-center justify-center`
- `shrink-0`

Icon:
- bell
- `w-3 h-3`
- `text-[#C8A94B]`

### Text block
Title:
- `text-[10px]`
- `font-semibold`
- `text-white`

Text:
- `Saks credit resets Jul 1`

Subtext:
- `text-[9px]`
- `text-white/40`

Text:
- `$50 remaining — don't miss it`

---

## 20. Bottom Floating Callout

The bottom-left callout uses:

- `absolute`
- `-bottom-5`
- `-left-4`
- `md:-left-6`
- `rounded-xl`
- `bg-[#14141C]/90`
- `backdrop-blur-xl`
- `border border-white/10`
- `px-3.5`
- `py-2.5`
- `shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
- `flex items-center gap-2.5`

### Icon wrapper
- `w-6 h-6`
- `rounded-full`
- `bg-[#4A9EFF]/15`
- `flex items-center justify-center`
- `shrink-0`

Icon:
- sparkles
- `w-3 h-3`
- `text-[#4A9EFF]`

### Text block
Title:
- `text-[10px]`
- `font-semibold`
- `text-white`

Text:
- `$2,419 untapped`

Subtext:
- `text-[9px]`
- `text-white/40`

Text:
- `Across 2 cards this year`

---

## 21. Key Density / Proportion Rules

These are critical to the Replit look:

1. Keep the preview compact.
2. Do not enlarge text sizes inside the preview.
3. Do not increase row height beyond `py-2.5`.
4. Do not widen the `Your Cards` card beyond `w-28`.
5. Do not increase the body padding beyond `p-5`.
6. Keep the list card tight with `px-4 py-1`.
7. Keep floating callouts small and crisp.
8. Preserve the shell glow and border treatment exactly as closely as possible.

---

## 22. Implementation Guidance for Codex

Use this file as the source of truth for rebuilding or tightening the right-side hero preview.

Priority order:
1. main shell
2. top header
3. top split row proportions
4. benefits list density
5. floating callout placement
6. text sizing fidelity

Do not approximate this preview with generic cards.
Match the class recipe and proportions as closely as possible.