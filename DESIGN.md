# Ledger - Design System Specification
**Project:** Minimalist PWA Finance Tracker  
**Design Version:** 1.0.0 (Fidelity / Pro Mobile PWA)  
**Aesthetic Anchor:** Modern Technical Minimalism with subtle tonal layering, glass-accented chrome, and high-legibility tabular telemetry.

---

## 1. Brand & Style Principles

This design system embodies a calm, precise, and understated approach to personal wealth management. Built specifically as a high-performance mobile Progressive Web Application (PWA), the aesthetic merges modern technical minimalism with deliberate tactile feedback. It avoids the cluttered, spreadsheet-heavy anxiety typical of legacy banking apps, instead projecting quiet confidence, clarity, and control.

### Aesthetic Anchor
- **Style Archetype:** Modern Technical Minimalism with tonal layering and glass-accented chrome.
- **Atmosphere:** Deep, slate-infused surfaces, surgical typographic alignment, and high-legibility tabular telemetry.
- **Touch & Ergonomics:** Bottom-biased interactive zones, 48px minimum touch targets, subtle micro-haptics, and frictionless gestures designed for one-handed mobile utility.

---

## 2. Color Palette & Semantic Roles

The palette is engineered around high semantic differentiation against dark slate surfaces. It defaults to dark mode to minimize OLED battery drain, reduce eye fatigue, and elevate data visualization contrast.

### Core Swatches

| Token | Hex Value | Semantic Role & Usage |
| :--- | :--- | :--- |
| `primary` / `primary-container` | `#10b981` / `#4edea3` | Emerald Mint — Positive cash flows, investment yields, active savings, confirm CTA |
| `secondary` / `secondary-container` | `#f43f5e` / `#ffb2b7` / `#b50036` | Coral Rose — Expenditures, debts, budget deficit warnings, destructive actions |
| `tertiary` / `tertiary-container` | `#0ea5e9` / `#89ceff` / `#23acf1` | Sky Blue — Informational callouts, neutral category badges, trend lines, transfers |
| `background` / `surface` | `#0b1326` | Deep Obsidian Slate canvas (ground floor) |
| `surface-container-lowest` | `#060e20` | Recessed meter troughs, inset track grooves |
| `surface-container-low` | `#131b2e` | Base nested containers, month selectors, keypad background |
| `surface-container` | `#171f33` | Standard interactive cards and list rows |
| `surface-container-high` | `#222a3d` | Elevated cards, hero overview container, active chips |
| `surface-container-highest` | `#2d3449` | Search bars, elevated dialogs, floating sheet panels |
| `surface-bright` | `#31394d` | Hover states, micro-highlights, divider borders |
| `on-surface` | `#dae2fd` | High-contrast primary text and active numerical metrics |
| `on-surface-variant` | `#bbcabf` | Secondary labels, descriptions, subheadings |
| `outline` | `#86948a` | Subdued borders, metadata dividers |
| `outline-variant` | `#3c4a42` | Hairline separators, subtle card borders |

### Semantic Numbers & Rules
- **Numerical Values:** Positive values require emerald mint (`#10b981`), negative expenditures require coral rose (`#f43f5e`), and internal transfers remain neutral (`#dae2fd`).
- **Category Chips:** Low-opacity tinted chips (e.g. 12% opacity tint of category hue over dark neutral surface) with full-opacity foreground text.

---

## 3. Typography Hierarchy

The typographic system couples **Geist** for crisp structural UI clarity with **JetBrains Mono** for numerical values and technical metadata.

| Typography Token | Font Family | Size | Weight | Line Height | Tracking | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | Geist | `40px` | `600` | `48px` | `-0.03em` | Massive hero numbers, modal summary |
| `headline-lg` | Geist | `32px` | `600` | `40px` | `-0.025em` | Desktop/tablet page headers |
| `headline-lg-mobile` | Geist | `26px` | `600` | `32px` | `-0.02em` | Main section headings |
| `headline-md` | Geist | `22px` | `600` | `28px` | `-0.015em` | Greeting & sheet title |
| `headline-sm` | Geist | `18px` | `600` | `24px` | `-0.01em` | Card titles, group dates |
| `body-lg` | Geist | `16px` | `400` / `500` | `24px` | `-0.005em` | Primary list item titles, CTA buttons |
| `body-md` | Geist | `14px` | `400` | `20px` | `0em` | Standard text, inputs, form labels |
| `body-sm` | Geist | `12px` | `400` | `16px` | `0.005em` | Subtitles, helper text |
| `data-metric-lg` | JetBrains Mono | `28px` | `500` / `600` | `34px` | `-0.02em` | Remaining budget, amount input |
| `data-metric-md` | JetBrains Mono | `18px` | `500` / `600` | `24px` | `-0.01em` | Total spent/income stats |
| `data-metric-sm` | JetBrains Mono | `14px` | `500` | `18px` | `0em` | Transaction row amounts |
| `label-caps` | JetBrains Mono | `11px` | `600` | `14px` | `0.06em` | Uppercase badges, filters, tags |

