# networth-tracker — Project Memory

## Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **State**: Zustand with `persist` middleware (localStorage)
- **Routing**: React Router v6

## Key stores
| Store | localStorage key | Purpose |
|---|---|---|
| `settingsStore` | `nw-settings` | App settings, API keys, exchange rates table |
| `transactionStore` | `nw-transactions` | One-off income/expense transactions |
| `recurringStore` | `nw-recurring` | Recurring payments & installment plans |
| `portfolioStore` | `nw-portfolio` | Stock trades & current holdings |

## Exchange rate policy

**Rule: rates are applied at entry time only. Historical converted amounts are immutable.**

- `Transaction.convertedAmount` is set once when the transaction is created, using the rate available at that moment. It is never updated afterwards.
- `RecurringPayment` has **no** `convertedAmount` field — it stores only `amount` + `currency`. Conversion happens when the recurring payment generates a `Transaction`; the resulting `Transaction.convertedAmount` is then permanently fixed.
- **Refresh All** (Settings → Currency) only updates the global `exchangeRates` table in `settingsStore`. It does **not** touch any stored `convertedAmount` on existing transactions or recurring payments.
- `recalculateRatesForCurrency` was removed in commit `c0ae4bc` because it retroactively overwrote historical `convertedAmount` values on every rate refresh — violating the above rule.

## FX provider
`settingsStore.fxProvider` controls which service is used:

| Value | Provider | Auth | Notes |
|---|---|---|---|
| `'boi'` | **Frankfurter** (`api.frankfurter.app`) | None (free) | ECB-backed, CORS-enabled, ~33 currencies. Service file: `frankfurterApi.ts` |
| `'alpha-vantage'` | Alpha Vantage | `fxApiKey` | 25 req/day free tier |
| `'massive'` | Massive/Polygon | `fxApiKey` | No daily cap |

The Bank of Israel's own APIs (`boi.org.il`, `edge.boi.org.il`) were tested and confirmed to lack CORS headers — they cannot be called from the browser. Frankfurter is the correct free alternative.

**Frankfurter rate formula**: `GET /latest?from=<baseCurrency>` → `data.rates[X]` = "how many X per 1 baseCurrency" → `rateToDefault = 1 / data.rates[currency]`

## Portfolio price policy

**Rule: prices are stored in native currency. Conversion to `defaultCurrency` happens at display time only.**

Two separate price concepts exist:

| Field | Location | Set by | Currency | Ever overwritten by API? |
|---|---|---|---|---|
| `buyPrice` / `sellPrice` | `StockTrade` (persisted) | User entry only (`handleSaveTrade`) | Native (e.g. USD, ILS) | ❌ Never |
| `buyRateToDefault` | `StockTrade` (persisted) | Captured once in `handleSaveTrade` at trade entry time | — | ❌ Never — this is the historic rate used for cost basis |
| `currentPrices[ticker]` | `portfolioStore` (persisted) | "Refresh Prices" or Excel import | Native currency | ✅ Yes, intentional |

- `StockTrade.currency` (required) — the native price currency, e.g. `'USD'` for global stocks, `'ILS'` for TASE.
- **portfolioStore v1 migration** — existing trades without `currency` get it inferred: `market === 'tase'` → `'ILS'`, else `'USD'`.
- **Excel import** seeds `currentPrices[ticker]` from col C (Last Rate) so gain is visible immediately without a manual refresh.
- **Refresh Prices** calls `updateCurrentPrice(ticker, price)` → modifies only `currentPrices` + `lastPriceUpdates`. Never touches `StockTrade` fields.
- `CurrentHolding` is **not stored** — computed on-demand by `calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates)`.
  - `blendedCostBasis` and `currentPrice` → native currency
  - `currentValue` → `defaultCurrency` using the **live** `rateToDefault` (what the portfolio is worth now)
  - `costBasisTotal` → `defaultCurrency` using **`buyRateToDefault` per buy lot** (what you paid, at the rate when you bought) — legacy trades without this field fall back to current rate
  - `unrealizedGain` = `currentValue − costBasisTotal` → includes both price movement and FX movement
  - `unrealizedGainPercent` → % based on native prices only (currency-neutral, no FX effect)
  - When `currentPrices[ticker]` is absent, `currentPrice` falls back to `blendedCostBasis` (0% gain).

### API keys & which holdings they cover
| API key | Provider | Holdings covered |
|---|---|---|
| `stocksApiKey` | Alpha Vantage | `market === 'global'` holdings |
| `israeliApiKey` | TASE DataHub | `market === 'tase'` holdings |

