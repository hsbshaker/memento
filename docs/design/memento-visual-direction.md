# Memento Visual Direction + Theme Rules

**Status:** Active
**Created:** 2026-05-31
**Purpose:** Design direction reference for all UI overhaul work. All builder agents working on Memento's visual system must read this document before writing any code.

---

## 1. Product Visual North Star

Memento is a premium credit card benefits tracker. It should feel like a tool a financially sophisticated person trusts without thinking — calm, precise, and expensive-looking without trying too hard. The visual language sits closer to a private banking dashboard or a well-designed fintech product than a SaaS startup template. Every surface should feel intentional: clean backgrounds, strong typographic hierarchy, a restrained accent color, and borders that add structure without noise. There is no room for decorative clutter, random glow effects, or bento-box layouts. The app earns trust through precision and stillness, not animation and ornamentation.

---

## 2. Design Principles

**1. Calm over flashy.**
Motion, gradients, and decorative effects should be subtle and purposeful. Visual energy should come from hierarchy and typography, not from glowing blobs or heavy gradients.

**2. Precision over decoration.**
Every visual element should serve the user. If removing it does not hurt clarity, remove it. Decorative images, placeholder patterns, and gratuitous dividers have no place in Memento.

**3. One system over page-specific styling.**
No page should invent its own colors, spacing, or component variants. All visual decisions should trace back to shared tokens and shared primitives.

**4. Action clarity over visual novelty.**
The primary action on any screen should be immediately obvious. CTA hierarchy must be consistent across the app. Novelty that obscures action intent is a regression.

**5. Premium restraint over startup gimmicks.**
Rounded corners should be proportional, not pill-shaped everywhere. Surfaces should be dimensional through subtle borders and elevation, not through glow effects or heavy shadows. Less is more.

**6. Theme-ready by default.**
Every color decision must be expressed as a semantic token. No raw hex codes, no hardcoded `white/` opacities in components. Components must work in both dark and light mode without modification.

**7. Consistent density.**
Spacing should follow a predictable 4px grid. Padding, gap, and margin values should be chosen from a defined scale, not improvised per component.

---

## 3. Visual Rules

### Backgrounds
- The app background should be a single near-black or soft-white surface depending on mode, defined by the `--background` token.
- There must be no mix of dark blue and black backgrounds across different pages. One background value for the app shell, always.
- Gradient blobs, radial glow effects, and decorative background patterns must not appear in the authenticated app (home, wallet, settings). They are permitted on the landing page in very controlled, minimal form only.
- Page-level `background` inline style overrides are not allowed. All pages must inherit from the root token.

### Surfaces / Cards
- Surface hierarchy should use exactly three levels: base (app background), raised (cards, rows, panels), and overlay (modals, drawers, popovers).
- Surface colors must come from `--surface`, `--surface-raised`, and `--surface-overlay` tokens — not from hardcoded `bg-white/8` or `bg-[#101828]` classes.
- Rounded corners on surfaces: use `rounded-xl` (16px) for cards/panels, `rounded-lg` (12px) for rows and inline elements, `rounded-md` (8px) for small components. Do not use `rounded-3xl` or `rounded-full` for content containers.
- Avoid bento-box layouts — do not wrap unrelated content groupings in boxes for visual decoration. Boxes should only appear where there is genuine containment or interaction purpose.

### Borders
- Borders should define structure, not create decoration.
- Use the `--border` token for standard dividers and container edges. Use `--border-strong` for interactive focus states and prominent separators.
- Border opacity should follow the token system, not arbitrary `white/8`, `white/10`, `white/15` values.
- Avoid adding borders purely for visual richness. Empty space defines structure more reliably than borders do.

### Buttons
- There should be exactly three button variants: primary, secondary, and ghost.
- Primary: filled with the accent color, high contrast, used for the single most important action per screen.
- Secondary: subtle fill (surface-raised level), used for supporting actions.
- Ghost: no fill, border only or text only, used for low-priority actions or inline controls.
- No page or component should introduce a fourth button style. If a new visual need arises, extend the variant system, do not invent a one-off.
- Button sizes: a standard size for most use and a small size for dense contexts. No arbitrary padding per button.

