import * as XLSX from 'xlsx';
import { getTodayISO } from '../utils/formatters';
import type { StockTrade } from '../types/index';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';

export interface ImportRow {
  // Stored on import
  ticker: string;
  name: string;
  quantity: number;
  avgCost: number;        // col L → StockTrade.buyPrice (in holding's native currency)
  market: 'global' | 'tase';

  // Display-only in preview (not stored)
  lastRate: number;       // col C — current price from broker
  totalValue: number;     // col H — qty × lastRate, for sanity check
  totalPL: number;        // col F — total profit/loss
  totalYield: number;     // col G — % yield
  positionRatio: number;  // col M — portfolio weight %
  currency: string;       // col N — native currency of the holding

  // Editable in preview before import
  buyDate: string;        // ISO date, defaults to today
  assetCategory: AssetCategory;

  // Conflict detection (ticker already exists in portfolio)
  hasConflict: boolean;
  existingQty: number;
  existingBlendedCost: number;
  projectedQty: number;
  projectedBlendedCost: number;

  // Row state
  selected: boolean;
  rowKey: string;
}

/** Auto-detect asset category from security name. */
function autoCategory(name: string): AssetCategory {
  const u = name.toUpperCase();
  if (
    u.includes('ETF') ||
    u.startsWith('ISH') ||
    u.includes('ISHARES') ||
    u.includes('VANECK') ||
    u.includes('VANGUARD') ||
    u.includes('INVESCO') ||
    u.includes('SPDR') ||
    u.includes('GLOBAL X')
  ) return 'other';
  return 'stocks';
}

/** Parse a raw cell value to a number. Handles strings with commas, %, etc. */
function toNum(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[,%\s]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Parse a broker portfolio .xlsx file into ImportRow objects.
 * Uses header names (row 1) to map columns — robust to column reordering.
 *
 * Expected headers (English): Name, Symbol, Last rate, % change, Daily p/l,
 * Total p/l, Total yield, Total value, Morning quantity, Quantity,
 * Morning total value, Average cost, Position ratio, Currency
 */
export async function parsePortfolioExcel(
  file: File,
  existingTrades: StockTrade[],
): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // sheet_to_json uses row 1 as header keys automatically
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        // Build existing position map: ticker → { totalQty, totalCost }
        const posMap: Record<string, { qty: number; cost: number }> = {};
        for (const t of existingTrades) {
          if (t.sellPrice !== null) continue; // open positions only
          if (!posMap[t.ticker]) posMap[t.ticker] = { qty: 0, cost: 0 };
          posMap[t.ticker].qty += t.quantity;
          posMap[t.ticker].cost += t.quantity * t.buyPrice;
        }

        const today = getTodayISO();

        const rows: ImportRow[] = [];

        rawRows.forEach((row, i) => {
          const name = String(row['Name'] ?? '').trim();
          const symbol = String(row['Symbol'] ?? '').trim();
          if (!name || !symbol) return;

          const ticker = symbol.toUpperCase();
          const lastRate = toNum(row['Last rate']);
          const quantity = toNum(row['Quantity']);
          const avgCost = toNum(row['Average cost']);
          const totalValue = toNum(row['Total value']);
          const positionRatio = toNum(row['Position ratio']);
          const totalPL = toNum(row['Total p/l']);
          const totalYield = toNum(row['Total yield']);
          const currency = String(row['Currency'] ?? 'USD').trim().toUpperCase();
          const market: 'global' | 'tase' = currency === 'ILS' ? 'tase' : 'global';

          // Conflict: ticker already has open trades in portfolio
          const existing = posMap[ticker];
          const hasConflict = !!existing;
          const existingQty = existing?.qty ?? 0;
          const existingBlendedCost = existing ? existing.cost / existing.qty : 0;
          const projectedQty = existingQty + quantity;
          const projectedBlendedCost = hasConflict
            ? (existing.cost + quantity * avgCost) / projectedQty
            : avgCost;

          rows.push({
            ticker,
            name,
            quantity,
            avgCost,
            market,
            lastRate,
            totalValue,
            totalPL,
            totalYield,
            positionRatio,
            currency,
            buyDate: today,
            assetCategory: autoCategory(name),
            hasConflict,
            existingQty,
            existingBlendedCost,
            projectedQty,
            projectedBlendedCost,
            selected: true,
            rowKey: `${ticker}-${i}`,
          });
        });

        resolve(rows);
      } catch (err: any) {
        reject(new Error(err?.message ?? 'Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
