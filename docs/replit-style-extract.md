# Replit Style Extract — Memento Landing Page

Use this file as the visual fidelity source for the landing page implementation.

Goal:
Match the Replit landing page as closely as possible in layout, spacing, color, surface treatment, shadows, typography hierarchy, and hover behavior.

This file is for visual implementation fidelity only. Do not use it to change product structure or copy.

---

## 1. Global Page Shell

### Root page wrapper
Use a dark full-page wrapper with relative positioning and hidden horizontal overflow.

Reference classes:
- `min-h-[100dvh]`
- `bg-background`
- `text-foreground`
- `dark`
- `overflow-x-hidden`
- `relative`

### Ambient background layer
Use a full-page absolute background layer behind all content.

Reference structure:
- `absolute inset-0 pointer-events-none`

Background glow layers:
- `absolute top-[-15%] left-[-5%] w-[65vw] h-[65vw] bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.09)_0%,transparent_60%)]`
- `absolute top-[30%] left-[20%] w-[40vw] h-[40vw] bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.04)_0%,transparent_70%)]`
- `absolute top-[-5%] right-[-5%] w-[45vw] h-[45vw] bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.07)_0%,transparent_65%)]`

Grid overlay:
- `absolute inset-0 opacity-[0.025]`
- background image:
  - `linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`
  - `linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)`
- `background-size: 80px 80px`

Bottom fade:
- `absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-background to-transparent`

---

## 2. Navigation

### Nav container
Reference classes:
- `relative z-10`
- `px-6 md:px-12`
- `py-6`
- `flex items-center justify-between`
- `max-w-7xl mx-auto`

### Brand
Text wrapper:
- `text-xl font-bold tracking-tight text-white flex items-center gap-2`

Brand dot:
- `w-6 h-6 rounded-full`
- `bg-gradient-to-tr from-[#4A9EFF] to-[#C8A94B]/80`
- `shadow-[0_0_12px_rgba(74,158,255,0.4)]`

### Right nav cluster
- `flex items-center gap-6`

Dashboard link:
- `text-sm text-white/50 hover:text-white/90 transition-colors`

Sign In button/link:
- `text-sm font-medium text-white/80`
- `hover:text-white`
- `border border-white/10`
- `hover:border-white/20`
- `px-4 py-1.5`
- `rounded-lg`
- `transition-all duration-200`

Preserve existing sign-in/auth behavior. Only match styling.

---

## 3. Hero Layout

### Main container
Reference classes:
- `relative z-10`
- `max-w-7xl mx-auto`
- `px-6 md:px-12`
- `pt-16 md:pt-20`
- `pb-32`

### Hero row
Reference classes:
- `flex flex-col lg:flex-row`
- `items-center`
- `gap-16 lg:gap-20`

### Left column
Reference classes:
- `flex-1`
- `max-w-xl`

### Right column
Reference classes:
- `flex-1 w-full max-w-lg lg:max-w-none relative mt-6 lg:mt-0`

---

## 4. Hero Copy Styling

### Stat pill
Use a compact premium pill above the headline.

Visual traits:
- rounded full pill
- blue-tinted border
- blue-tinted dark background
- muted but readable blue text
- subtle elevation, not heavy

Use values consistent with:
- `#4A9EFF`
- very low-opacity blue fill
- very low-opacity blue border

### Headline
Use oversized tight headline with strong contrast.

Reference sizing direction:
- `text-5xl`
- `md:text-6xl`
- `lg:text-[4rem]`
- `xl:text-[4.75rem]`

Typography direction:
- very bold
- very tight line-height
- tight tracking
- white main text
- blue emphasis on `cards`
- gold emphasis on `you.`

Relevant utility patterns seen in the file:
- `font-bold`
- `tracking-tight`
- `leading-[1.02]`
- `text-white`
- `text-[#4A9EFF]`
- `text-[#C8A94B]`
- gradient text is acceptable if needed:
  - `bg-gradient-to-r`
  - `from-[#4A9EFF]`
  - `via-[#7BC3FF]`
  - `to-[#C8A94B]`
  - `bg-clip-text text-transparent`

### Subtext
Use muted, readable paragraph text under the hero headline.

Direction:
- white at medium opacity
- readable but clearly secondary
- max width should stay constrained

Useful values from file:
- `text-white/50`
- `text-white/60`
- `leading-[1.7]`
- `max-w-xl`

---

## 5. Primary CTA

Use a large blue pill CTA with glow and subtle hover lift.

Base direction:
- blue fill using `#4A9EFF`
- large rounded full shape
- generous horizontal padding
- medium/semibold text
- white text
- soft blue glow

Useful classes/values from file:
- `bg-[#4A9EFF]`
- `hover:bg-[#5FABFF]`
- `rounded-full`
- `font-medium`
- `text-white`
- `transition-all duration-300`
- `hover:-translate-y-px`
- `shadow-[0_0_40px_rgba(74,158,255,0.35)]`
- `hover:shadow-[0_0_56px_rgba(74,158,255,0.5)]`

Arrow/icon motion is acceptable:
- slight translate right on hover

---

## 6. Card Pills Below CTA

Use compact low-contrast premium pills.

