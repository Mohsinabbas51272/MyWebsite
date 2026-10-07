import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Calculator,
  ExternalLink,
  ShieldCheck,
  Scale,
  Coins,
  Gem,
  ArrowUpRight,
  CheckCircle2,
  Building
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { MetalsDataResponse } from '../types/dashboard';
import { CurrencyConverter } from './CurrencyConverter';

export const MetalsView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const [data, setData] = useState<MetalsDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gold' | 'silver' | 'calculator' | 'guide' | 'converter'>('gold');

  // Calculator State
  const [calcMetal, setCalcMetal] = useState<string>('24K');
  const [calcUnit, setCalcUnit] = useState<'tola' | 'gram' | '10gram' | 'masha' | 'ratti' | 'ounce'>('tola');
  const [calcWeight, setCalcWeight] = useState<number>(1);
  const [calcMakingType, setCalcMakingType] = useState<'percentage' | 'fixed'>('percentage');
  const [calcMakingValue, setCalcMakingValue] = useState<number>(10); // 10% making
  const [calcTaxPct, setCalcTaxPct] = useState<number>(0);

  const fetchRates = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    try {
      const url = force
        ? 'http://localhost:5000/api/metals?refresh=true'
        : 'http://localhost:5000/api/metals';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch scraped metals data');
      const json: MetalsDataResponse = await res.json();
      setData(json);
      if (force) {
        onShowToast('Refreshed latest Gold & Silver rates from HamariWeb!');
      }
    } catch (err: any) {
      console.error('Fetch metals error:', err);
      // Backend offline — show error state, no fake data
      setError('Could not fetch live metals data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  if (loading || !data) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="pulse-dot" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Scraping Live Precious Metals Data...</h3>
        <p style={{ fontSize: '0.85rem' }}>Fetching real-time Gold and Silver rates from HamariWeb Sarafa Index</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <ShieldCheck size={28} style={{ margin: '0 auto 1rem', color: 'var(--accent-warning)' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Unable to Load Metals Data</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => { setError(null); setLoading(true); fetchRates(); }} className="btn btn-primary" style={{ margin: '0 auto' }}>Retry</button>
      </div>
    );
  }

  // Calculator computations
  const getBaseGramRate = () => {
    if (calcMetal === 'silver') {
      return data.silver.currentGram;
    }
    const karatObj = data.gold.karats.find((k) => k.karat === calcMetal) || data.gold.karats[0];
    return karatObj ? karatObj.gram : data.gold.current24KGram;
  };

  const getWeightInGrams = () => {
    switch (calcUnit) {
      case 'tola':
        return calcWeight * 11.6638;
      case '10gram':
        return calcWeight * 10;
      case 'gram':
        return calcWeight;
      case 'masha':
        return (calcWeight / 12) * 11.6638;
      case 'ratti':
        return (calcWeight / 96) * 11.6638;
      case 'ounce':
        return calcWeight * 31.1035;
      default:
        return calcWeight;
    }
  };

  const pureGrams = getWeightInGrams();
  const gramRate = getBaseGramRate();
  const rawMetalCost = pureGrams * gramRate;
  const makingCharges =
    calcMakingType === 'percentage'
      ? rawMetalCost * (calcMakingValue / 100)
      : calcMakingValue;
  const subtotal = rawMetalCost + makingCharges;
  const taxAmount = subtotal * (calcTaxPct / 100);
  const totalCost = subtotal + taxAmount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 50%, rgba(139, 92, 246, 0.15) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.35)',
        }}
      >
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span
              className="badge"
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              <Coins size={13} /> HamariWeb Live Scraper Active
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Updated: {data.lastUpdated}
            </span>
          </div>
          <h1>Pakistan Sarafa Gold & Silver Live Rates</h1>
          <p>
            Real-time scraped spot prices for 24K, 22K, 21K, 18K Gold and Fine Silver across Karachi, Lahore, Islamabad & national Sarafa bazaars.
          </p>
        </div>

        <div className="banner-actions">
          <button
            className="btn-secondary"
            onClick={() => fetchRates(true)}
            disabled={refreshing}
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            <RefreshCw size={15} className={refreshing ? 'pulse-dot' : ''} />
            <span>{refreshing ? 'Scraping...' : 'Refresh Live Rates'}</span>
          </button>
          <a
            href={data.gold.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#000', fontWeight: 800 }}
          >
            <ExternalLink size={15} /> HamariWeb Source
          </a>
        </div>
      </div>

      {/* Live Market Spot Ticker Cards */}
      <div className="kpi-grid">
        {/* 24K Gold Tola */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              24K Gold (1 Tola)
            </span>
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.68rem', fontWeight: 800 }}>
              99.9% PURE
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
            Rs. {data.gold.current24KTola.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>10 Gram: Rs. {data.gold.current24K10Gram.toLocaleString()}</span>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Karachi Sarafa</span>
          </div>
        </div>

        {/* 22K Gold Tola */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #fbbf24' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              22K Gold (1 Tola)
            </span>
            <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: '0.68rem', fontWeight: 800 }}>
              JEWELRY
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
            Rs. {data.gold.current22KTola.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>1 Gram: Rs. {Math.round(data.gold.current22KTola / 11.6638).toLocaleString()}</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>91.6% Fine</span>
          </div>
        </div>

        {/* Fine Silver Tola */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Fine Silver (1 Tola)
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
              <ArrowUpRight size={11} /> +Rs. {data.silver.change24hPkr}
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
            Rs. {data.silver.currentTola.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>10 Gram: Rs. {data.silver.current10Gram.toLocaleString()}</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>Chandi Spot</span>
          </div>
        </div>

        {/* Gold Ounce USD Spot */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              International Gold Ounce
            </span>
            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', fontSize: '0.68rem', fontWeight: 800 }}>
              GLOBAL USD
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
            ${data.gold.ounceUsd.toLocaleString()}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Per Troy Ounce (31.1g)</span>
            <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>COMEX / LBMA</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        {[
          { id: 'gold', label: 'Gold Karat Rates', icon: Coins },
          { id: 'silver', label: 'Silver City Rates', icon: Gem },
          { id: 'calculator', label: 'Jewelry & Weight Calculator', icon: Calculator },
          { id: 'guide', label: 'Sarafa Buying Guide', icon: Scale },
          { id: 'converter', label: 'Currency Converter', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                color: isActive ? '#000000' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GOLD KARATS BREAKDOWN */}
      {activeTab === 'gold' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gold Karat Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Coins size={20} style={{ color: '#f59e0b' }} /> Official Gold Rates by Purity & Weight
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Benchmark rates quoted by All-Pakistan Sarafa Gems and Jewellers Association (APSGJA)
                </p>
              </div>

              <span className="badge badge-success">
                <CheckCircle2 size={12} /> Live Scraped
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Purity / Karat</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Per Tola (11.66g)</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>10 Grams</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>1 Gram</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Per Ounce (PKR)</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Standard Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gold.karats.map((k, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-input)',
                            color: idx === 0 ? '#f59e0b' : 'var(--text-primary)',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                          }}
                        >
                          {k.karat}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        Rs. {k.tola.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Rs. {k.tenGram.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                        Rs. {k.gram.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                        Rs. {k.ounce.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {k.purity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10-Day Gold Price Trend Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} style={{ color: '#f59e0b' }} /> 10-Day Gold Price Trend in Pakistan (Rs. / Tola)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Daily historical rate movement for 24K and 22K Gold per Tola
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }} /> 24K Gold
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#8b5cf6' }} /> 22K Gold
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...data.gold.history].reverse()} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gold24Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gold22Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="tola24K" name="24K Tola" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#gold24Grad)" />
                  <Area type="monotone" dataKey="tola22K" name="22K Tola" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#gold22Grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SILVER RATES & CITY MARKETS */}
      {activeTab === 'silver' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Silver Rates by City */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Gem size={20} style={{ color: 'var(--accent-cyan)' }} /> Silver Rates in Major Pakistani Cities (Chandi Rate)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Spot silver rates across Karachi, Lahore, Islamabad, Multan, and regional sarafa bazaars
                </p>
              </div>

              <a
                href={data.silver.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                <ExternalLink size={14} /> HamariWeb Silver Page
              </a>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Sarafa Market / City</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Per Tola (11.66 Grams)</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>10 Grams</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>1 Gram</th>
                    <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>24h Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.silver.cities.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building size={15} style={{ color: 'var(--accent-cyan)' }} />
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.city}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        Rs. {c.tola.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Rs. {c.tenGram.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                        Rs. {c.gram}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle2 size={12} /> Active Spot
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 10-Day Silver Price Trend */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} /> 10-Day Silver Price Movement (Rs. / Tola)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Track daily silver price fluctuations in Pakistani Rupee
              </p>
            </div>

            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...data.silver.history].reverse()} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={12}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `Rs. ${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, 'Per Tola']}
                  />
                  <Area type="monotone" dataKey="tola" name="Silver Tola" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#silverGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: JEWELRY & WEIGHT CALCULATOR */}
      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Input Form */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={20} style={{ color: '#f59e0b' }} /> Live Gold & Jewelry Cost Calculator
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Calculate exact jewelry purchase price with weight, making charges, and polish
              </p>
            </div>

            {/* Metal & Karat Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Select Precious Metal & Karat
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {[
                  { id: '24K', label: '24K Pure Gold' },
                  { id: '22K', label: '22K Jewelry Gold' },
                  { id: '21K', label: '21K Bridal Gold' },
                  { id: '18K', label: '18K Designer Gold' },
                  { id: 'silver', label: 'Fine Silver (Chandi)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCalcMetal(item.id)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      border: calcMetal === item.id ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      background: calcMetal === item.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
                      color: calcMetal === item.id ? '#f59e0b' : 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Weight Unit & Quantity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Weight Quantity
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Weight Unit
                </label>
                <select
                  value={calcUnit}
                  onChange={(e) => setCalcUnit(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="tola">Tola (11.66g)</option>
                  <option value="gram">Grams (g)</option>
                  <option value="10gram">10 Grams</option>
                  <option value="masha">Masha (1/12 Tola)</option>
                  <option value="ratti">Ratti (1/96 Tola)</option>
                  <option value="ounce">Troy Ounce (31.1g)</option>
                </select>
              </div>
            </div>

            {/* Making Charges (Jari/Bana) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Making & Crafting Charges (Jari / Mazdoori)
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => setCalcMakingType('percentage')}
                    style={{
                      border: 'none',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: calcMakingType === 'percentage' ? '#f59e0b' : 'var(--bg-input)',
                      color: calcMakingType === 'percentage' ? '#000' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    % Percent
                  </button>
                  <button
                    onClick={() => setCalcMakingType('fixed')}
                    style={{
                      border: 'none',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: calcMakingType === 'fixed' ? '#f59e0b' : 'var(--bg-input)',
                      color: calcMakingType === 'fixed' ? '#000' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Fixed PKR
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                value={calcMakingValue}
                onChange={(e) => setCalcMakingValue(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={calcMakingType === 'percentage' ? 'e.g. 10%' : 'e.g. 15000'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Optional Tax & Polish */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Sales Tax / GST (% Optional)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={calcTaxPct}
                onChange={(e) => setCalcTaxPct(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0% (Default no tax)"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Result Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '0.75rem' }}>
                  Live Quote
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Spot: Rs. {gramRate.toLocaleString()} / gram
                </span>
              </div>

              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
                Total Estimated Payable
              </span>
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: '#f59e0b',
                  lineHeight: 1.2,
                  marginTop: '0.2rem',
                }}
              >
                Rs. {Math.round(totalCost).toLocaleString()}
              </h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                For {calcWeight} {calcUnit} ({pureGrams.toFixed(2)} grams) of {calcMetal.toUpperCase()}
              </span>
            </div>

            {/* Cost Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pure Metal Net Worth:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Rs. {Math.round(rawMetalCost).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Making Charges ({calcMakingType === 'percentage' ? `${calcMakingValue}%` : 'Fixed'}):
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-purple)' }}>
                  + Rs. {Math.round(makingCharges).toLocaleString()}
                </span>
              </div>

              {calcTaxPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Govt Sales Tax ({calcTaxPct}%):</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    + Rs. {Math.round(taxAmount).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', color: 'var(--text-primary)' }}>
                <span>Final Saraf Bill:</span>
                <span style={{ color: '#f59e0b' }}>Rs. {Math.round(totalCost).toLocaleString()}</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => onShowToast(`Quote of Rs. ${Math.round(totalCost).toLocaleString()} copied to clipboard!`)}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000',
                fontWeight: 800,
              }}
            >
              <Coins size={16} /> Copy Estimation Slip
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SARAFA BUYING GUIDE & FAQS */}
      {activeTab === 'guide' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Unit Conversions in Pakistan */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={18} style={{ color: '#f59e0b' }} /> Traditional Sarafa Measurement Units
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Standard conversions used across Jewellers in Karachi, Lahore, Rawalpindi & Peshawar
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1 Tola (تولہ)</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>= 11.6638 Grams = 12 Mashas = 96 Rattis</span>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1 Masha (ماشہ)</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>= 0.9719 Grams = 8 Rattis</span>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1 Ratti (رتی)</span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>= 0.1214 Grams</span>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>1 Troy Ounce</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>= 31.1035 Grams = 2.666 Tolas</span>
              </div>
            </div>
          </div>

          {/* Essential Buyer Verification Checklist */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} /> Gold Buying & Verification Checklist
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Avoid overpaying for jewelry in local markets
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Always Verify Today's Sarafa Benchmark:</strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                    Check HamariWeb or APSGJA rates before visiting the market to ensure the jeweler uses the official spot price.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Inspect Karat Hallmarking Stamps:</strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                    Look for 916 stamp on 22K jewelry, 750 stamp on 18K jewelry, and 999 stamp on bullion bars.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Negotiate Making & Wastage (Karda):</strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)' }}>
                    Making charges (Jari) are negotiable. Standard plain jewelry making is 8% to 15%.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CURRENCY CONVERTER */}
      {activeTab === 'converter' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          <CurrencyConverter
            goldRatePKR={data.gold.current24KTola}
            silverRatePKR={data.silver.currentTola}
          />
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: '#f59e0b' }} /> Quick Metal Prices (USD)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              International spot prices from COMEX/LBMA benchmark
            </p>
            {[
              { label: 'Gold (Troy Oz)', value: `$${data.gold.ounceUsd.toLocaleString()}`, color: '#f59e0b' },
              { label: 'Gold 24K / Tola (PKR)', value: `Rs. ${data.gold.current24KTola.toLocaleString()}`, color: '#f59e0b' },
              { label: 'Silver (Troy Oz)', value: `Rs. ${data.silver.currentOunce.toLocaleString()}`, color: 'var(--accent-cyan)' },
              { label: 'Silver / Tola (PKR)', value: `Rs. ${data.silver.currentTola.toLocaleString()}`, color: 'var(--accent-cyan)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
