import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  ChevronDown,
  User,
  LogOut,
  Sliders,
  Sparkles
} from 'lucide-react';
import type { NotificationItem } from '../types/dashboard';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
  onOpenQuickModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateTab?: (tab: string) => void;
  wsStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  notifications,
  onOpenNotifications,
  onOpenQuickModal,
  searchQuery,
  onSearchChange,
  onNavigateTab,
  wsStatus = 'disconnected',
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live metals ticker state
  const [goldRate, setGoldRate] = useState<string>('...');
  const [silverRate, setSilverRate] = useState<string>('...');
  const [metalsTrend, setMetalsTrend] = useState<'up' | 'down' | 'flat'>('flat');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut cmd+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch live metal rates from backend
  useEffect(() => {
    const fetchMetals = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/metals');
        if (!res.ok) return;
        const data = await res.json();
        const gold24k = data?.gold?.current24KTola;
        const silver = data?.silver?.currentTola;
        const change = data?.gold?.change24hPct;
        if (gold24k) {
          // Format as 481.5k style
          const goldFormatted = gold24k >= 1000
            ? `Rs. ${(gold24k / 1000).toFixed(1)}k`
            : `Rs. ${gold24k.toLocaleString()}`;
          setGoldRate(goldFormatted);
        }
        if (silver) {
          setSilverRate(`Rs. ${silver.toLocaleString()}`);
        }
        if (typeof change === 'number') {
          setMetalsTrend(change > 0 ? 'up' : change < 0 ? 'down' : 'flat');
        }
      } catch {
        // silently keep last value
      }
    };
    fetchMetals();
    const interval = setInterval(fetchMetals, 5 * 60 * 1000); // refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header
      style={{
        height: 'var(--navbar-height)',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Global Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '420px' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--text-muted)',
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search metrics, transactions, logs (⌘K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 2.5rem 0.6rem 2.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '10px',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '2px 5px',
              background: 'var(--bg-input)',
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Live Gold & Silver Spot Badge */}
        <button
          onClick={() => onNavigateTab?.('metals')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title="Click to view live Pakistan Sarafa Gold & Silver rates"
        >
          <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            🥇 Gold: <strong>{goldRate}</strong>
            {metalsTrend === 'up' && <span style={{ color: 'var(--accent-emerald)', fontSize: '0.7rem' }}>▲</span>}
            {metalsTrend === 'down' && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>▼</span>}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            🥈 Silver: <strong>{silverRate}</strong>
          </span>
        </button>

        {/* WebSocket Status Badge */}
        <div
          title={`WebSocket: ${wsStatus}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: `1px solid ${
              wsStatus === 'connected'
                ? 'rgba(16,185,129,0.35)'
                : wsStatus === 'reconnecting' || wsStatus === 'connecting'
                ? 'rgba(245,158,11,0.35)'
                : 'rgba(244,63,94,0.35)'
            }`,
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor:
                wsStatus === 'connected'
                  ? 'var(--accent-emerald)'
                  : wsStatus === 'reconnecting' || wsStatus === 'connecting'
                  ? 'var(--accent-amber)'
                  : 'var(--accent-rose)',
              animation:
                wsStatus === 'connected' || wsStatus === 'connecting' || wsStatus === 'reconnecting'
                  ? 'pulse 2s infinite'
                  : 'none',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color:
                wsStatus === 'connected'
                  ? 'var(--accent-emerald)'
                  : wsStatus === 'reconnecting' || wsStatus === 'connecting'
                  ? 'var(--accent-amber)'
                  : 'var(--text-muted)',
            }}
          >
            WS
          </span>
        </div>

        {/* Live Clock Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <span className="pulse-dot" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Action button */}
        <button className="btn-primary" onClick={onOpenQuickModal}>
          <Plus size={16} />
          <span>New Entry</span>
        </button>

        {/* Theme Switcher Button */}
        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={19} style={{ color: '#f59e0b' }} /> : <Moon size={19} style={{ color: '#8b5cf6' }} />}
        </button>

        {/* Notification Bell with Badge */}
        <div style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={onOpenNotifications} title="Notifications">
            <Bell size={19} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--accent-rose)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--bg-secondary)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.2rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                alt="User Avatar"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-purple)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-emerald)',
                  border: '2px solid var(--bg-secondary)',
                }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                Mohsin A.
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
                Admin Leader
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>

          {showProfileMenu && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: '50px',
                right: 0,
                width: '220px',
                padding: '0.5rem',
                zIndex: 100,
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Mohsin Abbas</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mohsin@apex.io</p>
              </div>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigateTab?.('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <User size={16} /> My Profile
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigateTab?.('settings');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Sliders size={16} /> Preferences
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onNavigateTab?.('system');
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent-purple)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={16} /> System Health
              </button>

              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigateTab?.('overview');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent-rose)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} /> Return to Overview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
