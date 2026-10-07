import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface EndpointStat {
  endpoint: string;
  method: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  lastStatus: number;
  recentLatencies: number[];
}

interface MonitorStats {
  endpoints: EndpointStat[];
  totalRequests: number;
  uptimeSeconds: number;
  startedAt: string;
}

function latencyColor(ms: number): string {
  if (ms < 100) return 'var(--accent-emerald)';
  if (ms < 500) return 'var(--accent-amber)';
  return 'var(--accent-rose)';
}

function latencyLabel(ms: number): string {
  if (ms < 100) return 'Excellent';
  if (ms < 300) return 'Good';
  if (ms < 500) return 'Fair';
  return 'Slow';
}

export const ApiMonitorView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/monitor/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch {
      // Backend offline — initialize with empty defaults
      setStats({
        totalRequests: 0,
        uptimeSeconds: 0,
        startedAt: new Date().toISOString(),
        endpoints: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const pingAll = async () => {
    onShowToast('Pinging all endpoints...');
    try {
      await Promise.all([
        fetch('http://localhost:5000/api/health'),
        fetch('http://localhost:5000/api/monitor/stats'),
      ]);
      await fetchStats();
      onShowToast('Ping complete — all reachable endpoints responded!');
    } catch {
      onShowToast('Some endpoints are unreachable.');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  const uptimeFormatted = stats
    ? (() => {
        const s = stats.uptimeSeconds;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
      })()
    : '--';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
      {/* Section Header */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} /> API Response Monitor
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Real-time backend endpoint latency & success rate tracking
              {lastRefreshed && ` · Refreshed at ${lastRefreshed}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ accentColor: 'var(--accent-purple)' }}
              />
              Auto-refresh (10s)
            </label>
            <button className="btn-secondary" onClick={pingAll} style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>
              <Zap size={13} /> Ping All
            </button>
            <button
              className="btn-icon"
              onClick={fetchStats}
              style={{ width: '32px', height: '32px' }}
              title="Refresh now"
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        {stats && (
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Requests: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats.totalRequests.toLocaleString()}</strong>
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Server Uptime: </span>
              <strong style={{ color: 'var(--accent-emerald)' }}>{uptimeFormatted}</strong>
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Endpoints Tracked: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{stats.endpoints.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Endpoint Cards */}
      {!stats || stats.endpoints.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}
        >
          <Activity size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ fontWeight: 600 }}>No traffic recorded yet</p>
          <p style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
            Make API requests to see latency stats. Try clicking "Ping All" above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
          {stats.endpoints.map((ep) => {
            const successRate = ep.totalRequests > 0
              ? ((ep.successCount / ep.totalRequests) * 100).toFixed(1)
              : '100.0';
            const chartData = ep.recentLatencies.map((l, i) => ({ i, l }));
            const color = latencyColor(ep.avgLatency);

            return (
              <div
                key={ep.endpoint}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  borderLeft: `3px solid ${color}`,
                }}
              >
                {/* Endpoint Name & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: 'rgba(139,92,246,0.15)',
                        color: 'var(--accent-purple)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginRight: '0.4rem',
                      }}
                    >
                      {ep.method}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {ep.endpoint}
                    </span>
                  </div>
                  {ep.lastStatus >= 200 && ep.lastStatus < 400 ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                  ) : (
                    <XCircle size={16} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
                  )}
                </div>

                {/* Stats Row */}
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Latency</span>
                    <span style={{ fontWeight: 800, color, fontSize: '1.1rem' }}>{ep.avgLatency}ms</span>
                    <span style={{ fontSize: '0.68rem', color, marginLeft: '0.3rem' }}>{latencyLabel(ep.avgLatency)}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Success Rate</span>
                    <span style={{ fontWeight: 700, color: parseFloat(successRate) >= 95 ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontSize: '1rem' }}>
                      {successRate}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Requests</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{ep.totalRequests}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={9} /> Min / Max
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {ep.minLatency}ms / {ep.maxLatency}ms
                    </span>
                  </div>
                </div>

                {/* Sparkline Chart */}
                {chartData.length > 1 && (
                  <div style={{ height: '45px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <Line
                          type="monotone"
                          dataKey="l"
                          stroke={color}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.72rem' }}
                          formatter={(v: any) => [`${v}ms`, 'Latency']}
                          labelFormatter={() => ''}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Error badge */}
                {ep.errorCount > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <XCircle size={11} /> {ep.errorCount} error{ep.errorCount > 1 ? 's' : ''} recorded
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