"Refresh Prices" is enabled if the user has either key with relevant holdings (not gated on `stocksApiKey` alone).

## Broker Excel import

`src/services/excelImport.ts` — `parsePortfolioExcel(file, existingTrades, defaultCurrency, exchangeRates)`

Parses a broker `.xlsx` snapshot (one row = one open position) into `ImportRow[]` objects ready for preview and import. Key normalisation rules:

1. **Agorot → ILS**: TASE stocks quote Last rate and Average cost in agorot (1/100 ₪). Divide by 100. Total value / P&L are already in ILS — do **not** divide.
2. **Currency conversion**: Foreign-currency average cost is multiplied by `ExchangeRate.rateToDefault` to convert to the user's `defaultCurrency`. If no rate is stored, `noRateAvailable = true` (shown in orange in the preview).
3. **Numeric symbols**: Israeli TASE stocks use numeric security IDs as their Symbol (e.g. `"1159235"`). When Symbol is purely numeric, the **Name** column is used as the ticker instead.
4. **Market detection**: `currency === 'ILS'` → `market = 'tase'`, else `market = 'global'`.

### Column mapping
| Col | Header | Stored? | Notes |
|-----|--------|---------|-------|
| A | Name | ✅ `StockTrade.name` (also ticker if Symbol is numeric) | |
| B | Symbol | ✅ `StockTrade.ticker` | Falls back to Name when purely numeric |
| C | Last rate | ❌ preview only | |
| J | Quantity | ✅ `StockTrade.quantity` | |
| L | Average cost | ✅ `StockTrade.buyPrice` | Normalised (agorot→ILS) + converted to defaultCurrency |
| N | Currency | ✅ `StockTrade.market` | ILS→tase, else→global |

### Entry points
- **Portfolio page**: `📥 Import Excel` button → `ExcelImportModal.tsx` (preview modal)
- **Setup wizard step 5**: `Step5ExcelImport.tsx` (inline, no modal) — shown for Detailed mode only; skipped for Simple mode

## Setup wizard

`src/pages/Setup/index.tsx` — 8-step linear wizard

```
1 Name → 2 Privacy → 3 Currency → 4 Portfolio → [5 Import Holdings] → 6 Cards → 7 FIRE → 8 Done
```

- Step 5 is **automatically skipped** when `portfolioMode === 'simple'` (skip in `handleNext` at step 4; skip-back in `handleBack` at step 6).
- Step 8 Done screen shows a summary including holdings imported count (from `portfolioStore.trades`).

## Workflow rules
- **Auto-push**: Unless told otherwise, always push after executing the user's orders.
- **Preview viewport**: Always use the desktop/PC version (1920×1080) for previews by default, unless told otherwise.

## File map (key files)
```
src/
  services/
    frankfurterApi.ts       — Frankfurter FX fetching (fetchFrankfurterRates, fetchFrankfurterRate)
    alphaVantageApi.ts      — Alpha Vantage FX fetching
    massiveApi.ts           — Massive/Polygon FX fetching
    excelImport.ts          — Broker .xlsx parsing → ImportRow[]
  stores/
    settingsStore.ts        — Settings, exchange rates table, API key tracking
    transactionStore.ts     — Transactions (no recalculation functions)
    recurringStore.ts       — Recurring payments & installment plans (CRUD only)
    portfolioStore.ts       — Stock trades + currentPrices lookup (separate from buyPrice)
  pages/
    Settings/index.tsx      — All settings UI including FX provider config & Refresh All
    Portfolio/
      index.tsx             — Portfolio page with Import Excel button
      ExcelImportModal.tsx  — Standalone Excel import modal (post-setup)
    Setup/
      index.tsx             — 8-step wizard orchestrator with skip logic
      Step5ExcelImport.tsx  — Inline Excel import step (setup wizard only)
  types/index.ts            — All TypeScript interfaces (Transaction, RecurringPayment, etc.)
```

## Design system — Figma file

**File:** `WMI3ZpbuD4zvKIe4yqFA5A` — "William — Design System v1"

**App name: William** (the dot-matrix logotype reads "WILLIAM" — stylized W, not "SQ"). Balzhima will redesign the logo later.