### Typography
- Three fonts are loaded: Geist Sans (primary), Geist Mono (secondary), Inter (restricted use). Geist Sans is the default for all body and UI text. Geist Mono is for numeric data only. Inter should be phased out unless there is a specific product reason.
- Font sizes must come from the defined type scale: `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px), `text-3xl` (30px), `text-4xl` (36px). Arbitrary sizes like `text-[13.5px]`, `text-[17px]`, `text-[4.1rem]` must be eliminated.
- Heading hierarchy must be consistent across all pages: one size for page titles, one for section headers, one for row labels. These should be defined as shared classes or tokens, not set per page.
- Text color must come from semantic tokens: `--foreground` (primary), `--muted-foreground` (secondary/supporting), a dimmer muted level for tertiary/metadata.
- Avoid mixing `text-white`, `text-white/90`, `text-white/70`, `text-white/45`, etc. as independent visual choices. The opacity scale for text must be part of the token system.

### Spacing
- Use a 4px base grid. All spacing values should be multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Tailwind equivalents: `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-5` (20px), `gap-6` (24px).
- Within a component, choose one internal padding and apply it consistently. Do not mix `px-3` and `px-3.5` within the same component family.
- Container max-widths: standardize on one or two values for the app layout. No ad-hoc `max-w-4xl` vs `max-w-5xl` vs `max-w-6xl` per page.

### Icons
- Icons should be monochrome and pull color from the text token on their surface.
- Icon size should follow the same scale as text: 16px for inline, 20px for standard UI actions, 24px for navigation or prominent controls.
- Do not color icons with hardcoded hex values. Use the accent token only for deliberate highlighted states.

### Badges / Status Indicators
- Status badges should use the semantic token set: success, warning, destructive, and a neutral/default state.
- Badge styles should be consistent across the app. One badge component, not one per page.
- Urgency indicators (e.g., "expires this month") should use the warning or destructive token, not a custom color.

### Motion / Animation
- Motion should be functional: communicate state change, guide attention, confirm action. Not decorative.
- Transitions: `duration-150` for micro-interactions (hover, active), `duration-200` for layout shifts, `duration-300` max for entrance/exit animations.
- No infinite animations, pulsing glows, or ambient motion effects.
- Undo toast entry/exit: subtle vertical slide, no bouncy spring physics.

### Empty States
- Empty states should be minimal: a short label, a supporting sentence, and a single CTA if applicable.
- No decorative illustrations or mascot graphics.
- Typography should follow the standard type scale. Empty states are not an opportunity for visual creativity.

### Decorative Effects
- Gradient blobs are permitted only on the landing page, and only in highly restrained form (1–2 blobs max, low opacity, not animated).
- Gradient blobs must not appear in the authenticated app under any circumstances.
- Grid or dot background patterns are permitted on the landing page as a subtle texture only.
- Drop shadows should be minimal and follow a single elevation scale. No per-component custom shadow values.
- Glow effects (e.g., `box-shadow: 0 0 40px ...`) are not permitted anywhere in the product.

---

## 4. Light / Dark Mode Rules

### Relationship Between Modes
Light mode and dark mode are the same brand under different lighting. They share the same token names, the same spacing system, the same component shapes, and the same typographic hierarchy. They should not look like separate products.

### Dark Mode
- Background: near-black, not pure `#000000`. A slightly warm or neutral dark — `#0d0d11` range.
- Surfaces: subtle elevation above background using low-opacity white layers expressed as tokens, not raw `white/8` values.
- Borders: very subtle, just enough to define containment. Not decorative.
- Text: high contrast primary text, stepped muted levels. No harsh pure white.
- Accent: a calm, slightly desaturated blue-leaning color. Not neon, not saturated.
- Character: dimensional through restraint — barely-there borders, clean surfaces, no noise.

### Light Mode
- Background: warm white or soft neutral gray — not pure `#ffffff`. Something that feels like quality paper or a premium UI, not a generic web form.
- Surfaces: white elevated above background, using a very subtle shadow or border.
- Borders: light gray, used sparingly. Not every container needs a border.
- Text: charcoal, not black. Same hierarchy as dark mode, different values.
- Accent: same accent hue as dark mode, slightly darker/more saturated for contrast on light surfaces.
- Character: clean, warm, premium. Not generic blue-and-white SaaS.

