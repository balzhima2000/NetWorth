import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../../hooks/useToast';
import { GlassCard, Button } from '../../components/ui';
import { CURRENCIES } from '../../utils/constants';
import { fetchFrankfurterRates } from '../../services/frankfurterApi';
import { fetchExchangeRate } from '../../services/alphaVantage';
import { fetchExchangeRateMassive } from '../../services/massiveApi';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useRecurringStore } from '../../stores/recurringStore';

export default function CurrencySettings() {
  const navigate = useNavigate();
  const toast = useToast();
  
  useEffect(() => { document.title = 'Currency Settings — NetWorth Tracker'; }, []);

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const setDefaultCurrency = useSettingsStore((s) => s.setDefaultCurrency);
  const fxProvider = useSettingsStore((s) => s.fxProvider);
  const fxApiKey = useSettingsStore((s) => s.fxApiKey);
  const fxRequestsToday = useSettingsStore((s) => s.fxRequestsToday);
  const decrementFxRequests = useSettingsStore((s) => s.decrementFxRequests);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const addExchangeRate = useSettingsStore((s) => s.addExchangeRate);
  const removeExchangeRate = useSettingsStore((s) => s.removeExchangeRate);

  const transactions = useTransactionStore((s) => s.transactions);
  const trades = usePortfolioStore((s) => s.trades);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);

  const [refreshingRates, setRefreshingRates] = useState(false);

  const handleRefreshAllRates = async () => {
    if (fxProvider !== 'boi' && !fxApiKey) return;
    const txForeignCurrencies = [...new Set(
      transactions
        .filter((t) => t.currency !== defaultCurrency)
        .map((t) => t.currency)
    )];
    const recurringForeignCurrencies = [...new Set(
      recurringPayments
        .filter((rp) => rp.currency && rp.currency !== defaultCurrency)
        .map((rp) => rp.currency as string)
    )];
    const portfolioForeignCurrencies = [...new Set(
      trades
        .filter((t) => t.sellPrice === null)
        .map((t) => (t.currency || (t.market === 'tase' ? 'ILS' : 'USD')).toUpperCase())
        .filter((c) => c !== defaultCurrency)
    )];
    const currenciesToRefresh = [...new Set([
      ...exchangeRates.map((r) => r.currency),
      ...txForeignCurrencies,
      ...recurringForeignCurrencies,
      ...portfolioForeignCurrencies,
    ])];
    if (currenciesToRefresh.length === 0) {
      toast.error('No foreign currencies found in transactions, recurring payments, holdings, or exchange rate list.');
      return;
    }
    setRefreshingRates(true);
    let updated = 0;
    const errors: string[] = [];

    if (fxProvider === 'boi') {
      try {
        const allRates = await fetchFrankfurterRates(defaultCurrency);
        for (const currency of currenciesToRefresh) {
          const rate = allRates.get(currency.toUpperCase());
          if (rate != null) {
            addExchangeRate({ currency, rateToDefault: rate });
            updated++;
          } else {
            errors.push(`${currency}: not available via free rates provider`);
          }
        }
      } catch (error: unknown) {
        errors.push(`Free Rates: ${getErrorMessage(error, 'request failed')}`);
      }
    } else {
      for (const currency of currenciesToRefresh) {
        if (fxProvider === 'alpha-vantage' && fxRequestsToday + updated >= 25) {
          toast.error('Alpha Vantage daily limit reached — some rates not updated');
          break;
        }
        try {
          const newRate = fxProvider === 'massive'
            ? await fetchExchangeRateMassive(currency, defaultCurrency, fxApiKey)
            : await fetchExchangeRate(currency, defaultCurrency, fxApiKey);
          addExchangeRate({ currency, rateToDefault: newRate });
          if (fxProvider === 'alpha-vantage') decrementFxRequests();
          updated++;
        } catch (error: unknown) {
          errors.push(`${currency}: ${getErrorMessage(error, 'request failed')}`);
        }
      }
    }

    if (updated > 0) toast.success(`Updated ${updated} exchange rate${updated > 1 ? 's' : ''}`);
    if (errors.length > 0) toast.error(`Failed to refresh — ${errors.join(', ')}`);
    setRefreshingRates(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="Back to Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Currency</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage exchange rates and default currency</p>
        </div>
      </div>

      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">💱 Currency Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Default Currency</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E600]/50"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white/70">Exchange Rates</p>
                <p className="text-xs text-white/30 mt-1">1 foreign currency = X {defaultCurrency}</p>
              </div>
              {(fxProvider === 'boi' || fxApiKey) && (exchangeRates.length > 0 || transactions.some((t) => t.currency !== defaultCurrency)) && (
                <Button variant="ghost" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                  {refreshingRates ? 'Refreshing...' : '🔄 Refresh All'}
                </Button>
              )}
            </div>

            {exchangeRates.length > 0 ? (
              <div className="space-y-2">
                {exchangeRates.map((rate) => (
                  <div key={rate.currency} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                    <span className="text-white font-mono text-sm">1 {rate.currency} = {rate.rateToDefault} {defaultCurrency}</span>
                    <button 
                      onClick={() => removeExchangeRate(rate.currency)} 
                      className="text-white/30 hover:text-[#FF5555] transition-colors text-xs px-2 py-1 rounded-lg hover:bg-[#FF5555]/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No exchange rates yet — use Refresh All to populate rates.</p>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
