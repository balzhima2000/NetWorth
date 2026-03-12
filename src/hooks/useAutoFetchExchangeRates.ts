import { useEffect, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { fetchFrankfurterRates } from '../services/frankfurterApi';
import type { StockTrade } from '../types/index';

/**
 * Auto-fetches exchange rates for currencies used in open portfolio positions
 * that aren't already in the store.
 *
 * Uses a single batch HTTP call (fetchFrankfurterRates) regardless of how many
 * currencies are needed — avoids N separate requests when N currencies are missing.
 */
export function useAutoFetchExchangeRates(trades: StockTrade[]): void {
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const addExchangeRate = useSettingsStore((s) => s.addExchangeRate);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const existingCurrencies = new Set(exchangeRates.map((r) => r.currency));
    const neededCurrencies = [
      ...new Set(
        trades
          .filter((t) => t.sellPrice === null)
          .map((t) => t.currency ?? 'USD')
      ),
    ].filter((c) => c !== defaultCurrency && !existingCurrencies.has(c));

    if (neededCurrencies.length === 0 || isFetchingRef.current) return;

    isFetchingRef.current = true;
    fetchFrankfurterRates(defaultCurrency)
      .then((rates) => {
        neededCurrencies.forEach((currency) => {
          const rate = rates.get(currency.toUpperCase());
          if (rate != null) addExchangeRate({ currency, rateToDefault: rate });
        });
      })
      .catch(() => {
        // silently fail — user can manually configure rates in Settings
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [trades, exchangeRates, defaultCurrency, addExchangeRate]);
}