Reference classes pulled from the file:
- `inline-flex items-center gap-1.5`
- `px-2.5 py-1`
- `rounded-full`
- `bg-white/[0.04]`
- `border border-white/[0.07]`
- `text-[11px]`
- `text-white/40`
- `font-medium`

For the `+ more` pill:
- same shape
- slightly dimmer text:
  - `text-white/30`

Icons:
- tiny credit-card icon with `w-3 h-3`

---

## 7. Hero Product Preview

### Wrapper
Keep the product preview in a relative wrapper with no pointer interaction.

Reference:
- `relative w-full select-none pointer-events-none`

### Ambient glow behind product preview
Use layered blurred radial glows behind the main mockup.

Reference:
- `absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(74,158,255,0.12)_0%,transparent_70%)] blur-2xl`
- `absolute -inset-10 top-20 bg-[radial-gradient(ellipse_at_center,rgba(200,169,75,0.08)_0%,transparent_65%)] blur-2xl`

### Main product panel
This is one of the most important surfaces on the page.

Reference classes:
- `relative`
- `rounded-2xl`
- `border border-white/10`
- `bg-[#0F0F14]/80`
- `backdrop-blur-xl`
- `overflow-hidden`
- `shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]`

This exact surface treatment should be preserved as closely as possible.

### Product panel header row
Reference:
- `flex items-center justify-between`
- `px-5 py-3.5`
- `border-b border-white/[0.06]`

---

## 8. Color Palette

### Primary blue
- `#4A9EFF`

### Hover blue
- `#5FABFF`
- optional brighter hover also seen:
  - `#6AB4FF`

### Accent gold
- `#C8A94B`

### Base backgrounds
- `#0D0D11`
- `#0D0D12`
- `#0F0F14`
- `#14141C`

### Text hierarchy
- primary text: `text-white`
- secondary: `text-white/90`
- muted body: `text-white/50`, `text-white/60`
- low-emphasis UI labels: `text-white/40`, `text-white/30`

### Borders
Use very soft white borders:
- `border-white/10`
- `border-white/[0.06]`
- `border-white/[0.07]`

---

## 9. Shadows, Glow, and Surface Polish

### Logo glow
- `shadow-[0_0_12px_rgba(74,158,255,0.4)]`

### CTA glow
- `shadow-[0_0_40px_rgba(74,158,255,0.35)]`
- hover: `hover:shadow-[0_0_56px_rgba(74,158,255,0.5)]`

### Product preview shell
- `shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]`

### General glow utilities seen
These can be reused only where appropriate:
- `shadow-[0_0_6px_rgba(74,158,255,0.6)]`
- `shadow-[0_0_15px_rgba(59,130,246,0.3)]`
- `shadow-[0_0_30px_rgba(59,130,246,0.2)]`
- `shadow-[0_0_40px_rgba(255,255,255,0.15)]`

Do not overuse. The design works because the glow is restrained.

---

## 10. Typography Scale Extract

Relevant size classes surfaced in the Replit file:
- `text-sm`
- `text-[11px]`
- `text-[13.5px]`
- `text-[15px]`
- `text-[17px]`
- `text-xl`
- `text-5xl`
- `text-6xl`
- `lg:text-[4rem]`
- `xl:text-[4.75rem]`

Relevant line-height / tracking:
- `leading-[1.02]`
- `leading-tight`
- `leading-relaxed`
- `tracking-tight`
- `tracking-wider`
- `font-medium`
- `font-semibold`
- `font-bold`

Use these to preserve the same rhythm and hierarchy.

---

## 11. Motion / Interaction

### Global
Use smooth, restrained transitions:
- `transition-all`
- `transition-colors`
- `duration-200`
- `duration-300`
- `ease-in-out`

### Hover behaviors actually seen in file
- `hover:-translate-y-px`
- `group-hover:translate-x-0.5`
- `group-hover:translate-x-1`
- `hover:text-white`
- `hover:text-white/90`
- `hover:border-white/20`
- `hover:bg-white/[0.08]`
- `hover:bg-[#5FABFF]`

No flashy animation. Keep it expensive-looking and subtle.

---

## 12. Section Width and Spacing Anchors

Use these as the primary page width and spacing anchors:
- `max-w-7xl`
- `mx-auto`
- `px-6 md:px-12`
- `py-6`
- `pt-16 md:pt-20`
- `pb-32`
- `gap-16 lg:gap-20`
- `mt-6 lg:mt-0`

This spacing system is part of the 1:1 look. Reuse it instead of inventing new values.

---

## 13. Implementation Rules for Codex

1. Match the Replit visual style, not just the content structure.
2. Prefer the extracted class recipes and values in this file whenever possible.
3. Keep the same:
   - ambient glow language
   - border softness
   - dark surface contrast
   - CTA intensity
   - muted text hierarchy
   - spacing rhythm
4. Do not simplify the hero into generic Tailwind defaults.
5. Do not replace the product preview shell styling with standard cards.
6. Preserve existing auth logic for Sign In; only match appearance.

---

## 14. What matters most for 1:1 fidelity

Highest priority:
1. page background + ambient glow
2. nav spacing and styling
3. hero headline size and emphasis colors
4. CTA size + glow + hover
5. pill styling
6. product preview shell surface treatment
7. exact spacing rhythm between hero elements

If there is any conflict between the broader build spec and this file, use this file for visual polish decisions.