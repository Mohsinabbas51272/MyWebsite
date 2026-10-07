import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Layers,
  Download,
  Clock,
  Compass
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';

export const AnalyticsView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const [analyticsRange, setAnalyticsRange] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [hourlyTraffic, setHourlyTraffic] = useState<any[]>([]);

  useEffect(() => {
    api.getFunnel().then((f) => {
      if (Array.isArray(f)) setFunnelData(f);
    }).catch(() => {});

    api.getTraffic().then((t) => {
      if (t?.sources) setTrafficSources(t.sources);
      if (t?.hourly) setHourlyTraffic(t.hourly);
    }).catch(() => {});
  }, [analyticsRange]);

  const topCountries = [
    { country: 'United States', code: 'US', share: 44.2, users: '78,410', trend: '+14.2%' },
    { country: 'Germany', code: 'DE', share: 18.5, users: '32,800', trend: '+8.6%' },
    { country: 'United Kingdom', code: 'GB', share: 14.1, users: '25,120', trend: '+5.4%' },
    { country: 'Japan', code: 'JP', share: 11.8, users: '20,950', trend: '+19.1%' },
    { country: 'Canada', code: 'CA', share: 7.4, users: '13,200', trend: '+3.2%' },
  ];

  const retentionCohorts = [
    { cohort: 'Aug W1', users: '1,420', w0: '100%', w1: '64%', w2: '52%', w3: '47%', w4: '42%' },
    { cohort: 'Aug W2', users: '1,890', w0: '100%', w1: '68%', w2: '56%', w3: '49%', w4: '-' },
    { cohort: 'Aug W3', users: '2,150', w0: '100%', w1: '71%', w2: '59%', w3: '-', w4: '-' },
    { cohort: 'Aug W4', users: '2,480', w0: '100%', w1: '74%', w2: '-', w3: '-', w4: '-' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Controls */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <Activity size={12} /> Real-Time Analytics Engine
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Granularity: 1 min aggregation</span>
          </div>
          <h1>Platform Intelligence & User Analytics</h1>
          <p>
            Gain granular insights into conversion funnels, user retention cohorts, traffic acquisition channels, and edge performance.
          </p>
        </div>

        <div className="banner-actions">
          {/* Time range selector */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {(['today', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setAnalyticsRange(r);
                  onShowToast(`Analytics range updated to ${r.toUpperCase()}`);
                }}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: analyticsRange === r ? 'var(--accent-purple)' : 'transparent',
                  color: analyticsRange === r ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={() => onShowToast('Analytics Report PDF generated and queued for download.')}
          >
            <Download size={15} /> Export Insights
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="kpi-grid">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Visitors</span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <ArrowUpRight size={12} /> +18.4%
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            184,500
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+28,400 new unique users</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Session Time</span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <ArrowUpRight size={12} /> +9.2%
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            4m 38s
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+24s over previous period</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Bounce Rate</span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <ArrowDownRight size={12} /> -3.1%
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            26.4%
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Healthy engagement benchmark</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Full Funnel CVR</span>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <ArrowUpRight size={12} /> +2.8%
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            8.07%
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visitor to active subscriber</span>
        </div>
      </div>

      {/* Row 1: Conversion Funnel & Traffic Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
        {/* Conversion Funnel */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} style={{ color: 'var(--accent-purple)' }} /> Multi-Stage Conversion Funnel
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Step-by-step visitor progression from discovery to paid upgrade
              </p>
            </div>
            <span className="badge badge-success">Live Pipeline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {funnelData.map((stage, idx) => {
              const maxCount = funnelData[0]?.count || 1;
              const widthPct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {idx + 1}. {stage.stage}
                    </span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stage.count.toLocaleString()}
                      </span>
                      {idx > 0 && (
                        <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Drop: {stage.dropoff}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '10px', background: 'var(--bg-input)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: stage.fill,
                        borderRadius: '6px',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Traffic Acquisition Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} style={{ color: 'var(--accent-cyan)' }} /> Traffic Acquisition Channels
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inbound channels driving monthly unique sessions
            </p>
          </div>

          <div style={{ height: '180px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSources}
                  dataKey="visitors"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {trafficSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [Number(value).toLocaleString() + ' users', 'Traffic']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {trafficSources.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Hourly Traffic & Latency Stream Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--accent-emerald)' }} /> Hourly Request Volume & Server Latency
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Concurrent HTTP requests vs Edge CDN response time in milliseconds
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#8b5cf6' }} /> Requests / hr
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#06b6d4' }} /> Latency (ms)
            </span>
          </div>
        </div>

        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyTraffic} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="requestsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                }}
              />
              <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#requestsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Cohort Retention Table & Geographic Demographics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Retention Cohorts */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-purple)' }} /> Weekly Retention Cohort
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Percentage of weekly signups returning in subsequent weeks
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>Cohort</th>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>Users</th>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>W0</th>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>W1</th>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>W2</th>
                  <th style={{ padding: '0.5rem', fontWeight: 600 }}>W3</th>
                </tr>
              </thead>
              <tbody>
                {retentionCohorts.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.cohort}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--text-secondary)' }}>{row.users}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>{row.w0}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--accent-purple)', fontWeight: 700 }}>{row.w1}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{row.w2}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: row.w3 === '-' ? 'var(--text-muted)' : 'var(--accent-blue)', fontWeight: 600 }}>{row.w3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Geographic Markets */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} style={{ color: 'var(--accent-cyan)' }} /> Geographic Distribution
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Top active user territories and revenue concentration
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topCountries.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: idx < topCountries.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--accent-purple)' }}>
                    {c.code}
                  </span>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                      {c.country}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.users} active sessions</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                    {c.share}%
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>{c.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
