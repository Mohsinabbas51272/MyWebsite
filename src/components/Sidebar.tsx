import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Users,
  Settings,
  ShieldCheck,
  Download,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Zap,
  Database,
  Coins,
  ScanFace,
  BrainCircuit
} from 'lucide-react';
import type { SystemHealth } from '../types/dashboard';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  systemHealth: SystemHealth;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeTab,
  onSelectTab,
  systemHealth,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'task-assistant', label: 'Tasks & AI Hub', icon: BrainCircuit },
    { id: 'emotion-camera', label: 'AI Emotion Camera', icon: ScanFace },
    { id: 'metals', label: 'Gold & Silver Rates', icon: Coins },
    { id: 'downloader', label: 'Media Downloader', icon: Download },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'system', label: 'System Health', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      style={{
        width: collapsed ? '80px' : '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        transition: 'width var(--transition-normal)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              color: '#fff',
            }}
          >
            <Zap size={22} />
          </div>
          {!collapsed && (
            <div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                APEX<span style={{ color: 'var(--accent-purple)' }}>PRO</span>
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
                Enterprise Hub
              </span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="btn-icon"
          style={{
            margin: '0.75rem auto 0',
            width: '36px',
            height: '36px',
          }}
          title="Expand Sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navigation Items */}
      <nav style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: collapsed ? '0.75rem 0' : '0.75rem 1rem',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.05) 100%)'
                  : 'transparent',
                color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
                borderLeft: isActive ? '3px solid var(--accent-purple)' : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
                width: '100%',
                textAlign: 'left',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} style={{ color: isActive ? 'var(--accent-purple)' : 'inherit' }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom System Meter Widget */}
      {!collapsed && (
        <div style={{ padding: '1rem', margin: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Database size={14} style={{ color: 'var(--accent-cyan)' }} /> Server Health
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
              {systemHealth.uptime}
            </span>
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>CPU Load</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{systemHealth.cpuUsage}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${systemHealth.cpuUsage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>Memory</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{systemHealth.memoryUsage}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-input)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${systemHealth.memoryUsage}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-rose))',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