### Typographic Rules
- **Tabular Numerics:** All monetary values, balances, timestamps, and percentages strictly enable `font-variant-numeric: tabular-nums lining-nums;` to eliminate horizontal jitter during live counter animations or value comparisons.
- **Monospace Discipline:** Reserve `JetBrains Mono` strictly for metrics, transaction values, and technical tokens.

---

## 4. Layout, Spacing & Safe Areas

- **Base Rhythm:** Built strictly on an 8px grid system (sub-divided to 4px for tight interior pairings and micro-chips).
- **Responsive Bounds:** Mobile container centers into a focused canvas `max-width: 440px` on desktop and tablet, preserving single-handed thumb ergonomics.
- **Safe Area Insets:** The layout respects mobile browser and PWA chrome via `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- **Bottom Navigation Bar:** Fixed `64px` height + `env(safe-area-inset-bottom)` with 16px clearance above mobile home indicator.

### Spacing Tokens
- `space-2xs`: `0.125rem` (2px)
- `space-xs`: `0.25rem` (4px)
- `space-sm`: `0.5rem` (8px)
- `space-md`: `0.75rem` (12px)
- `space-base`: `1rem` (16px)
- `space-lg`: `1.25rem` (20px)
- `space-xl`: `1.5rem` (24px)
- `space-2xl`: `2rem` (32px)
- `space-3xl`: `3rem` (48px)
- `gutter`: `1rem` (16px)

---

## 5. Elevation & Depth Architecture

1. **Canvas (Ground Floor):** `#0b1326` with zero shadow.
2. **Level 1 (Card Surfaces):** `#171f33` or `#131b2e` overlaid with a 1px ghost border (`rgba(255, 255, 255, 0.07)`).
3. **Level 2 (Interactive Floating Items & Action Sheets):** `#222a3d` / `#2d3449` surrounded by ambient shadow (`0 10px 25px -5px rgba(0, 0, 0, 0.5)`) plus subtle top edge highlight (`inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`).
4. **Level 3 (Sticky Chrome & Navigation):** `rgba(11, 19, 38, 0.85)` with `backdrop-filter: blur(16px)` and 1px border separator (`rgba(255, 255, 255, 0.08)`).

---

## 6. Shapes & Corner Radii

- **Default (inputs, list rows, badges):** `0.5rem` (8px) / `0.75rem` (12px).
- **Cards, summary panels, sheets:** `1rem` (16px).
- **Action buttons, navigation pills, chips:** Fully rounded pill structures (`9999px`).
- **Tactile feedback:** Active scale down to `0.98` or `0.95` on interactive elements.

---

## 7. Core Screen Views & Interaction Flow

1. **Overview (Budget & Categories):**
   - Brand header with synced status indicator and theme toggle.
   - Monthly salary period switcher.
   - Hero Remaining Budget card featuring animated circular SVG progress ring and dual-tier linear meter.
   - Quick stats metric matrix (Total Spent vs Total Income).
   - Accordion category budgets with nested sub-category spending progress bars.

2. **Add Transaction:**
   - Segmented Expense vs Income selector switch.
   - Prominent tactile currency display with blinking emerald caret.
   - Category grid selector with quick icon badges.
   - Spending channel selector chips (QRIS, EDC Offline, E-Commerce, Auto-Debit).
   - Bank/account selector, Merchant name, and Note inputs.
   - Integrated custom tactile numeric keypad (`0-9`, `.`, `backspace`).
   - High-contrast emerald Save button with animated tactile confirmation.

3. **Records (Transaction History):**
   - Instant search bar with clear button.
   - CSV export action.
   - Filter pills carousel (All, Expenses, Income, Salary, Categories).
   - Monthly cadence net cashflow bar.
   - Grouped transaction feed (Today, Yesterday, Oct 21) with settlement status badges.
   - Interactive slide-up detail modal sheet with full receipt breakdown.
