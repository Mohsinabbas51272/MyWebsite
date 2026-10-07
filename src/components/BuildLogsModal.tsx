import React, { useState } from 'react';
import { X, Terminal, CheckCircle2, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import type { Deployment, Comment } from '../types/dashboard';
import { CommentThread } from './CommentThread';

interface BuildLogsModalProps {
  deployment: Deployment | null;
  onClose: () => void;
  comments?: Comment[];
  onAddComment?: (entityId: string, entityType: 'transaction' | 'deployment', text: string) => void;
}

export const BuildLogsModal: React.FC<BuildLogsModalProps> = ({ deployment, onClose, comments = [], onAddComment }) => {
  const [copied, setCopied] = useState(false);

  if (!deployment) return null;

  const handleCopyLogs = () => {
    const logText = deployment.steps
      .map((s) => `=== [${s.status.toUpperCase()}] ${s.name} (${s.duration}) ===\n${s.logs.join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md), var(--shadow-glow)',
          border: '1px solid var(--border-highlight)',
          backgroundColor: '#0b0f19',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header Bar */}
        <div
          style={{
            backgroundColor: '#111827',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Terminal size={18} style={{ color: 'var(--accent-purple)' }} />
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', fontFamily: 'monospace' }}>
                {deployment.id} — {deployment.repoName} ({deployment.branch})
              </span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block' }}>
                Commit #{deployment.commitHash} by {deployment.author}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleCopyLogs}
              className="btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={14} />}
              {copied ? 'Copied Logs' : 'Copy Output'}
            </button>
            <button className="btn-icon" onClick={onClose} style={{ width: '30px', height: '30px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Terminal Logs Content */}
        <div
          style={{
            padding: '1.25rem',
            overflowY: 'auto',
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '0.85rem',
            color: '#e5e7eb',
            backgroundColor: '#030712',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {deployment.steps.map((step, idx) => (
            <div key={idx} style={{ borderRadius: '6px', border: '1px solid #1f2937', background: '#0b0f19', overflow: 'hidden' }}>
              {/* Step Title Header */}
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  background: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #1f2937',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {step.status === 'passed' && <CheckCircle2 size={16} style={{ color: '#10b981' }} />}
                  {step.status === 'failed' && <AlertCircle size={16} style={{ color: '#f43f5e' }} />}
                  {step.status === 'running' && <Loader2 size={16} className="pulse-dot" style={{ color: '#06b6d4' }} />}
                  <span style={{ fontWeight: 700, color: '#f9fafb' }}>
                    Step {idx + 1}: {step.name}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{step.duration}</span>
              </div>

              {/* Step Logs Stdout */}
              <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', lineHeight: 1.5 }}>
                {step.logs.map((line, lIdx) => (
                  <div key={lIdx} style={{ display: 'flex', gap: '0.6rem' }}>
                    <span style={{ color: '#4b5563', userSelect: 'none', minWidth: '24px' }}>{lIdx + 1}</span>
                    <span
                      style={{
                        color: line.includes('Error') || line.includes('FAIL')
                          ? '#f43f5e'
                          : line.includes('✓') || line.includes('200 OK')
                          ? '#10b981'
                          : line.startsWith('git') || line.startsWith('npm') || line.startsWith('vite')
                          ? '#8b5cf6'
                          : '#d1d5db',
                      }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comment Thread */}
        {onAddComment && deployment && (
          <div style={{ padding: '1rem 1.25rem', background: '#0a0e1a', borderTop: '1px solid var(--border-color)' }}>
            <CommentThread
              comments={comments.filter((c) => c.entityId === deployment.id)}
              entityId={deployment.id}
              entityType="deployment"
              onAddComment={onAddComment}
            />
          </div>
        )}
      </div>
    </div>
  );
};