### Pages
| Page | ID | Contents |
|---|---|---|
| Foundations | 6:2 | Type scale, spacing, radius, color swatches |
| Button | 11:2 | Button component set (3 styles × 3 states = 9 variants) + **Action Button** set (197:60) |
| Card | 13:2 | Card component (Default + Hover) |
| Badge | 14:3 | Badge component set (Positive/Negative/Neutral/Accent) |
| Screens/Dashboard | 15:2 | Dashboard v2 Desktop (22:3, 1440×1140) + Mobile (26:3, 375×1622) |
| Chip & Layering | 30:2 | Chip component (Neutral/Outline/Inverse) |
| Icons | 92:2 | All icon components (see below) |
| States | — | Skeleton / EmptyState / Alert / ChartTooltip / loading + edge-case reference |
| Documentation | — | **Visual component reference** — `Dashboard Components — Light` + `Dashboard Components — Dark` boards (dark = clone with Color collection mode set to Dark). Every component + all states + the screen Patterns (activity row, insight callout, breakdown bar). Each master also carries a Dev-Mode `description`. |
| Archive | 150:1750 | Old/reference frames |

### Icon components (Icons page, 92:2)
Pixel dot-matrix style. Master size 64×64. DOT=6, GAP=2, UNIT=8.  
**Rule: always use `rescale(targetSize/64)` to size instances — never `resize(w,h)`.**

| Component | ID (64px) | ID (24px) | Purpose |
|---|---|---|---|
| Icon/Home | 92:3 | — | Nav |
| Icon/Portfolio | 92:25 | — | Nav |
| Icon/Spending | 92:45 | — | Nav |
| Icon/Fire | 92:77 | — | Nav |
| Icon/Account | 92:103 | — | Nav |
| Icon/Trade | 118:1274 | 118:1275 | Action button |
| Icon/Income | 118:1330 | 118:1368 | Action button |
| Icon/Expense | 118:1331 | 118:1369 | Action button |
| Icon/Star | 215:2217 | — | Misc |
| Icon/Refresh | 387:1065 | — | Portfolio "Refresh prices" (circular arrow) |
| Icon/Import | 387:1076 | — | Portfolio "Import" (download → tray) |
| Icon/Target | 429:1084 | — | "Set/Edit targets" (ring + bullseye) |
| Icon/Plus | 429:1098 | — | "Add trade" / add actions |

**Icon button rule (Portfolio toolbar):** every toolbar/action button leads with a dot-matrix icon + label (Refresh / Import / Add trade / Set targets). Icons sized via `rescale(16/64)` (≈16px) inside buttons. The Refresh glyph alone (circular-arrow/spinner ring) tested as not legible enough, so it keeps the "Refresh" **text label** — do not make it icon-only.

### Action Button component (Button page, set 197:60)
Dashboard action buttons (Trade/Income/Expense). Variant property `Action`.
- Structure: VERTICAL auto-layout wrapper (8px gap, center) → 54px circle (`cornerRadius 999`, fill bound to `color/accent`) containing a 34px icon instance → 13px Inter Medium label bound to `color/text-secondary`.
- Variants: `Action=Trade` (197:2), `Action=Income` (197:22), `Action=Expense` (197:41).
- Both Dashboard screens (desktop 22:3, mobile 26:3) use instances of this set — no more inline button frames. Mobile was unified from 50px → 54px circles.

### Variable collections
| Collection | ID | Modes | Vars |
|---|---|---|---|
| Primitives | VariableCollectionId:1:2 | Value | 33 |
| Color | VariableCollectionId:2:2 | Light / Dark | 19 |
| Spacing | VariableCollectionId:3:2 | Value | 8 |
| Radius | VariableCollectionId:3:11 | Value | 4 |

### Color palette + visual direction (Superpower-inspired, since 2026-06)

Reference: **superpower.com**. Adapted aesthetic = **cool neutral greys + white · no shadows · hairline borders · frosted-glass floating surfaces · color ONLY on money direction**.

> **History note:** a warm-paper/cream neutral ramp was trialled (2026-06) but **reverted**. The final, intended palette is **cool grey + white** (Tailwind-style neutral scale). Do not reintroduce warm/cream neutrals.

**Core color concept (decided 2026-06, final):** *Chromatic color appears only on money movement — lime = up, orange = down. Everything else is monochrome.*
- **Accent is NEUTRAL, not orange.** `color/accent` → `neutral/900` (Light) / `neutral/0` (Dark). The data line, action-button circles, FIRE bar, and active nav are black-in-light / white-in-dark. Do **not** make the accent orange.
- **Orange #FF6A0D = `color/negative` only.** Every negative monetary value (e.g. −$3,140, −$25) and the expense feed use orange. Reserved exclusively for loss/spend — never for accent, nav, or focus.
- **Lime = `color/positive`.** Every positive value (+$1,268, +25.20%, +2.4%) uses lime.
- **Known tradeoff (accepted):** orange `#FF6A0D` as *text* on light surfaces is ~2.8:1 (fails WCAG AA). Balzhima accepted this risk for the identity. Do not "fix" it by darkening unless asked.

