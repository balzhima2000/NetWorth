/**
 * TASE DataHub API service
 * Product: "Securities - Basic" (free for personal/internal use)
 * Registration: https://datahub.tase.co.il/login
 * Auth: `apikey` request header
 * Rate limit: 10 requests / 2 seconds (no daily cap)
 *
 * NOTE: Exact endpoint paths/field names may need adjustment after
 * registering and inspecting a live response via the developer portal.
 * The paths below follow the pattern shown in the official API guide.
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

/**
 * Search TASE securities by name or ticker to resolve a numeric securityId.
 * Uses the Securities - Basic endpoint.
 */
export async function searchTaseSecurity(
  query: string,
  apiKey: string
): Promise<TaseSecurity | null> {
  const url = `${BASE}/securities/basic?name=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Response may be wrapped in { result: [...] } or a direct array
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
 * Fetch the latest closing price for a TASE security by its numeric ID.
 */
export async function fetchTaseSecurityPrice(
  securityId: number,
  apiKey: string
): Promise<number> {
  const url = `${BASE}/securities/basic?securityId=${securityId}`;
  const res = await fetch(url, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list: any[] = data?.result ?? data ?? [];
  const item = list[0];
  if (!item) throw new Error(`No data for securityId ${securityId}`);
  const price = item.closingPrice ?? item.ClosingPrice ?? item.price ?? item.Price;
  if (price == null) throw new Error('No price field in response');
  return parseFloat(price);
}

/**
 * Test whether a TASE DataHub API key is valid.
 * Makes a minimal call; a 200 or 400 (valid key, bad params) means the key works.
 */
export async function testTaseKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/securities/basic`, { headers: headers(apiKey) });
    // 200 = success, 400 = bad params but key is valid, 401 = invalid key
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}
