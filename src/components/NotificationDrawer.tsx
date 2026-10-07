import React from 'react';
import { X, Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { NotificationItem } from '../types/dashboard';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} style={{ color: 'var(--accent-amber)' }} />;
      case 'success':
        return <CheckCircle size={16} style={{ color: 'var(--accent-emerald)' }} />;
      case 'info':
      default:
        return <Info size={16} style={{ color: 'var(--accent-cyan)' }} />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 90,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          top: 'var(--navbar-height)',
          right: '2rem',
          width: '380px',
          maxHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-md)',
          zIndex: 95,
          padding: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Bell size={16} style={{ color: 'var(--accent-purple)' }} /> Notifications
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onMarkAllAsRead}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-purple)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Mark all as read
            </button>
            <button className="btn-icon" onClick={onClose} style={{ width: '28px', height: '28px' }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
          {notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem 0' }}>
              No notifications at this time.
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: item.unread ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-input)',
                  border: item.unread ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid transparent',
                  display: 'flex',
                  gap: '0.75rem',
                }}
              >
                <div style={{ marginTop: '2px' }}>{getNotifIcon(item.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-primary)' }}>{item.title}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.time}</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