**Base:** cool neutral greys + white (Tailwind-style neutral scale)  
**Primary action:** **mid-grey** — `color/surface-inverse` → `neutral/400` (#a3a3a3). This is **intentional** (Balzhima's call, 2026-06): primary buttons and action-button circles render mid-grey, not near-black. Do not "fix" to neutral/900.  
**Positive:** lime (#D6F377 bg) · **Negative:** orange #FF6A0D  
Violet was considered and rejected. Do not reintroduce it. Primitives were renamed: `green/*`→`lime/*`, `amber/*`→`orange/*`.

**Cool neutral ramp** (current, intended):
| Token | Hex | Used for |
|---|---|---|
| `neutral/0` | #ffffff | white — page bg + card surface |
| `neutral/50` | #fafafa | subtle raised |
| `neutral/200` | #e5e5e5 | **hairline border** |
| `neutral/400` | #a3a3a3 | `surface-inverse` → primary button + action circles (mid-grey, intentional) |
| `neutral/900` | #171717 | text-primary, accent (data line / active nav / FIRE bar) |
| `neutral/0–950` | … | standard Tailwind neutral steps in between |

| Accent/semantic | Hex / mapping |
|---|---|
| `color/accent` / `color/focus` | `neutral/900` (L) / `neutral/0` (D) — **monochrome, not orange** |
| `orange/500` / `color/negative` | #FF6A0D (loss/spend only; ~2.8:1 on light — accepted) |
| `lime/100` / `color/positive-bg` | #D6F377 |
| `lime/600` / `color/positive` | dark lime (L) · `lime/300` in Dark |

**Key semantic bindings (Light mode):**
- `color/bg` → `neutral/0` (#ffffff page)
- `color/surface` → `neutral/0` (white cards)
- `color/border` → `neutral/200` (#e5e5e5 hairline)
- `color/surface-inverse` → `neutral/400` (#a3a3a3 — mid-grey primary, intentional)
- Page/card separation comes from the 1px `color/border` hairline, not a bg/surface tone difference (both white).

**Full token set (27 `color/*`, added 2026-06 to fill gaps):**
- Surfaces: `bg · surface · surface-raised · surface-sunken · surface-inverse · surface-inverse-hover`
- Text: `text-primary · text-secondary · text-muted · text-on-inverse · on-accent`
- Lines/accent: `border · accent · accent-hover · accent-bg · focus` (focus tracks accent — neutral)
- Money: `positive · positive-bg · negative · negative-bg`
- Categorical **chart palette**: `chart-1` blue · `chart-2` teal · `chart-3` amber · `chart-4` indigo · `chart-5` rose (for allocation/FIRE charts; avoids lime/orange which are reserved for money direction). `blue`/`blue-bg` retained.
- **Fixed:** inactive nav-pill icons were mis-bound to a non-existent `color/chart-5` → rebound to `color/text-secondary`.

**⚠️ Allocation / net-worth breakdown bar — per-theme colors (do NOT change):** Stocks = `accent` · Cash = lime · Crypto = blue · Other = `accent-bg`. Cash/Crypto use the **pale `-bg` tint in light** (`positive-bg`/`blue-bg`) but the **BRIGHT token in dark** (`positive` #bef264 / `blue` #60a5fa) — the dark `-bg` tints are nearly invisible on a dark surface. Balzhima set the dark board's segments to the bright tokens by hand. Code mirrors this via mode-aware `--w-alloc-lime` / `--w-alloc-blue`. **The Documentation Light & Dark boards intentionally differ here — do not "re-sync" the dark board by re-cloning the light one, or you'll overwrite this.**
- Code mirror in `src/styles/william.css` (`--w-sunken`, `--w-on-inverse`, `--w-focus`, `--w-chart-1..5`).

**No shadows.** All `DROP_SHADOW` effects removed (non-Archive pages); the stale `Elevation/sm·md·lg` effect styles were also deleted. Elevation = 1px `color/border` hairline only, never shadow. Do not add drop shadows.

**Nav surfaces are OPAQUE (not frosted).** The NavPill masters use a solid fill + 1px border, NOT translucency/blur (a frosted treatment was trialled in code but caused dark-mode discoloration and didn't match the masters — reverted). Exact specs:
- **FloatingNav (desktop, 202:2605):** fill `color/surface`, border `color/border`, r999, pad 8 (10 left), gap 6. Items r999, icon 20 + label 14. Active = `accent-bg` pill + `accent` text (pad 10/14); inactive = `text-secondary` (pad 10); **account = 36×36 `accent-bg` circle**.
- **TabBar (mobile, 202:2606):** fill `color/bg`, border `color/border`, r999, ~340w, gap 30, pad 6/20. 4 items (50px): icon 24 + label 11. Active = `text-primary`; inactive = `text-muted` (no pill on mobile). Account is NOT in the tab bar (it's in the mobile header).

**Button state fills (masters):** Primary hover = `color/surface-inverse-hover` (#737373 / #a3a3a3 dark), pressed = darker; Secondary/Ghost hover & pressed = `color/surface-raised`; disabled = `color/border` fill + `text-muted`. Code mirrors via `--w-inverse-hover`.

**Action Button hover** = `color/surface-inverse-hover` (was a raw darkening overlay — now uses the real token; no non-variable colors in code). Active = scale 95% + brightness.

**Token audit (2026-06):** every fill/stroke in the component masters + dashboard screens is variable-bound — no raw colors. 27 semantic `color/*` tokens (Color collection) + neutral/blue/lime/orange primitive ramps. The only non-variable colors were the doc-only darkening overlays used to *depict* hover/pressed; the corresponding code states now use real tokens.

**RangeSelector/Segment:** track + segments are **`rounded-full`** (r999); selected segment = `color/surface` fill, **no border**; segment pad 6/14.

**⚠️ Dashboard layout gaps + value font sizes are PER-BREAKPOINT (mobile ≠ desktop)** — extracted from screens 26:3 / 22:3. Mobile is tighter:
| Container / element | Mobile | Desktop |
|---|---|---|
| Main stack | 18 | 20 |
| Top row (cols) | 18 | 20 |
| Portfolio + This-Month **row gap** | **12** | 20 |
| Graph card gap | 14 | 18 |
| FIRE card gap | 8 | 10 |
| Portfolio/Month card gap | 6 | 10 |
| Recent activity gap | 10 | 12 |
| Net-worth hero font | 36 | 44 |
| Stat-card value font (Portfolio/Month) | **22** | 32 |
Code uses responsive classes (`gap-[18px] md:gap-5`, `gap-x-3 gap-y-[18px] md:gap-5`, `text-[22px] md:text-[32px]`, etc). The This-Month wrap bug was caused by using desktop values (gap 20 + 32px font) on mobile.

### Radius + card padding scale (verified against Figma, 2026-06)
Radius: `sm 8 · md 12 · lg 20 · full 999`. **Standard card radius = 20 (`lg`).** Exceptions: net-worth grey wrapper 24, white inner balance card 18, activity rows / See-all 16, insight callout / chart tooltip 12.
Card padding: **20px** standard (`p-5`); graph card **24** (`p-6`); activity rows 16/18; net-worth wrapper 12 (18 bottom). Code: `--w-radius-card: 20px`. (The earlier code used r16/p-6 — corrected.)

### Components & states (handoff-ready, 2026-06)
Pre-dev audit pass added the missing interaction/data states and cleaned duplicates.

**Components (canonical):**
| Component | Set ID | Variants / states |
|---|---|---|
| Button | 11:21 | Style {Primary/Secondary/Ghost} × State {Default/Hover/Pressed/Focus/Disabled/Loading} (18) |
| Action Button | 197:60 | Action {Trade/Income/Expense} — **single source of truth** (dupes 209:1782, 216:2787 deleted; dark frames re-pointed here) |
| Segment | 231:54 | State {Default/Hover/Selected/Pressed/Focus} |
| RangeSelector | 231:55 | composed 1W/1M/1Y/YTD/ALL (1M selected) |
| Card | 13:11 | State {Default/Hover/Pressed/Focus} — Hover=accent border, Pressed=raised fill, Focus=accent ring. **Static cards use Default only** |
| Card / Interactive | 292:26 | **Clickable/navigational card** — whole surface is the action (trailing → affordance) + Default/Hover/Pressed/Focus. Used by the FIRE card. Static cards omit these states |
| Badge | 14:12 | Tone {Positive/Negative/Neutral}. Neutral = `accent-bg` fill + `accent` text (updated 2026-06, was raised+secondary) |
| Chip | 30:9 | Style {Neutral/Outline/Inverse} (updated 2026-06): Neutral = `surface-sunken` + `text-secondary`; Outline = `surface` + `border` + `text-primary`; Inverse = `surface-inverse` (mid-grey) + `text-on-inverse` (was ink/black) |
| Skeleton | 237:3 | loading placeholder (animate shimmer in code) |
| EmptyState | 237:4 | icon + H2 + body + CTA (swap per context) |
| Alert | 237:37 | Tone {Error/Info} — inline fetch-failure banner + Retry |
| ChartTooltip | 240:24 | hover date + value |

**Interaction states:** every interactive component documents Default/Hover/Pressed/Focus (+Disabled/Loading for Button, Selected for Segment, Active for NavPill items). Action Button, Chip, and NavPill item states are shown in the docs; Alert's Retry is a Button/Ghost instance (inherits all button states). EmptyState = icon + H2 + body + primary CTA. RangeSelector composed control is shown in the Segment entry. **Focus ring = `color/accent` (neutral)** — there is no `color/focus` token (it was removed; focus rings were briefly bound to `color/blue` #3b82f6 by mistake and rebound to accent). Static elements (Badge, Skeleton, Icon, ChartTooltip, breakdown bar) are stateless by design. The Documentation page shows all states in light + dark.

**States page** holds Skeleton / EmptyState / Alert / ChartTooltip / a `NetWorthCard / Loading` example / an `Edge cases (reference)` frame (negative net worth, long numbers, 0%/100% FIRE).

**Chart** is hand-drawn in Figma (lines/vectors) — **build with Recharts**, not from the vectors. Spec: 2 lines (primary = `color/accent` neutral, comparison = grey `color/text-muted`), dotted projection to an end-dot; hover → `ChartTooltip` + crosshair; empty/insufficient data → `EmptyState` pattern.

**Nav**: active item = neutral pill (`color/surface`) + `color/text-primary` icon/label; inactive = `color/text-muted`. NavPill is a baked component (`NavPill/Desktop/Light` 202:2605, `NavPill/Mobile/Light` 202:2606); dark mode renders via tokens (verified).

**Open question for dev:** negative *total* net worth — currently shown orange in the edge-case frame (following negative=orange), but a balance isn't a delta. Confirm whether totals should be orange or stay neutral.

### Figma Plugin API rules (for Claude)
These rules prevent wasted iterations:

1. **`rescale(factor)` not `resize(w,h)`** — `resize` only changes bounding box on non-auto-layout frames; `rescale` proportionally scales all children. Use `rescale(targetSize / masterSize)`.
2. **Auto-layout child order = visual order** — to place an icon *before* a text label, use `parent.insertChild(0, instance)`. `appendChild` puts it last.
3. **Pixel art in auto-layout frames** — disable layout first: `frame.layoutMode = 'NONE'`, then set `x`/`y` on each dot. Otherwise dots stack in a row.
4. **Transparent containers** — new frames/auto-layout containers get a white fill by default. Set `fills = []` to make them transparent.
5. **TEXT nodes have no `layoutMode`** — guard with `if (!('children' in node)) return` before accessing layout properties in `findAll` callbacks.
6. **Instances vs components** — always call `component.createInstance()` to place a component in a frame; never move the component master itself.
7. **`setCurrentPageAsync`** — use `await figma.setCurrentPageAsync(page)` to switch pages; `figma.currentPage = page` is not supported.

---

## Portfolio screen + Forms (designed 2026-06, Screens/Dashboard page 15:2)

The Portfolio surface was designed in Figma (desktop 1440 + mobile 375), reusing William tokens/components. Frames live on **page 15:2** in two sections: **"Portfolio — Final"** (370:1455) and the modal/menu sections below.

### Portfolio screen structure
- **Header**: title + subtitle (`6 holdings · Updated 2h ago`) + actions. Actions are **icon + label pills** (all three, incl. Refresh — not icon-only). Desktop = right-aligned `Refresh · Import · + Add trade`. **Mobile = `+ Add trade · Refresh · Import`** (Add trade primary first, all equal pills, none full-width — Figma 488:6940).
- **Bento row**: *Portfolio Value* summary card (value, gain merged line `↑ +$… · +%`, invested, # positions) + *Allocation* card.
- **Allocation card**: documented breakdown bar (**gap 3, segment r4**, palette `accent · positive-bg · blue-bg · accent-bg`) + legend (top-3 holdings + "Other" = real sum). Header has a **"Set targets"** button (entry to rebalancing).
- **Holdings table**: columns **Asset · Price · Shares · Market Value · Gain ($) · Return (%)**. Gain $ and Return % are **separate columns** (so all three are sortable).

### Sorting = sortable columns (NOT a segmented control)
- The old Value/Gain/Return segment implied *view switching*; replaced with **sortable column headers** — active column shows a `↓` arrow + `text-primary` label, others `text-muted`. Desktop variants exist: `— Gain` (sort by $), `— Return` (sort by %).
- **Mobile** has no columns → a compact **sort dropdown** in the Holdings header. Trigger + menu items are **UPPERCASE Geist Mono** (`VALUE · GAIN · RETURN`) matching the column-header treatment; trigger arrow toggles **↓ closed / ↑ open**; selected item = `accent-bg` + check (Figma 499:2167). **Exact specs:** mono labels are **12px / 0.6px letter-spacing**; trigger = `surface-sunken` pill, `text-secondary`, pad 12/6, gap 6; menu = `surface` + `border` r12, pad 6, **2px gap** between items; items pad 12/10, r8, selected = `accent-bg` + `accent` text + ✓ (the ✓ is **Inter 13px, not mono**).
- **Many-holdings edge case**: `— Many holdings` desktop frame (14 rows) confirms the table scales (page grows / scrolls).

### Add modals (Trade / Income / Expense) — section "Add Transaction Modals" (497:1973)
- **Desktop** = centered dialog on a 45% black scrim; **mobile** = bottom sheet (drag handle, top-rounded r24, full-width primary CTA, ✕ dismisses).
- **Trade** fields: Buy/Sell · Ticker + Name · Global/TASE · Quantity · Price(+currency) · Date · Asset category · Notes.
- **Income/Expense** fields: type segment · **Amount** · Category · Date · Payment method (expense) / Destination (income) · Notes.
- **Money-direction carries into inputs**: the Amount renders **orange (expense) / lime (income)** — the only chromatic color in the form.

### Set Targets modal + drift state
- **Set Targets modal** (section "Sort Menu & Set Targets" 503:2167): By category / By holding segment · row per holding (current % + target % input) · running **Total allocated** with a `Balanced` badge at 100% · footer `Turn off targets` · Cancel · Save.
- **Allocation drift state** (section "Allocation — Targets / Drift" 508:2167): once targets set, the allocation bar shows **target tick markers** (thin vertical lines at each target boundary) + legend **"vs target" drift chips** (+2% / −1% …); "Set targets" → **"Edit targets"**.
- **⚠️ Drift is NEUTRAL, never money-direction color.** Over/under target is not a gain/loss — drift chips + ticks use neutral/`text-secondary`, NOT orange/lime. (The black `accent` first segment hides a black tick → that segment was set to **grey** in the drift card by Balzhima for tick contrast.)

### Conventions locked this round
- **Date format = `DD.MM.YYYY`** (e.g. `09.06.2026`) everywhere.
- **All dropdown/select arrows are `Geist Mono` Medium** (▾ / ↓) — matches the tabular-number treatment. Apply to every future dropdown.

### Forms components (Forms page 509:140) — new, formalized 2026-06
Field/menu styles were extracted from the modals into reusable components. Shared style: fill `surface-sunken`, 1px `border`, **r12**, 44px height, label 13 `text-secondary`, value 15 `text-primary` / placeholder `text-muted`.
| Component | ID | Variants |
|---|---|---|
| Input | 509:149 | State {Default / Focus (accent 2px border) / Error (negative border) / Disabled} |
| Select | 510:146 | State {Default / Focus}; trailing `▾` Geist Mono |
| Textarea | 510:147 | single (76px, top-aligned) |
| MenuItem | 511:145 | State {Default / Selected (accent-bg + accent + ✓)} |
| Menu | 511:146 | popover: surface + border r12, pad 6, item gap 2 |
- The modal **type toggles** (Buy/Sell, Expense/Income, By category/By holding) reuse the **Segment** pattern (sunken track, selected = `surface` pill).

### Code implementation (shipped)
- **Screen**: `src/pages/WilliamPortfolio/` (`index.tsx` + `usePortfolioData.ts`), route `/william/portfolio`. Display via `calculateCurrentHoldings`; sortable columns (desktop) / sort dropdown (mobile); allocation top-3 + Other.
- **Allocation drift state** (coded): when `allocationStore.mode === 'individual'`, the hook adds per-row `target` + `drift`; the card shows **target tick markers** (neutral grey `bg-muted` #737373, **2×10px rounded, vertically centered** on the 14px bar — `top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full` — grey reads on every segment incl. the black NVDA one, so no segment recolor needed; the "marks your target weight" caption uses a matching 2×10 rect prefix, not a glyph; matches Figma 508:2167 where ticks are 2×10 `rounded-rectangle`s), **neutral "vs target" drift chips** (`vs target` is `hidden md:inline`), and **"Set targets" → "Edit targets"**. Bar is continuous (no gaps) in drift mode so ticks align to cumulative target %.
- **Modals**: `src/pages/WilliamPortfolio/modals.tsx` — `AddTradeModal`, `AddTransactionModal` (income/expense), `SetTargetsModal`, wired to real stores (`addTrade`, `addTransaction`, `allocationStore.setAllocation`). Mounted on **both** the Portfolio screen (Add trade, Set targets) and the **Dashboard** action buttons (Trade/Income/Expense). Refresh/Import still bridge to old `/portfolio`.
- **New william components**: `Modal` (responsive — desktop dialog / mobile bottom sheet, scrim, Esc + scroll-lock) and `Field` primitives (`Field`, `TextInput`, `Textarea`, `SelectInput` with mono `↓`, `SegmentToggle`). `Button` gained a **`pill`** prop (toolbar/action buttons are pill; generic master stays r12).
- **Date fields** use a **text input in `DD.MM.YYYY`** (helpers `isoToDDMM`/`ddmmToISO`) — not native date input — to honor the format.
- **Icon**: added `refresh / import / target / plus` dot-matrix glyphs (coords re-extracted from masters incl. Balzhima's Refresh edit).

---

## Portfolio case study (ongoing — keep this in mind)

Balzhima is writing a portfolio case study about this redesign (transitioning from graphic/junior designer → product designer who ships alongside devs). **As we work, accumulate the rationale.** Every UX/UI decision should be capturable as: **problem** (from the audit) → **principle** applied → **before → after**. Nudge Balzhima to capture decisions while fresh — don't reconstruct from memory at the end.

**Running thesis:** *UI prominence ∝ frequency of use × relevance in context.*

**Persona — "The Intentional Investor":** financially literate, FIRE-minded, wants confidence/trust, professional-but-stylish. Two modes — *checking* (fast daily glance) vs *deep dive* (weekly). Design checking-mode first.

**Audit → fix → principle threads (the spine of the write-up):**
- Floating "+" FAB (mobile pattern, ambiguous, covers content) → contextual labeled actions + 3 dashboard action buttons.
- FIRE calculator on dashboard → split *configuration* (rare, own page) from *monitoring* (glanceable, actionable progress card).
- Inconsistent number fonts erode trust → one tabular type treatment, comma thousands.
- No hierarchy / left-hugging layout → Display hero number, full-width equal-height bento.
- Missing/inconsistent states → states-as-a-system (Button: 9 variants).

**Design-system story:** tokens-first, then components; semantic tokens give Light/Dark from one source and map 1:1 to CSS vars; layering metaphor = *nesting communicates ownership*.

**Color model (restraint = credibility) — final concept: "color = money direction":** warm-paper neutrals = base · monochrome (black/white) = accent, data line, nav, primary action · **lime = up / orange = down** are the *only* chromatic colors, applied exclusively to gain/loss values. The dashboard is greyscale except where money moves. This is stronger than the earlier "orange as accent" idea — it ties color to meaning, not decoration. (Tradeoff: orange-as-text fails AA on light surfaces ~2.8:1; accepted for identity.) Violet was considered and rejected.

**Material model (Superpower-inspired):** no shadows — elevation = paper-bg vs warm-white surface + hairline border; frosted glass (translucency + background blur) reserved for floating chrome (nav, overlays). Story angle: studied a reference product (superpower.com), extracted its *system rules* (warm neutrals, sparing accent, depth-without-shadow, blur), and re-derived them into our token layer rather than copying screens — the whole UI shifted by editing ~14 variables + removing effects, no per-screen rework.

**Process narrative (strong portfolio angle):** ran as a design-critique loop with Balzhima as editor; changed direction on evidence (the action-buttons decision); verified technical feasibility against the real codebase (Recharts) *before* committing to a design.

> Detailed running notes live in the auto-memory `project_redesign.md` / `ui-surface-style.md`. This section is the durable case-study lens to apply going forward.
