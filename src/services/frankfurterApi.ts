/**
 * Free exchange rate service via Frankfurter API (api.frankfurter.app).
 * Powered by the European Central Bank (ECB). CORS-enabled, no auth required.
 * Covers ~33 major currencies including ILS, USD, EUR, GBP, JPY, AUD, CAD, CHF, SEK, NOK, DKK, ZAR.
 *
 * Note: The Bank of Israel's own APIs (boi.org.il) lack CORS headers and cannot be
 * called from a browser. Frankfurter provides equivalent daily rates with CORS support.
 */

const FRANKFURTER_BASE = 'https://api.frankfurter.app';

/**
 * Fetch all exchange rates relative to the given base currency.
 * Returns a map of currency code → rateToDefault
 * (how many baseCurrency units equal 1 unit of that currency).
 */
export async function fetchFrankfurterRates(baseCurrency: string): Promise<Map<string, number>> {
  const url = `${FRANKFURTER_BASE}/latest?from=${encodeURIComponent(baseCurrency.toUpperCase())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter API error: HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map<string, number>();
  for (const [currency, rate] of Object.entries(data.rates as Record<string, number>)) {
    // data.rates[X] = "how many X per 1 baseCurrency"
    // rateToDefault = "how many baseCurrency per 1 X" = 1 / data.rates[X]
    map.set(currency, 1 / (rate as number));
  }
  return map;
}

/**
 * Fetch the rate for a single currency relative to baseCurrency.
 */
export async function fetchFrankfurterRate(currency: string, baseCurrency: string): Promise<number> {
  const rates = await fetchFrankfurterRates(baseCurrency);
  const rate = rates.get(currency.toUpperCase());
  if (rate == null) {
    throw new Error(
      `Frankfurter does not publish rates for ${currency}. ` +
      `Supported: USD, EUR, GBP, JPY, AUD, CAD, CHF, SEK, NOK, DKK, ZAR, ILS, and more.`
    );
  }
  return rate;
}
