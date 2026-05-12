import * as XLSX from 'xlsx';
import { getTodayISO } from '../utils/formatters';
import type { StockTrade } from '../types/index';

type AssetCategory = 'stocks' | 'bonds' | 'crypto' | 'other';

export interface ImportRow {
  // Stored on import (in native currency)
  ticker: string;
  name: string;
  quantity: number;
  buyPrice: number;       // native currency, agorot-normalized
  market: 'global' | 'tase';
  currency: string;       // native currency (USD, ILS, GBP, …)

  // Display-only (not stored) — values as-is from broker
  rawLastRate: number;    // col C, agorot-normalized
  totalValue: number;     // col H — broker total value (already in base unit)
  totalPL: number;        // col F — total P/L (already in base unit)
  totalYield: number;     // col G — % yield
  positionRatio: number;  // col M — portfolio weight %

  // Editable in preview before import
  buyDate: string;
  assetCategory: AssetCategory;

  // Conflict detection
  hasConflict: boolean;
  existingQty: number;
  existingBlendedCost: number;  // in native currency
  projectedQty: number;
  projectedBlendedCost: number; // in native currency

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
 *
 * Prices are stored in the stock's native currency — no conversion needed.
 * Agorot normalisation is applied for TASE stocks (÷100 for Last rate and Average cost).
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
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

        // Build existing position map: ticker → { totalQty, totalCost (native currency) }
        const posMap: Record<string, { qty: number; cost: number }> = {};
        for (const t of existingTrades) {
          if (t.sellPrice !== null) continue;
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

          // TASE stocks use numeric security IDs (e.g. "1159235") as their symbol.
          // When the symbol is purely numeric, fall back to the Name column for the ticker.
          const ticker = /^\d+$/.test(symbol) ? name : symbol.toUpperCase();
          const currency = String(row['Currency'] ?? 'USD').trim().toUpperCase();
          const market: 'global' | 'tase' = currency === 'ILS' ? 'tase' : 'global';

          const rawLastRateExcel = toNum(row['Last rate']);
          const rawAvgCostExcel = toNum(row['Average cost']);
          const quantity = toNum(row['Quantity']);
          const totalValue = toNum(row['Total value']);
          const positionRatio = toNum(row['Position ratio']);
          const totalPL = toNum(row['Total p/l']);
          const totalYield = toNum(row['Total yield']);

          // ── Normalise agorot → ILS for TASE stocks ───────────────────────────
          // Israeli brokers quote Last rate and Average cost in agorot (1/100 ₪).
          // Total value and Total p/l are already expressed in ILS.
          const buyPrice = currency === 'ILS' ? rawAvgCostExcel / 100 : rawAvgCostExcel;
          const rawLastRate = currency === 'ILS' ? rawLastRateExcel / 100 : rawLastRateExcel;

          // ── Conflict detection (in native currency) ────────────────────────────
          const existing = posMap[ticker];
          const hasConflict = !!existing;
          const existingQty = existing?.qty ?? 0;
          const existingBlendedCost = existing ? existing.cost / existing.qty : 0;
          const projectedQty = existingQty + quantity;
          const projectedBlendedCost = hasConflict
            ? (existing.cost + quantity * buyPrice) / projectedQty
            : buyPrice;

          rows.push({
            ticker,
            name,
            quantity,
            buyPrice,
            market,
            currency,
            rawLastRate,
            totalValue,
            totalPL,
            totalYield,
            positionRatio,
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
