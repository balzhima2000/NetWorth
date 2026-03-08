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
| `'boi'` | **Frankfurter** (`api.frankfurter.app`) | None (free) | ECB-backed, CORS-enabled, ~33 currencies |
| `'alpha-vantage'` | Alpha Vantage | `fxApiKey` | 25 req/day free tier |
| `'massive'` | Massive/Polygon | `fxApiKey` | No daily cap |

The Bank of Israel's own APIs (`boi.org.il`, `edge.boi.org.il`) were tested and confirmed to lack CORS headers — they cannot be called from the browser. Frankfurter is the correct free alternative.

**Frankfurter rate formula**: `GET /latest?from=<baseCurrency>` → `data.rates[X]` = "how many X per 1 baseCurrency" → `rateToDefault = 1 / data.rates[currency]`

## Auto-push
All committed fixes are automatically pushed to the remote (`git push` after every commit).

## File map (key files)
```
src/
  services/
    boiApi.ts          — Frankfurter FX fetching (fetchBOIExchangeRates, fetchBOIExchangeRate)
    alphaVantageApi.ts — Alpha Vantage FX fetching
    massiveApi.ts      — Massive/Polygon FX fetching
  stores/
    settingsStore.ts   — Settings, exchange rates table, API key tracking
    transactionStore.ts — Transactions (no recalculation functions)
    recurringStore.ts  — Recurring payments & installment plans (CRUD only)
    portfolioStore.ts  — Stock trades
  pages/
    Settings/index.tsx — All settings UI including FX provider config & Refresh All
  types/index.ts       — All TypeScript interfaces (Transaction, RecurringPayment, etc.)
```
