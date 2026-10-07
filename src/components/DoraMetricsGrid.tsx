import React from 'react';
import { Rocket, AlertTriangle, Clock, Zap } from 'lucide-react';
import type { DoraMetrics } from '../types/dashboard';

interface DoraMetricsGridProps {
  metrics: DoraMetrics;
}

export const DoraMetricsGrid: React.FC<DoraMetricsGridProps> = ({ metrics }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
      {/* 1. Deployment Frequency */}
      <div className="glass-panel glass-panel-hoverable" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Deployment Frequency
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={18} style={{ color: 'var(--accent-purple)' }} />
          </div>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {metrics.deploymentFrequency}
        </h3>
        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
          Elite DORA Performance
        </span>
      </div>

      {/* 2. Change Failure Rate */}
      <div className="glass-panel glass-panel-hoverable" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Change Failure Rate
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} style={{ color: 'var(--accent-rose)' }} />
          </div>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {metrics.changeFailureRate}
        </h3>
        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
          -1.2% vs last week
        </span>
      </div>

      {/* 3. MTTR (Mean Time to Recovery) */}
      <div className="glass-panel glass-panel-hoverable" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Mean Time to Restore (MTTR)
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} style={{ color: 'var(--accent-cyan)' }} />
          </div>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {metrics.mttr}
        </h3>
        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
          Auto Rollback Ready
        </span>
      </div>

      {/* 4. Lead Time for Changes */}
      <div className="glass-panel glass-panel-hoverable" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Lead Time for Changes
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} style={{ color: 'var(--accent-emerald)' }} />
          </div>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {metrics.leadTime}
        </h3>
        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
          Commit → Deploy Speed
        </span>
      </div>
    </div>
  );
};
