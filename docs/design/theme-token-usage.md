# Memento Theme Token Usage Guide

**Audience:** Builder agents working on Memento UI  
**Status:** Active — follows WO3 verification  
**Source of truth:** `docs/design/memento-visual-direction.md`  
**Token definitions:** `app/globals.css`

---

## 1. Purpose

All UI work in Memento must use **semantic theme tokens** instead of hardcoded colors.

The token system is defined as CSS custom properties in `app/globals.css` and exposed as Tailwind utility classes via the `@theme inline` block. Every token has both a light-mode and a dark-mode value — components automatically respond to the user's system preference without any per-component `dark:` class logic.

**Do not** use raw hex values, Tailwind named colors (`slate-950`, `blue-400`), or white/black opacity hacks (`white/10`, `text-white/70`) in components or pages. Use the semantic classes below.

---

## 2. Approved Utility Classes

All classes below are verified to compile via Tailwind v4.

### Core
| Class | Use for |
|---|---|
| `bg-background` | Page/screen background |
| `text-foreground` | Primary body and UI text |

### Surfaces
| Class | Use for |
|---|---|
| `bg-surface` | Standard cards, panels, rows |
| `bg-surface-raised` | Elevated panels, hovered rows, selected states |
| `bg-surface-muted` | De-emphasized sections, disabled areas |
| `bg-surface-subtle` | Barely-there background variation |

### Borders
| Class | Use for |
|---|---|
| `border-border` | Standard container and row borders |
| `border-border-strong` | Input borders, focus outlines, prominent separators |
| `border-border-muted` | Very subtle structural dividers |

### Text
| Class | Use for |
|---|---|
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary/supporting text, labels |
| `text-subtle-foreground` | Tertiary/metadata, timestamps, helper copy |
| `text-inverse-foreground` | Text on accent-filled or inverted backgrounds |

### Accent
| Class | Use for |
|---|---|
| `bg-accent` | Primary CTA fill, selected/active state fill |
| `text-accent` | Inline accent text, highlighted values |
| `text-accent-foreground` | Text on accent-colored backgrounds |
| `bg-accent-muted` | Subtle accent-tinted surface (e.g. selected row bg) |
| `border-accent-border` | Accent-colored borders on interactive elements |

### Status
| Class | Use for |
|---|---|
| `text-success` | Confirmed, claimed, complete states |
| `bg-success-muted` | Success badge/chip background |
| `text-warning` | Expiring soon, attention-required states |
| `bg-warning-muted` | Warning badge/chip background |
| `text-destructive` | Errors, delete actions, danger states |
| `bg-destructive-muted` | Error/destructive badge background |

### Interaction
| Class | Use for |
|---|---|
| `ring-focus` | Keyboard focus ring on all interactive elements |
| `bg-hover` | Hover state overlay on rows, buttons, tappable areas |
| `bg-active` | Pressed/active state overlay |

### Overlays
| Class | Use for |
|---|---|
| `bg-overlay` | Modal and drawer background surface |
| `bg-scrim` | Page scrim behind open modals/drawers |

---

## 3. Usage Guidance

**Page backgrounds:** Always `bg-background`. Never a hardcoded dark or light color.

**Cards and panels:** Use `bg-surface` as the default. Use `bg-surface-raised` for things that need to float visually above the surface (e.g. a selected card, an open drawer). Use `bg-surface-muted` for quieter/secondary areas.

**Borders:** Start with `border-border`. Only use `border-border-strong` when the border needs to be clearly visible (form inputs, focused containers). Use `border-border-muted` for barely-there structure.

**Text hierarchy:** Use `text-foreground` for everything the user reads as primary content. Use `text-muted-foreground` for supporting information. Use `text-subtle-foreground` for the quietest tier — timestamps, helper labels, metadata.

**Accent usage:** The accent color is Memento's brand gold. Use it sparingly and intentionally — for the primary CTA, selected states, and meaningful highlights. Do not use accent as generic decoration or section dividers.

**Status tokens:** Only use status colors for genuine semantic meaning. `warning` = something expiring or requiring attention. `success` = positive/confirmed state. `destructive` = error, danger, or irreversible action. Never use them decoratively.

**Focus rings:** Every interactive element that receives keyboard focus must use `ring-focus`. No custom focus colors.

**Hover and active states:** Apply `bg-hover` as an overlay on tappable rows and interactive surfaces. Apply `bg-active` for the pressed moment. These are low-opacity overlays that work on any background.

**Modals and drawers:** Use `bg-overlay` for the floating surface itself. Use `bg-scrim` behind it to dim the page.

---

## 4. Anti-Patterns

The following must **not** appear in any new or refactored component or page code:

**Hardcoded colors**
- `bg-black`, `bg-white`, `bg-slate-950`, `bg-gray-900`, `bg-zinc-950`
- `bg-[#0D0D11]`, `bg-[#0B1220]`, `bg-[#101828]`, `bg-[#F7C948]`, `bg-[#7FB6FF]` or any other hex
- `text-white`, `text-white/90`, `text-white/70`, `text-white/45`
- `border-white/8`, `border-white/10`, `border-white/15`

**Competing accent systems**
- Do not introduce new blue, gold, or green values outside the token system
- Do not use Tailwind's named colors (`amber-400`, `blue-500`, `emerald-300`) for UI states — use status tokens

**Page-specific color systems**
- Do not define per-page CSS variables or per-page color overrides
- Do not use `style={{ '--background': '#...' }}` inline overrides in JSX

**Dark-only hardcoding**
- Do not write dark-only styles assuming the background is always dark
- All semantic tokens work in both modes automatically

**Premature Tailwind config**
- Do not create `tailwind.config.ts` just to add colors — extend `@theme inline` in `globals.css`

**Non-semantic decorative status colors**
- Do not apply `text-success` or `bg-warning-muted` for visual variety — only for real state meaning

---

## 5. Light / Dark Mode

All semantic token utilities are **theme-backed**. They resolve to light-mode values by default and switch to dark-mode values automatically via `@media (prefers-color-scheme: dark)`.

Components using these tokens require **no `dark:` class prefixes** — the token values handle both modes.

**What this means for future work:**
- When refactoring a component from hardcoded `text-white` to `text-foreground`, it immediately works in both light and dark mode
- When building new components using only the approved classes above, they are light/dark-ready out of the box
- The `dark:` prefix should not appear in component class lists — it belongs only in token definitions in `globals.css`

**Current state:** Dark mode is live via media query. Light mode values are defined and structurally correct. A theme toggle (class-based switching) is a future work order and does not affect this token system.