### Implementation Rules
- **Never** use raw color classes in components: `bg-black`, `bg-slate-950`, `bg-[#0D0D11]`, `text-white`, `text-white/70`, `border-white/10`.
- **Always** use semantic token classes: `bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`.
- Components must not inline-override CSS variables (`style={{ '--background': '#xxx' }}`). All theme values must come from root-level token definitions.
- The `dark:` Tailwind prefix should be used in token definitions in `globals.css` only — not scattered in individual component class lists.

---

## 5. Color and Token Direction

The next builder work order should define this complete semantic token set in `app/globals.css`. Token names below are the canonical names to use throughout the codebase.

**Background system**
- `--background` — app-level page background
- `--surface` — primary raised surface (cards, panels, rows)
- `--surface-raised` — secondary elevation above surface (e.g., hovered row, selected card)
- `--surface-overlay` — floating elements (modals, drawers, popovers, tooltips)
- `--surface-muted` — de-emphasized or disabled surface areas

**Foreground / Text**
- `--foreground` — primary text on any surface
- `--muted-foreground` — secondary/supporting text
- `--subtle-foreground` — tertiary/metadata text (timestamps, labels, secondary values)

**Border**
- `--border` — standard container and row borders
- `--border-strong` — interactive element borders (inputs, focused states)

**Accent**
- `--accent` — primary brand accent (buttons, highlights, selected states)
- `--accent-foreground` — text color on accent-filled backgrounds

**Status**
- `--success` — positive states (claimed, complete, active)
- `--success-foreground` — text on success backgrounds
- `--warning` — expiring, attention-required states
- `--warning-foreground` — text on warning backgrounds
- `--destructive` — error, delete, danger states
- `--destructive-foreground` — text on destructive backgrounds

**Focus**
- `--focus-ring` — keyboard focus ring color, consistent across all interactive elements

**Overlay**
- `--scrim` — background scrim behind modals and drawers (semi-transparent overlay)

**Accent color note:** the codebase currently uses `#7FB6FF` and `#4A9EFF` interchangeably for blue accents, and `#F7C948` / `#C8A94B` interchangeably for gold. The next builder work order must decide on one canonical value for each and eliminate the variants. The gold accent (`#F7C948`) appears to be the Memento brand accent based on usage patterns. Confirm this and standardize.

---

## 6. Component Direction

### Buttons
- Three variants only: `primary`, `secondary`, `ghost`.
- Two sizes: `default` (standard UI), `sm` (dense/inline contexts).
- All color values from `--accent`, `--surface`, `--foreground` tokens.
- No per-page or per-feature button style overrides.

### Surfaces / Cards
- Use a single `<Surface>` component with a `variant` prop: `default` (standard raised), `muted` (de-emphasized), `overlay` (modal/drawer).
- No component should construct its own card-like container from raw `bg-white/8 border border-white/15` — use `<Surface>` instead.
- `<Surface>` must derive all colors from tokens.

### Rows
- Benefit rows, wallet rows, and settings rows should share a consistent row layout system: fixed height (or consistent min-height), consistent internal padding, consistent text hierarchy.
- Row typography constants in `row-typography.ts` should be converted to token-based classes, not `text-white/90` / `text-white/45` values.
- Row hover states must be consistent across all row types.

### Inputs
- One input style. Border from `--border-strong`, background from `--surface`, text from `--foreground`, placeholder from `--muted-foreground`.
- Focus state uses `--focus-ring`. No custom per-input focus styles.

### Tabs
- One tab style system. Active tab: accent underline or accent text. Inactive: muted foreground.
- No `bg-white/[0.07]` active and `bg-white/[0.015]` inactive — these are hardcoded hacks.
- Timeframe selectors and category filters should use the same tab component.

### Toggles
- Use the standard toggle/switch pattern. On state uses `--accent`. Off state uses `--surface-muted`.

### Badges
- Four semantic variants: `success`, `warning`, `destructive`, `default`.
- Badge sizes: `sm` and `default`.
- No per-page badge color customization.

### Toast
- Single toast component with `default`, `success`, `warning`, and `destructive` variants.
- Background from `--surface-overlay`, text from `--foreground`, borders from `--border`.
- Undo action in toast uses standard `ghost` button style.

