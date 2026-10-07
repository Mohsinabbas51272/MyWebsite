import React from 'react';
import { Shield, CreditCard, User, Server, Clock } from 'lucide-react';
import type { ActivityEvent } from '../types/dashboard';

interface ActivityFeedProps {
  activities: ActivityEvent[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'security':
        return <Shield size={14} style={{ color: 'var(--accent-rose)' }} />;
      case 'transaction':
        return <CreditCard size={14} style={{ color: 'var(--accent-emerald)' }} />;
      case 'system':
        return <Server size={14} style={{ color: 'var(--accent-cyan)' }} />;
      case 'user':
      default:
        return <User size={14} style={{ color: 'var(--accent-purple)' }} />;
    }
  };

  const getEventBg = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'security':
        return 'rgba(244, 63, 94, 0.15)';
      case 'transaction':
        return 'rgba(16, 185, 129, 0.15)';
      case 'system':
        return 'rgba(6, 182, 212, 0.15)';
      case 'user':
      default:
        return 'rgba(139, 92, 246, 0.15)';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} style={{ color: 'var(--accent-cyan)' }} /> Live Audit Stream
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Real-time security logs and user activity updates
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Clock size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No recent activity events recorded.</p>
          </div>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <img
                  src={item.avatar}
                  alt={item.user}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: getEventBg(item.type),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--bg-secondary)',
                  }}
                >
                  {getEventIcon(item.type)}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>{item.user}</span> {item.action}{' '}
                  <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{item.target}</span>
                </p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  {item.timestamp}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
