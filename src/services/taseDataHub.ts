/**
 * TASE DataHub API service
 *
 * Products used (register at https://datahub.tase.co.il/login):
 *   • Securities - Basic (free)             → TA-125 stocks only, used for name search
 *   • Securities data End of Day – Current  → ALL TASE equities, closing prices
 *       GET /v1/securities/trading/eod/seven-days/by-security?securityId={id}
 *   • Mutual Funds                          → ETFs (domestic + foreign) and mutual funds
 *       GET /v1/foreign-etf/{securityId}/details
 *       GET /v1/etf/{securityId}/details
 *       GET /v1/mutual-fund/{mutualFundId}/details
 *
 * Auth: `apikey` request header (one key covers all subscribed products)
 * Rate limit: 10 requests / 2 seconds (no daily cap)
 *
 * Price field names are not confirmed from a live response yet.
 * The `extractPrice` helper covers the most common TASE field name conventions.
 * If a new field name is discovered, add it there — one place to update.
 */

const BASE = 'https://datahubapi.tase.co.il';

function headers(apiKey: string): HeadersInit {
  return {
    apikey: apiKey,
    accept: 'application/json',
    'accept-language': 'en',
  };
}

export interface TaseSecurity {
  securityId: number;
  name: string;
  ticker: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises price field names across all TASE endpoints.
 * Field names vary by product: stocks use closingPrice, funds use redemptionPrice or nav.
 */
function extractPrice(item: any): number | null {
  const v =
    item.closingPrice    ?? item.ClosingPrice    ??
    item.redemptionPrice ?? item.RedemptionPrice ?? // mutual funds
    item.nav             ?? item.Nav             ?? // ETF net asset value
    item.price           ?? item.Price           ??
    item.lastPrice       ?? item.LastPrice;
  return v != null ? parseFloat(v) : null;
}

/**
 * Fetch closing price from the Securities End of Day product.
 * Covers all TASE-listed equities (stocks). Response is an array of the last
 * 7 trading days — we take the first item (most recent).
 */
async function fetchTaseEodPrice(securityId: number, apiKey: string): Promise<number> {
  const url = `${BASE}/v1/securities/trading/eod/seven-days/by-security?securityId=${securityId}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`EoD HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  if (!list.length) throw new Error(`No EoD data for securityId ${securityId}`);
  const price = extractPrice(list[0]);
  if (price == null) throw new Error('No price field in EoD response');
  return price;
}

/**
 * Fetch price from the Mutual Funds product using a path-parameter endpoint.
 * Used for foreign ETFs, domestic ETFs, and open mutual funds.
 * e.g. path = `/v1/foreign-etf/1159235/details`
 */
async function fetchFundPrice(path: string, apiKey: string): Promise<number> {
  const res = await fetch(`${BASE}${path}`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Response may be a direct object, or wrapped in result/data
  const raw = data?.result ?? data?.data ?? data;
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) throw new Error('Empty response from fund endpoint');
  const price = extractPrice(item);
  if (price == null) throw new Error('No price field in fund response');
  return price;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the latest price for any TASE-listed security by its numeric ID.
 *
 * Tries products in order:
 *  1. Securities EoD   → stocks/equities (all TASE)
 *  2. Foreign ETF      → iShares, Vanguard, etc. listed on TASE
 *  3. Domestic ETF     → Israeli ETFs
 *  4. Open Mutual Fund → Israeli mutual funds
 *  5. Securities-Basic → free fallback, TA-125 only
 */
export async function fetchTaseSecurityPrice(
  securityId: number,
  apiKey: string
): Promise<number> {
  // 1. Securities EoD (covers all TASE stocks/equities)
  try { return await fetchTaseEodPrice(securityId, apiKey); } catch { /* fall through */ }

  // 2. Foreign ETF (e.g. iShares MSCI ACWI, Vanguard funds listed on TASE)
  try { return await fetchFundPrice(`/v1/foreign-etf/${securityId}/details`, apiKey); } catch { /* fall through */ }

  // 3. Domestic ETF
  try { return await fetchFundPrice(`/v1/etf/${securityId}/details`, apiKey); } catch { /* fall through */ }

  // 4. Open Mutual Fund
  try { return await fetchFundPrice(`/v1/mutual-fund/${securityId}/details`, apiKey); } catch { /* fall through */ }

  // 5. Last resort: Securities-Basic (free tier, TA-125 only)
  const url = `${BASE}/securities/basic?securityId=${securityId}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  const item = list[0];
  if (!item) throw new Error(`Security ${securityId} not found in any subscribed TASE product`);
  const price = extractPrice(item);
  if (price == null) throw new Error('No price field in Securities-Basic response');
  return price;
}

/**
 * Search TASE securities by name or ticker (TA-125 stocks only).
 * The Mutual Funds product endpoints are all ID-based — no name search available.
 * For ETFs and mutual funds, enter the numeric security ID directly.
 */
export async function searchTaseSecurity(
  query: string,
  apiKey: string
): Promise<TaseSecurity | null> {
  const url = `${BASE}/securities/basic?name=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  if (!list.length) return null;
  const first = list[0];
  return {
    securityId: first.securityId ?? first.SecurityId,
    name: first.name ?? first.Name ?? query,
    ticker: first.ticker ?? first.Ticker ?? query,
  };
}

/**
 * Test whether a TASE DataHub API key is valid.
 * Tests against the Securities EoD endpoint (primary subscribed product).
 * 200 = valid; 400 = valid key with missing/bad params — both mean the key works.
 */
export async function testTaseKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${BASE}/v1/securities/trading/eod/seven-days/by-security`,
      { headers: headers(apiKey) }
    );
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}
