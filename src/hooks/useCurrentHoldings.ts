import { useMemo } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useSettingsStore } from '../stores/settingsStore';
import { calculateCurrentHoldings } from '../utils/calculations';
import { useAutoFetchExchangeRates } from './useAutoFetchExchangeRates';
import type { CurrentHolding } from '../types/index';

export function useCurrentHoldings(): {
  holdings: CurrentHolding[];
  totalValue: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
} {
  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);

  useAutoFetchExchangeRates(trades);

  return useMemo(() => {
    const holdings = calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates);
    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.costBasisTotal, 0);
    const totalGain = totalValue - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return { holdings, totalValue, totalInvested, totalGain, totalGainPercent };
  }, [trades, currentPrices, lastPriceUpdates, exchangeRates]);
}
