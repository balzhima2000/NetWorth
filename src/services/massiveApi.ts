/**
 * Massive (Polygon.io) financial data API service.
 * Massive.com is Polygon.io rebranded (October 2025).
 * Base URL: https://api.massive.com (legacy: https://api.polygon.io)
 */

const MASSIVE_BASE_URL = 'https://api.massive.com';

/**
 * Fetch real-time currency conversion rate using Massive/Polygon's FX API.
 * Endpoint: GET /v1/conversion/{from}/{to}
 * Response includes `converted` field with the exchange rate.
 */
export async function fetchExchangeRateMassive(
  fromCurrency: string,
  toCurrency: string,
  apiKey: string
): Promise<number> {
  // Attempt 1: real-time conversion (requires paid Currencies plan)
  const convUrl = `${MASSIVE_BASE_URL}/v1/conversion/${encodeURIComponent(fromCurrency)}/${encodeURIComponent(toCurrency)}?amount=1&precision=6&apiKey=${apiKey}`;
  const convResp = await fetch(convUrl);

  if (convResp.ok) {
    const data = await convResp.json();
    if (data.status !== 'ERROR' && data.converted != null) {
      return data.converted as number;
    }
  }

  if (convResp.status === 403) {
    // Real-time endpoint requires a paid plan — fall back to previous day's close (free Basic Currencies tier)
    // Important: do NOT encodeURIComponent the ticker — the colon in "C:USDEUR" must stay
    // as-is in the path segment (encoding it to %3A breaks the Massive/Polygon router)
    const ticker = `C:${fromCurrency}${toCurrency}`;
    const aggUrl = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${apiKey}`;
    const aggResp = await fetch(aggUrl);
    if (aggResp.ok) {
      const aggData = await aggResp.json();
      const rate = aggData.results?.[0]?.c;
      if (rate != null) return rate as number;
    }
    throw new Error(
      'Forex data unavailable — upgrade your Massive/Polygon plan at massive.com/pricing, or switch provider to Alpha Vantage (free)'
    );
  }

  throw new Error(`HTTP ${convResp.status}`);
}

/**
 * Test whether a Massive/Polygon API key is valid.
 * Uses /v1/marketstatus/now — available on all Massive plans — to check key authenticity.
 * Returns true if the key is recognised (200 or 403 plan restriction), false only on 401.
 * Forex-specific access is NOT tested here; it surfaces naturally when the user clicks Refresh Rates.
 */
export async function testMassiveKey(apiKey: string): Promise<boolean> {
  try {
    const url = `${MASSIVE_BASE_URL}/v1/marketstatus/now?apiKey=${apiKey}`;
    const resp = await fetch(url);
    // 401 = key rejected outright (invalid/expired)
    // 200 = fully valid; 403 = valid key, endpoint outside current plan — key is still real
    return resp.ok || resp.status === 403;
  } catch {
    return false;
  }
}
