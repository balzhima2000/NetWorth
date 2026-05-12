import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { GlassCard, Button, Input } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import { testApiKey } from '../../services/alphaVantage';
import { fetchExchangeRate } from '../../services/alphaVantage';
import { fetchFrankfurterRates } from '../../services/frankfurterApi';
import { fetchExchangeRateMassive, testMassiveKey } from '../../services/massiveApi';
import { testTaseKey } from '../../services/taseDataHub';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

export default function APIsSettings() {
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { document.title = 'API Configuration — NetWorth Tracker'; }, []);

  // Settings Store
  const stocksApiKey = useSettingsStore((s) => s.stocksApiKey);
  const setStocksApiKey = useSettingsStore((s) => s.setStocksApiKey);
  const stocksRequestsToday = useSettingsStore((s) => s.stocksRequestsToday);
  
  const fxApiKey = useSettingsStore((s) => s.fxApiKey);
  const setFxApiKey = useSettingsStore((s) => s.setFxApiKey);
  const fxProvider = useSettingsStore((s) => s.fxProvider);
  const setFxProvider = useSettingsStore((s) => s.setFxProvider);
  const fxRequestsToday = useSettingsStore((s) => s.fxRequestsToday);
  const decrementFxRequests = useSettingsStore((s) => s.decrementFxRequests);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const addExchangeRate = useSettingsStore((s) => s.addExchangeRate);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  
  const israeliApiKey = useSettingsStore((s) => s.israeliApiKey);
  const setIsraeliApiKey = useSettingsStore((s) => s.setIsraeliApiKey);
  const israeliRequestsToday = useSettingsStore((s) => s.israeliRequestsToday);
  
  const cryptoApiKey = useSettingsStore((s) => s.cryptoApiKey);
  const setCryptoApiKey = useSettingsStore((s) => s.setCryptoApiKey);

  // Data stores for currency detection
  const transactions = useTransactionStore((s) => s.transactions);
  const trades = usePortfolioStore((s) => s.trades);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);

  // API Key State
  type KeyStatus = 'idle' | 'testing' | 'valid' | 'invalid';
  const [newStocksKey, setNewStocksKey] = useState(stocksApiKey);
  const [stocksKeyStatus, setStocksKeyStatus] = useState<KeyStatus>('idle');
  const [newFxKey, setNewFxKey] = useState(fxApiKey);
  const [fxKeyStatus, setFxKeyStatus] = useState<KeyStatus>('idle');
  const [newIsraeliKey, setNewIsraeliKey] = useState(israeliApiKey);
  const [israeliKeyStatus, setIsraeliKeyStatus] = useState<KeyStatus>('idle');
  const [newCryptoKey, setNewCryptoKey] = useState(cryptoApiKey);
  const [refreshingRates, setRefreshingRates] = useState(false);

  const handleTestStocksKey = async () => {
    if (!newStocksKey) return;
    setStocksKeyStatus('testing');
    const valid = await testApiKey(newStocksKey);
    setStocksKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setStocksApiKey(newStocksKey); toast.success('Stocks API key saved!'); }
    else toast.error('Invalid API key.');
  };

  const handleTestFxKey = async () => {
    if (!newFxKey) return;
    setFxKeyStatus('testing');
    const valid = fxProvider === 'massive'
      ? await testMassiveKey(newFxKey)
      : await testApiKey(newFxKey);
    setFxKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setFxApiKey(newFxKey); toast.success('Exchange Rate API key saved!'); }
    else toast.error('Invalid API key.');
  };

  const handleTestIsraeliKey = async () => {
    if (!newIsraeliKey) return;
    setIsraeliKeyStatus('testing');
    const valid = await testTaseKey(newIsraeliKey);
    setIsraeliKeyStatus(valid ? 'valid' : 'invalid');
    if (valid) { setIsraeliApiKey(newIsraeliKey); toast.success('TASE DataHub key saved!'); }
    else toast.error('Invalid or unreachable TASE key.');
  };

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
        <h1 className="text-2xl font-bold text-white">🔑 API Configuration</h1>
      </div>

      <p className="text-white/40 text-sm mb-4">Each API is optional — features fall back to manual entry when no key is set.</p>

      <div className="space-y-5">
        {/* Stocks — Alpha Vantage */}
        <GlassCard padding="lg" className="bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">📈 Global Stocks</p>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Alpha Vantage</span>
          </div>
          {stocksApiKey ? (
            <>
              <Input type="password" value={stocksApiKey} disabled />
              <Button variant="ghost" size="sm" onClick={() => { setStocksApiKey(''); setNewStocksKey(''); setStocksKeyStatus('idle'); toast.success('Stocks key removed.'); }}>Remove</Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Enter API key..."
                value={newStocksKey}
                onChange={(e) => { setNewStocksKey(e.target.value); setStocksKeyStatus('idle'); }}
              />
              <div className="flex gap-2 flex-wrap mt-2">
                <Button variant="secondary" size="sm" onClick={handleTestStocksKey} disabled={!newStocksKey || stocksKeyStatus === 'testing'}>
                  {stocksKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setStocksApiKey(newStocksKey); setStocksKeyStatus('idle'); toast.success('Stocks key saved.'); }} disabled={!newStocksKey}>
                  Save Without Testing
                </Button>
              </div>
              {stocksKeyStatus === 'valid' && <p className="text-[#00E600] text-xs mt-1">✅ Valid — saved!</p>}
              {stocksKeyStatus === 'invalid' && <p className="text-[#FF5555] text-xs mt-1">❌ Invalid key</p>}
            </>
          )}
          <div className="text-xs text-white/30 space-y-0.5 mt-3">
            {stocksApiKey
              ? <p>Requests used today: <span className="text-white/60">{stocksRequestsToday}/25</span></p>
              : <p className="text-amber-400/60">Not configured — stock prices entered manually</p>}
            <p>Get a free key: <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">alphavantage.co</a></p>
          </div>
        </GlassCard>

        {/* Exchange Rates */}
        <GlassCard padding="lg" className="bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">💱 Exchange Rates</p>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              {fxProvider === 'massive' ? 'Massive (Polygon)' : fxProvider === 'boi' ? 'Free Rates' : 'Alpha Vantage'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs text-white/50">Provider:</span>
            <button
              onClick={() => { setFxProvider('alpha-vantage'); setFxKeyStatus('idle'); }}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'alpha-vantage' ? 'bg-[#00E600]/20 border-[#00E600]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >Alpha Vantage</button>
            <button
              onClick={() => { setFxProvider('massive'); setFxKeyStatus('idle'); }}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'massive' ? 'bg-[#00E600]/20 border-[#00E600]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >Massive (Polygon)</button>
            <button
              onClick={() => { setFxProvider('boi'); setFxKeyStatus('idle'); }}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${fxProvider === 'boi' ? 'bg-[#00E600]/20 border-[#00E600]/50 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >Free Rates 🆓</button>
          </div>
          {fxProvider === 'boi' ? (
            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="secondary" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                {refreshingRates ? 'Refreshing...' : '🔄 Refresh Rates'}
              </Button>
              <p className="text-xs text-[#00E600]/80">✓ Free — no API key required</p>
            </div>
          ) : fxApiKey ? (
            <>
              <Input type="password" value={fxApiKey} disabled className="mb-2" />
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={handleRefreshAllRates} disabled={refreshingRates}>
                  {refreshingRates ? 'Refreshing...' : '🔄 Refresh Rates'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setFxApiKey(''); setNewFxKey(''); setFxKeyStatus('idle'); toast.success('FX key removed. Stored rates kept.'); }}>Remove</Button>
              </div>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Enter API key..."
                value={newFxKey}
                onChange={(e) => { setNewFxKey(e.target.value); setFxKeyStatus('idle'); }}
                className="mb-2"
              />
              <div className="flex gap-2 flex-wrap">
                <Button variant="secondary" size="sm" onClick={handleTestFxKey} disabled={!newFxKey || fxKeyStatus === 'testing'}>
                  {fxKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setFxApiKey(newFxKey); setFxKeyStatus('idle'); toast.success('Exchange Rate key saved.'); }} disabled={!newFxKey}>
                  Save Without Testing
                </Button>
              </div>
              {fxKeyStatus === 'valid' && <p className="text-[#00E600] text-xs mt-1">✅ Valid — saved!</p>}
              {fxKeyStatus === 'invalid' && <p className="text-[#FF5555] text-xs mt-1">❌ Invalid key</p>}
            </>
          )}
          <div className="text-xs text-white/30 space-y-0.5 mt-3">
            {fxProvider === 'boi'
              ? <p className="text-white/40">ECB rates via Frankfurter · updated daily · free</p>
              : fxApiKey
                ? <p>Requests used today: <span className="text-white/60">{fxRequestsToday}{fxProvider === 'alpha-vantage' ? '/25' : ''}</span></p>
                : <p className="text-amber-400/60">Not configured — exchange rates not available</p>}
          </div>
        </GlassCard>

        {/* Israeli Market — TASE DataHub */}
        <GlassCard padding="lg" className="bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">🇮🇱 Israeli Market (TASE)</p>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">TASE DataHub</span>
          </div>
          {israeliApiKey ? (
            <>
              <Input type="password" value={israeliApiKey} disabled />
              <Button variant="ghost" size="sm" onClick={() => { setIsraeliApiKey(''); setNewIsraeliKey(''); setIsraeliKeyStatus('idle'); toast.success('TASE key removed.'); }}>Remove</Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Enter API key..."
                value={newIsraeliKey}
                onChange={(e) => { setNewIsraeliKey(e.target.value); setIsraeliKeyStatus('idle'); }}
              />
              <div className="flex gap-2 flex-wrap mt-2">
                <Button variant="secondary" size="sm" onClick={handleTestIsraeliKey} disabled={!newIsraeliKey || israeliKeyStatus === 'testing'}>
                  {israeliKeyStatus === 'testing' ? 'Testing...' : 'Test Key'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setIsraeliApiKey(newIsraeliKey); setIsraeliKeyStatus('idle'); toast.success('TASE key saved.'); }} disabled={!newIsraeliKey}>
                  Save Without Testing
                </Button>
              </div>
              {israeliKeyStatus === 'valid' && <p className="text-[#00E600] text-xs mt-1">✅ Valid — saved!</p>}
              {israeliKeyStatus === 'invalid' && <p className="text-[#FF5555] text-xs mt-1">❌ Invalid key</p>}
            </>
          )}
          <div className="text-xs text-white/30 space-y-0.5 mt-3">
            {israeliApiKey
              ? <p>Requests today: <span className="text-white/60">{israeliRequestsToday}</span></p>
              : <p className="text-amber-400/60">Not configured — TASE prices entered manually</p>}
            <p>Get access at: <a href="https://datahub.tase.co.il/login" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">datahub.tase.co.il</a></p>
          </div>
        </GlassCard>

        {/* Crypto — Coinlayer */}
        <GlassCard padding="lg" className="bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">🪙 Crypto</p>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Coinlayer</span>
          </div>
          {cryptoApiKey ? (
            <>
              <Input type="password" value={cryptoApiKey} disabled />
              <Button variant="ghost" size="sm" onClick={() => { setCryptoApiKey(''); setNewCryptoKey(''); toast.success('Crypto key removed.'); }}>Remove</Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Enter API key..."
                value={newCryptoKey}
                onChange={(e) => setNewCryptoKey(e.target.value)}
              />
              <Button variant="secondary" size="sm" onClick={() => { setCryptoApiKey(newCryptoKey); toast.success('Coinlayer key saved.'); }} disabled={!newCryptoKey} className="mt-2">
                Save Key
              </Button>
            </>
          )}
          <div className="text-xs text-white/30 space-y-0.5 mt-3">
            {cryptoApiKey
              ? <p>✅ Configured — live & historical crypto prices enabled</p>
              : <p className="text-amber-400/60">Not configured — crypto prices entered manually</p>}
            <p>Free plan: 100 requests/month. Get your key at: <a href="https://coinlayer.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">coinlayer.com</a></p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
