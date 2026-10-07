import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw, TrendingUp } from 'lucide-react';

interface ExchangeRates {
  USD: number;
  PKR: number;
  EUR: number;
  GBP: number;
  AED: number;
  SAR: number;
}

const CURRENCIES = ['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR'] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_FLAGS: Record<Currency, string> = {
  USD: '🇺🇸', PKR: '🇵🇰', EUR: '🇪🇺', GBP: '🇬🇧', AED: '🇦🇪', SAR: '🇸🇦',
};

const CURRENCY_NAMES: Record<Currency, string> = {
  USD: 'US Dollar', PKR: 'Pakistani Rupee', EUR: 'Euro', GBP: 'British Pound', AED: 'UAE Dirham', SAR: 'Saudi Riyal',
};

interface CurrencyConverterProps {
  goldRatePKR?: number;
  silverRatePKR?: number;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({ goldRatePKR, silverRatePKR }) => {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [amount, setAmount] = useState<string>('1000');
  const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
  const [toCurrency, setToCurrency] = useState<Currency>('PKR');
  const [error, setError] = useState<string>('');

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/currency/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error('Backend unavailable');
      }
    } catch {
      // Fallback static rates
      setRates({ USD: 1, PKR: 278.5, EUR: 0.92, GBP: 0.79, AED: 3.67, SAR: 3.75 });
      setLastUpdated('Fallback Rates');
      setError('Using static fallback rates — backend offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const convert = (amt: number, from: Currency, to: Currency): number => {
    if (!rates) return 0;
    const inUSD = amt / rates[from];
    return inUSD * rates[to];
  };

  const numericAmount = parseFloat(amount) || 0;
  const convertedAmount = convert(numericAmount, fromCurrency, toCurrency);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const formatConverted = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return val.toFixed(4);
  };

  // Convert gold/silver rates if available
  const goldInTo = goldRatePKR ? convert(goldRatePKR, 'PKR', toCurrency) : null;
  const silverInTo = silverRatePKR ? convert(silverRatePKR, 'PKR', toCurrency) : null;

  return (
    <div
      className="glass-panel"
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ArrowLeftRight size={18} style={{ color: 'var(--accent-purple)' }} />
            Currency Converter
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {lastUpdated ? `Updated: ${lastUpdated}` : 'Fetching live rates...'}
          </p>
        </div>
        <button
          className="btn-icon"
          onClick={fetchRates}
          title="Refresh rates"
          style={{ width: '32px', height: '32px' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--accent-amber)',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: '100%',
            padding: '0.7rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '1.1rem',
            fontWeight: 700,
            outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent-purple)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
        />
      </div>

      {/* Currency Selectors Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* From */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            From
          </label>
          <select
            value={fromCurrency}
            onChange={(e) => setFromCurrency(e.target.value as Currency)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_FLAGS[c]} {c} — {CURRENCY_NAMES[c]}
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          className="btn-icon"
          style={{ marginTop: '1.2rem', width: '36px', height: '36px', flexShrink: 0 }}
          title="Swap currencies"
        >
          <ArrowLeftRight size={16} />
        </button>

        {/* To */}
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
            To
          </label>
          <select
            value={toCurrency}
            onChange={(e) => setToCurrency(e.target.value as Currency)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_FLAGS[c]} {c} — {CURRENCY_NAMES[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          {numericAmount.toLocaleString()} {fromCurrency} =
        </div>
        <div
          style={{
            fontSize: '2rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}
        >
          {formatConverted(convertedAmount)} {toCurrency}
        </div>
        {rates && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            1 {fromCurrency} = {convert(1, fromCurrency, toCurrency).toFixed(4)} {toCurrency}
          </div>
        )}
      </div>

      {/* Metals Rates in Selected Currency */}
      {(goldInTo !== null || silverInTo !== null) && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={13} /> Metals Rates in {toCurrency}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {goldInTo !== null && (
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.2rem' }}>🥇 Gold / Tola</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {toCurrency === 'PKR' ? goldRatePKR?.toLocaleString() : formatConverted(goldInTo)} {toCurrency}
                </div>
              </div>
            )}
            {silverInTo !== null && (
              <div
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.2rem' }}>🥈 Silver / Tola</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {toCurrency === 'PKR' ? silverRatePKR?.toLocaleString() : formatConverted(silverInTo)} {toCurrency}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Rate Reference Grid */}
      {rates && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1 USD Base Rates
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {CURRENCIES.filter(c => c !== 'USD').map((c) => (
              <div
                key={c}
                style={{
                  padding: '0.45rem 0.6rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => { setFromCurrency('USD'); setToCurrency(c); }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-purple)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <span style={{ color: 'var(--text-muted)' }}>{CURRENCY_FLAGS[c]} {c}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{rates[c].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
