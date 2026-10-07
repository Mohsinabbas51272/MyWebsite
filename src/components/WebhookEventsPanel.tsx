import React, { useState, useEffect, useCallback } from 'react';
import { Webhook, Zap, Copy, Check, RefreshCw, GitPullRequest, GitBranch, Clock } from 'lucide-react';

interface WebhookEvent {
  id: string;
  source: 'github' | 'gitlab' | 'test';
  event: string;
  repo: string;
  branch: string;
  actor: string;
  status: 'received' | 'processed' | 'error';
  receivedAt: string;
  payload: any;
}

interface WebhookEventsPanelProps {
  onShowToast: (msg: string) => void;
}

export const WebhookEventsPanel: React.FC<WebhookEventsPanelProps> = ({ onShowToast }) => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const WEBHOOK_URLS = {
    github: 'http://localhost:5000/api/webhooks/github',
    gitlab: 'http://localhost:5000/api/webhooks/gitlab',
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/webhooks/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // backend offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleCopyUrl = (key: 'github' | 'gitlab') => {
    const url = WEBHOOK_URLS[key];
    navigator.clipboard.writeText(url);
    setCopiedUrl(key);
    onShowToast(`Webhook URL copied: ${url}`);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSendTestWebhook = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/webhooks/test', { method: 'POST' });
      if (res.ok) {
        onShowToast('✅ Test webhook dispatched and processed!');
        setTimeout(fetchEvents, 500);
      } else {
        onShowToast('Failed to send test webhook.');
      }
    } catch {
      onShowToast('Backend offline — cannot send test webhook.');
    }
  };

  const sourceIcon = (source: string) => {
    if (source === 'github') return <GitPullRequest size={14} />;
    return <GitBranch size={14} />;
  };

  const sourceColor = (source: string) => {
    if (source === 'github') return '#e5e7eb';
    if (source === 'gitlab') return '#fc6d26';
    return 'var(--accent-purple)';
  };

  const statusColor = (status: string) => {
    if (status === 'processed') return 'var(--accent-emerald)';
    if (status === 'error') return 'var(--accent-rose)';
    return 'var(--accent-amber)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
      {/* Webhook URLs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Inbound Webhook Endpoints
        </label>
        {(['github', 'gitlab'] as const).map((key) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span style={{ color: sourceColor(key), display: 'flex', alignItems: 'center' }}>
              {sourceIcon(key)}
            </span>
            <code
              style={{
                flex: 1,
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {WEBHOOK_URLS[key]}
            </code>
            <button
              className="btn-icon"
              onClick={() => handleCopyUrl(key)}
              style={{ width: '28px', height: '28px', flexShrink: 0 }}
              title="Copy webhook URL"
            >
              {copiedUrl === key ? (
                <Check size={13} style={{ color: 'var(--accent-emerald)' }} />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Actions Row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button className="btn-primary" onClick={handleSendTestWebhook} style={{ fontSize: '0.82rem' }}>
          <Zap size={14} /> Send Test Webhook
        </button>
        <button
          className="btn-secondary"
          onClick={fetchEvents}
          style={{ fontSize: '0.82rem' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh Events
        </button>
        {events.length > 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {events.length} event{events.length !== 1 ? 's' : ''} received
          </span>
        )}
      </div>

      {/* Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Webhook size={14} /> Recent Webhook Events
        </label>

        {events.length === 0 ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
            }}
          >
            <Webhook size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No webhook events received yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Configure your GitHub/GitLab repo to point to the URL above, or send a test event.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <span style={{ color: sourceColor(ev.source), flexShrink: 0, marginTop: '2px' }}>
                  {sourceIcon(ev.source)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {ev.event}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor(ev.status), background: `rgba(0,0,0,0.2)`, padding: '1px 6px', borderRadius: '4px' }}>
                      {ev.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    <strong style={{ color: 'var(--text-secondary)' }}>{ev.repo}</strong>
                    {ev.branch && ` · ${ev.branch}`}
                    {ev.actor && ` · by ${ev.actor}`}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  <Clock size={10} /> {ev.receivedAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