### Modals / Drawers
- Background from `--surface-overlay` token. Not from a hardcoded `#0F1823` or `#101828` value.
- Scrim behind modal from `--scrim` token.
- Consistent header padding, consistent close button position, consistent internal spacing.

### Navigation
- App shell nav background inherits from `--background` or a dedicated `--nav-surface` token.
- Active nav item uses `--accent`. Inactive uses `--muted-foreground`.
- No per-page nav color overrides.

---

## 7. Page Group Direction

### App Shell + Home / Dashboard
This is the anchor surface for the entire authenticated experience. Get this right first and all other pages have a reference to match.

- App background: single flat color from `--background`. No gradient, no texture.
- Hero metrics section: clean typographic hierarchy. Large number, small label. No decorative box around it.
- Tabs and timeframe controls: one shared tab component. Consistent with each other.
- Benefit rows: consistent padding, consistent text hierarchy, consistent hover state. The row is the core UI unit — it must be pixel-perfect.
- Urgency badges: use the `warning`/`destructive` semantic badge variants.
- Undo toast: uses the standard toast component.
- Empty/all-caught-up state: minimal — short label, short supporting copy, one CTA.

### Wallet + Benefits + Settings
These pages should feel like the same product as Home. They inherit the same row system, the same surface system, the same tab system.

- Wallet rows: same system as benefit rows. No custom marker color per issuer hardcoded as Tailwind named colors (`slate-300`, `amber-300`). Card colors should come from a structured card palette.
- Benefits drawers: consistent with modal system.
- Settings surfaces: simple section groups. No decorative section borders or backgrounds. Just clear headings and rows.
- Empty states: consistent with home.

### Onboarding
Onboarding can feel slightly warmer and more guided than the core app, but it must use the same visual system — same background, same typography, same buttons.

- Remove gradient blob code duplicated from landing. If blobs are present, use a single shared `<GradientBlob>` component — but consider removing them entirely from onboarding and reserving them only for landing.
- No inline CSS variable overrides. Onboarding pages must inherit root tokens.
- Card selection, benefit confirmation, and success screens should feel calm and trustworthy, not flashy.
- Progress indicators: simple and minimal.

### Landing + Auth
Landing is the most expressive surface and can use slightly more visual ornamentation than the app, but it must still feel like Memento — not a generic startup template.

- Landing background: same `--background` token as the app. No separate landing-only dark background.
- Gradient blobs: maximum 2, low opacity, non-animated, positioned intentionally. Not copy-pasted noise.
- "How It Works" steps: colors must come from the token system, not from inline `step.accent` and `step.numberColor` computed styles.
- CTA button: standard primary button. No custom shadow or glow.
- Auth pages: minimal. Background token, standard card surface, standard form inputs, standard button.

---

## 8. Explicit Anti-Patterns

The following patterns must not appear in any new or refactored code.

**Color and theming**
- `bg-black`, `bg-slate-950`, `bg-[#0D0D11]`, `bg-[#0B1220]`, `bg-[#101828]`, `bg-[#0F1823]` or any other hardcoded dark background
- `text-white`, `text-white/90`, `text-white/70`, `text-white/45`, `text-white/40`, `text-white/42` — hardcoded white opacity text
- `border-white/8`, `border-white/10`, `border-white/15` — hardcoded white opacity borders
- `bg-[#7FB6FF]`, `bg-[#4A9EFF]`, `bg-[#F7C948]`, `bg-[#C8A94B]` — hardcoded accent hex values
- `bg-[#86EFAC]`, `bg-[#B04646]` — hardcoded status colors
- Multiple competing accent colors — one canonical accent, always
- `style={{ '--background': '#xxx' }}` inline CSS variable overrides in JSX

**Decoration**
- Random glowing blobs in the authenticated app
- Radial gradient decorations in the authenticated app
- Grid or dot background textures in the authenticated app
- `box-shadow: 0 0 40px` glow effects anywhere
- Decorative images that do not serve a direct user need
- Infinite or ambient animations

**Layout**
- Bubbly bento boxes around content groupings that do not need containment
- `rounded-3xl` or `rounded-full` on content containers
- Over-rounded pill containers used as generic surfaces
- Multiple competing card/surface visual styles on the same page

