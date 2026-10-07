import React from 'react';
import { GitBranch, Plus, ExternalLink, Server } from 'lucide-react';
import type { Repository } from '../types/dashboard';

interface RepoSelectorProps {
  repositories: Repository[];
  selectedRepoId: string;
  onSelectRepo: (id: string) => void;
  onOpenAddModal: () => void;
}

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  repositories,
  selectedRepoId,
  onSelectRepo,
  onOpenAddModal,
}) => {
  const currentRepo = repositories.find((r) => r.id === selectedRepoId);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Select Target Repository
          </label>
          <select
            value={selectedRepoId}
            onChange={(e) => onSelectRepo(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-highlight)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '260px',
            }}
          >
            <option value="all">All Tracked Repositories ({repositories.length})</option>
            {repositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.provider})
              </option>
            ))}
          </select>
        </div>

        {currentRepo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', marginTop: '0.8rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GitBranch size={14} style={{ color: 'var(--accent-purple)' }} /> {currentRepo.defaultBranch}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Server size={14} style={{ color: 'var(--accent-cyan)' }} /> {currentRepo.provider}
            </span>
            <a
              href={currentRepo.url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={onOpenAddModal}>
        <Plus size={16} /> Track New Repo
      </button>
    </div>
  );
};
