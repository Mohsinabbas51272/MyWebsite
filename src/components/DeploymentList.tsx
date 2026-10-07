import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ExternalLink,
  Terminal,
  PlayCircle,
  Search
} from 'lucide-react';
import type { Deployment, EnvironmentType } from '../types/dashboard';

interface DeploymentListProps {
  deployments: Deployment[];
  selectedRepoId?: string;
  onSelectDeploymentForLogs: (dep: Deployment) => void;
  onTriggerDeploy: () => void;
}

export const DeploymentList: React.FC<DeploymentListProps> = ({
  deployments,
  onSelectDeploymentForLogs,
  onTriggerDeploy,
}) => {
  const [envFilter, setEnvFilter] = useState<'all' | EnvironmentType>('all');
  const [search, setSearch] = useState('');

  const filtered = deployments.filter((d) => {
    const matchesEnv = envFilter === 'all' || d.env === envFilter;
    const matchesSearch =
      d.repoName.toLowerCase().includes(search.toLowerCase()) ||
      d.commitMsg.toLowerCase().includes(search.toLowerCase()) ||
      d.commitHash.toLowerCase().includes(search.toLowerCase()) ||
      d.author.toLowerCase().includes(search.toLowerCase());
    return matchesEnv && matchesSearch;
  });

  const getStatusBadge = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Success
          </span>
        );
      case 'building':
        return (
          <span className="badge badge-pending">
            <Loader2 size={12} className="pulse-dot" /> Building
          </span>
        );
      case 'failed':
        return (
          <span className="badge badge-failed">
            <AlertCircle size={12} /> Failed
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="badge badge-pending">
            <Clock size={12} /> Queued
          </span>
        );
    }
  };

  const getEnvBadge = (env: EnvironmentType) => {
    switch (env) {
      case 'production':
        return (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            PRODUCTION
          </span>
        );
      case 'staging':
        return (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            STAGING
          </span>
        );
      case 'preview':
      default:
        return (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            PREVIEW
          </span>
        );
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Rocket size={18} style={{ color: 'var(--accent-purple)' }} /> Recent Deployment Pipelines
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time CI/CD build stream, environment deployments, and terminal logs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Environment Filter Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {['all', 'production', 'staging', 'preview'].map((env) => (
              <button
                key={env}
                onClick={() => setEnvFilter(env as any)}
                style={{
                  border: 'none',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  background: envFilter === env ? 'var(--bg-secondary)' : 'transparent',
                  color: envFilter === env ? 'var(--accent-purple)' : 'var(--text-secondary)',
                }}
              >
                {env}
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={onTriggerDeploy} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            <PlayCircle size={15} /> Trigger Build
          </button>
        </div>
      </div>

      {/* Local Filter Bar */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Filter by commit message, hash, author, or repository..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 1rem 0.5rem 2.2rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '0.825rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Deployment Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No deployments matching current environment filter.
          </p>
        ) : (
          filtered.map((d) => (
            <div
              key={d.id}
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              {/* Left Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '300px' }}>
                <img
                  src={d.authorAvatar}
                  alt={d.author}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getEnvBadge(d.env)}
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {d.repoName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-input)', padding: '1px 6px', borderRadius: '4px' }}>
                      #{d.commitHash}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {d.commitMsg}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>By {d.author}</span>
                    <span>•</span>
                    <span>Branch: <strong style={{ color: 'var(--text-primary)' }}>{d.branch}</strong></span>
                    <span>•</span>
                    <span>{d.provider}</span>
                  </div>
                </div>
              </div>

              {/* Right Status & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  {getStatusBadge(d.status)}
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    Duration: {d.duration} ({d.createdAt})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => onSelectDeploymentForLogs(d)}
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Terminal size={14} style={{ color: 'var(--accent-purple)' }} /> Logs
                  </button>

                  {d.previewUrl && (
                    <a
                      href={d.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-icon"
                      style={{ width: '34px', height: '34px' }}
                      title="Visit Preview URL"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