**Typography**
- Arbitrary font sizes: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[13.5px]`, `text-[17px]`, `text-[4.1rem]`
- Arbitrary `fontFamily` inline styles — use Tailwind font utilities
- Page-specific heading size choices — use the shared heading scale

**Process**
- Redesigning a page before the token foundation (WO2) is complete
- Redesigning components before UI primitives (WO4) are refactored
- Replacing old hardcoded styles with new hardcoded styles
- Inventing a new button variant, card style, or badge variant outside the shared system
- Page-specific color systems that do not reference shared tokens

---

## 9. Next Work Orders

The following six work orders should follow this one, in sequence. Each depends on the previous.

---

### WO2: Build Theme Token Foundation

**Agent:** Builder
**Depends on:** This document (WO1)
**Output:** Updated `app/globals.css` with a complete semantic CSS variable set for both light and dark mode.

Define all tokens listed in Section 5 of this document. For each token:
- Set the light mode value under `:root`
- Set the dark mode value under `@media (prefers-color-scheme: dark)` (or a `.dark` class override — decide approach)
- Confirm exact color values for `--accent` (gold or blue, whichever is canonical) and `--background`

Do not touch any component files. Do not touch Tailwind config. CSS only.

---

### WO3: Map Tokens Into Tailwind v4 Utilities

**Agent:** Builder
**Depends on:** WO2
**Output:** The `@theme` block in `app/globals.css` updated so all semantic tokens are accessible as Tailwind utility classes.

Because the project uses Tailwind v4 CSS-first setup, do NOT create a `tailwind.config.ts` with `theme.extend.colors` unless there is a clear technical reason. Instead, extend the existing `@theme inline` block to map each CSS variable to a Tailwind color utility.

After this work order, it should be possible to write `bg-background`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-accent`, `text-accent-foreground`, etc. as Tailwind classes.

Verify the Tailwind mappings work by checking that the classes resolve correctly in the build. No component changes yet.

---

### WO4: Refactor Shared UI Primitives

**Agent:** Builder
**Depends on:** WO3
**Output:** All components in `components/ui/` updated to use semantic token classes. A new `<GradientBlob>` component extracted from duplicated landing/onboarding code.

Scope:
- `Button.tsx`: three variants, two sizes, token-based colors only
- `Surface.tsx`: three variants (default, muted, overlay), token-based
- `Checkbox.tsx`, `Popover.tsx`, `DatePicker.tsx`, `UndoToast.tsx`, `AppShell.tsx`: token-based colors, no hex
- `row-typography.ts`: convert `text-white/90` etc. to token-based classes
- Extract `GradientBlob.tsx` from `PublicLandingPage.tsx` and onboarding pages (or delete entirely from onboarding if removing blobs from that context is the right call per the visual direction)

No page-level redesign. Only `components/ui/` and the new extracted component.

---

### WO5: Overhaul App Shell + Home / Dashboard

**Agent:** Builder
**Depends on:** WO4
**Output:** The authenticated app shell and home/dashboard page refactored to use the token system and updated visual direction.

Use Home as the visual reference anchor for the entire authenticated app. After this work order, the home page should feel premium, calm, and consistent — and serve as the design reference for WO6.

Scope: app shell/nav, home background, hero metrics, tabs, timeframe controls, benefit rows, urgency badges, undo toast, empty state.

---

### WO6: Overhaul Wallet + Benefits + Settings

**Agent:** Builder
**Depends on:** WO5
**Output:** Wallet, benefits, and settings pages brought into the same visual system as Home.

Match Home's row system, surface system, and tab system. Standardize overlays, drawers, empty states, and section headers. Remove any card marker colors that are not part of the token system.

---

### WO7: Overhaul Landing + Auth + Onboarding

**Agent:** Builder (UX review optional)
**Depends on:** WO6
**Output:** Landing page, auth pages, and onboarding flow refactored to use the token system and align with the authenticated app's visual language.

Remove duplicated gradient blob code from onboarding. Remove inline CSS variable overrides. Bring heading typography and button styles in line with the shared system. Landing may retain minimal decorative ornamentation but must use the same token system as the rest of the product.
