import React from 'react';
import { DollarSign, Users, ShoppingCart, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import type { KpiItem } from '../types/dashboard';

interface KpiCardProps {
  kpi: KpiItem;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dollar':
        return <DollarSign size={22} style={{ color: 'var(--accent-purple)' }} />;
      case 'users':
        return <Users size={22} style={{ color: 'var(--accent-blue)' }} />;
      case 'shopping-cart':
        return <ShoppingCart size={22} style={{ color: 'var(--accent-cyan)' }} />;
      case 'activity':
      default:
        return <Activity size={22} style={{ color: 'var(--accent-emerald)' }} />;
    }
  };

  const getIconBg = (iconName: string) => {
    switch (iconName) {
      case 'dollar':
        return 'rgba(139, 92, 246, 0.15)';
      case 'users':
        return 'rgba(59, 130, 246, 0.15)';
      case 'shopping-cart':
        return 'rgba(6, 182, 212, 0.15)';
      case 'activity':
      default:
        return 'rgba(16, 185, 129, 0.15)';
    }
  };

  // Helper to draw inline SVG sparkline path from numbers
  const renderSparkline = (data: number[]) => {
    if (!data || data.length === 0) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 28;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');

    const strokeColor = kpi.trend === 'up' ? '#10b981' : '#f43f5e';

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="glass-panel glass-panel-hoverable" style={{ padding: '1.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: getIconBg(kpi.iconName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getIcon(kpi.iconName)}
        </div>

        <div>{renderSparkline(kpi.sparklineData)}</div>
      </div>

      <div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{kpi.title}</span>
        <h3
          style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0.2rem 0 0.5rem',
            letterSpacing: '-0.03em',
          }}
        >
          {kpi.value}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            className={`badge ${kpi.trend === 'up' ? 'badge-success' : 'badge-failed'}`}
          >
            {kpi.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {kpi.change > 0 ? `+${kpi.change}%` : `${kpi.change}%`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{kpi.period}</span>
        </div>
      </div>
    </div>
  );
};
