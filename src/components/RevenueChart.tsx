import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { TimeRange, RevenueDataPoint } from '../types/dashboard';
import { api } from '../services/api';

interface RevenueChartProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  timeRange,
  onTimeRangeChange,
}) => {
  const [metricView, setMetricView] = useState<'all' | 'revenue' | 'profit'>('all');
  const [data, setData] = useState<RevenueDataPoint[]>([]);

  useEffect(() => {
    api.getRevenueChart(timeRange).then((points) => {
      if (Array.isArray(points)) setData(points);
    }).catch((err) => console.warn('Revenue chart load notice:', err));
  }, [timeRange]);

  const timeOptions: { label: string; value: TimeRange }[] = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '1 Year', value: '1y' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Chart Top Header Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Financial Overview
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time gross revenue, operating costs, and net profit margins
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Filter Pill */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setMetricView('all')}
              style={{
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: metricView === 'all' ? 'var(--bg-secondary)' : 'transparent',
                color: metricView === 'all' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              }}
            >
              All Metrics
            </button>
            <button
              onClick={() => setMetricView('revenue')}
              style={{
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: metricView === 'revenue' ? 'var(--bg-secondary)' : 'transparent',
                color: metricView === 'revenue' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              }}
            >
              Revenue Only
            </button>
            <button
              onClick={() => setMetricView('profit')}
              style={{
                border: 'none',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: metricView === 'profit' ? 'var(--bg-secondary)' : 'transparent',
                color: metricView === 'profit' ? 'var(--accent-purple)' : 'var(--text-secondary)',
              }}
            >
              Net Profit
            </button>
          </div>

          {/* Time Range Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onTimeRangeChange(opt.value)}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: timeRange === opt.value ? 'var(--accent-purple)' : 'transparent',
                  color: timeRange === opt.value ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ width: '100%', height: '320px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                color: 'var(--text-primary)',
              }}
              formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
            />

            {(metricView === 'all' || metricView === 'revenue') && (
              <Area
                type="monotone"
                dataKey="revenue"
                name="Gross Revenue"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            )}

            {(metricView === 'all' || metricView === 'profit') && (
              <Area
                type="monotone"
                dataKey="profit"
                name="Net Profit"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorProfit)"
              />
            )}

            {metricView === 'all' && (
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f43f5e"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorExpenses)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Quick Summary Stats */}
      <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gross Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Net Profit</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Operating Expenses</span>
        </div>
      </div>
    </div>
  );
};
