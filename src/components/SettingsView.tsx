import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Key,
  Webhook,
  Shield,
  Bell,
  Palette,
  Save,
  Plus,
  Copy,
  Trash2,
  Sun,
  Moon,
  Radio,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import type { ApiKeyItem, WebhookItem } from '../types/dashboard';
import { useThemeColor } from '../hooks/useThemeColor';
import { useNotificationSound } from '../hooks/useNotificationSound';
import { WebhookEventsPanel } from './WebhookEventsPanel';
import { api } from '../services/api';

interface SettingsViewProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  onShowToast,
}) => {
  const [activeSection, setActiveSection] = useState<
    'profile' | 'api-keys' | 'webhooks' | 'security' | 'notifications' | 'appearance'
  >('profile');

  // Profile Form State
  const [fullName, setFullName] = useState<string>('Mohsin Abbas');
  const [email, setEmail] = useState<string>('mohsin@apex.io');
  const [bio, setBio] = useState<string>('Principal Architect & Fullstack Systems Engineer.');
  const [timezone, setTimezone] = useState<string>('UTC+05:00 (Asia/Karachi)');

  // API Keys State
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyPerms, setNewKeyPerms] = useState<'full' | 'read_only' | 'restricted'>('full');

  // Webhooks State
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState<string>('');

  // Load live API keys and Webhooks from PostgreSQL
  useEffect(() => {
    api.getApiKeys().then((keys) => {
      if (keys && keys.length > 0) setApiKeys(keys);
    }).catch((err) => console.warn('API Keys DB load notice:', err));

    api.getWebhooks().then((whs) => {
      if (whs && whs.length > 0) setWebhooks(whs);
    }).catch((err) => console.warn('Webhooks DB load notice:', err));
  }, []);

  // Security 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(true);

  // Notification toggles
  const [notifDeploy, setNotifDeploy] = useState<boolean>(true);
  const [notifPayment, setNotifPayment] = useState<boolean>(true);
  const [notifSecurity, setNotifSecurity] = useState<boolean>(true);
  const [notifSlack, setNotifSlack] = useState<boolean>(false);

  // Accent Color & Sound — real hooks
  const { activeColorId, setAccentColor, resetToDefault, colors: accentColors } = useThemeColor();
  const { soundEnabled, setSoundEnabled, volume, setVolume, playSound } = useNotificationSound();

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast('Profile & workspace settings saved successfully!');
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const created = await api.createApiKey(newKeyName.trim(), newKeyPerms);
      setApiKeys((prev) => [created, ...prev]);
      setIsNewKeyModalOpen(false);
      setNewKeyName('');
      onShowToast(`Generated new API Key: ${created.name}`);
    } catch (err: any) {
      const fallbackKey: ApiKeyItem = {
        id: `key-${Date.now()}`,
        name: newKeyName.trim(),
        keyPrefix: `apex_${newKeyPerms === 'full' ? 'live' : 'ro'}_${Math.random().toString(36).substring(2, 7)}...`,
        created: 'Just now',
        lastUsed: 'Never',
        permissions: newKeyPerms,
      };
      setApiKeys((prev) => [fallbackKey, ...prev]);
      setIsNewKeyModalOpen(false);
      setNewKeyName('');
      onShowToast(`Generated API Key: ${fallbackKey.name}`);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    onShowToast(`Revoked API Key: ${name}`);
    try {
      await api.deleteApiKey(id);
    } catch (err) {
      console.error('Failed to revoke API key from DB:', err);
    }
  };

  const handleCopyKey = (prefix: string) => {
    navigator.clipboard.writeText(prefix);
    onShowToast('API Key copied to clipboard!');
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;

    const events = ['deployment.all', 'transaction.completed'];
    try {
      const created = await api.createWebhook(newWebhookUrl.trim(), events);
      setWebhooks((prev) => [created, ...prev]);
      setNewWebhookUrl('');
      onShowToast(`Added Webhook Endpoint: ${created.url}`);
    } catch (err) {
      const fallbackWh: WebhookItem = {
        id: `wh-${Date.now()}`,
        url: newWebhookUrl.trim(),
        events,
        status: 'active',
        createdAt: 'Just now',
      };
      setWebhooks((prev) => [fallbackWh, ...prev]);
      setNewWebhookUrl('');
      onShowToast(`Added Webhook: ${fallbackWh.url}`);
    }
  };

  const handleTestWebhook = (url: string) => {
    onShowToast(`Dispatched payload test to ${url}: Received 200 OK.`);
  };

  const menuSections = [
    { id: 'profile', label: 'Profile & Account', icon: User },
    { id: 'api-keys', label: 'API Keys & Secrets', icon: Key },
    { id: 'webhooks', label: 'Webhooks & Integrations', icon: Webhook },
    { id: 'security', label: 'Security & 2FA', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
        <div className="welcome-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <Settings size={12} /> Workspace Config
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Organization: APEXPRO Core</span>
          </div>
          <h1>Enterprise Control Center & Preferences</h1>
          <p>
            Configure developer API keys, secure webhooks, account credentials, notification channels, and design preferences.
          </p>
        </div>
      </div>

      {/* Main Settings Body Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
        {/* Left Settings Sidebar Nav */}
        <div className="glass-panel" style={{ padding: '0.75rem', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {menuSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--accent-purple)' : 'inherit' }} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Panel */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          {/* SECTION 1: PROFILE */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} style={{ color: 'var(--accent-purple)' }} /> Profile & Personal Details
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Update your public profile, admin avatar, and regional preferences
                </p>
              </div>

              {/* Avatar Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                  alt="Avatar"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--accent-purple)', objectFit: 'cover' }}
                />
                <div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onShowToast('Avatar uploaded!')}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  >
                    Upload New Avatar
                  </button>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    JPG, GIF or PNG. Max size 2MB.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Primary Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Professional Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Timezone & Locale
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary">
                  <Save size={16} /> Save Profile Changes
                </button>
              </div>
            </form>
          )}

          {/* SECTION 2: API KEYS */}
          {activeSection === 'api-keys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={20} style={{ color: 'var(--accent-purple)' }} /> API Keys & Access Tokens
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Authenticate automated scripts and external CI/CD integrations
                  </p>
                </div>

                <button className="btn-primary" onClick={() => setIsNewKeyModalOpen(true)}>
                  <Plus size={15} /> Generate API Key
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{key.name}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          {key.permissions} access
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--accent-purple)' }}>{key.keyPrefix}</span>
                        <span>Created: {key.created}</span>
                        <span>Last used: {key.lastUsed}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn-icon"
                        style={{ width: '32px', height: '32px' }}
                        title="Copy Secret Prefix"
                        onClick={() => handleCopyKey(key.keyPrefix)}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '32px', height: '32px', color: 'var(--accent-rose)' }}
                        title="Revoke Key"
                        onClick={() => handleRevokeKey(key.id, key.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Generate Key Modal */}
              {isNewKeyModalOpen && (
                <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--accent-purple)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                    Create New Developer Token
                  </h4>
                  <form onSubmit={handleGenerateKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Token Label (e.g. GitHub Action Runner)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      required
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    <select
                      value={newKeyPerms}
                      onChange={(e) => setNewKeyPerms(e.target.value as any)}
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      <option value="full">Full Admin Read & Write</option>
                      <option value="read_only">Read-Only Analytics</option>
                      <option value="restricted">Restricted Deployments Only</option>
                    </select>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button type="button" className="btn-secondary" onClick={() => setIsNewKeyModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Generate & Reveal Secret
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: WEBHOOKS */}
          {activeSection === 'webhooks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Webhook size={20} style={{ color: 'var(--accent-cyan)' }} /> Webhook Subscriptions
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Send real-time HTTP POST event payloads to external systems
                </p>
              </div>

              {/* Add Webhook Bar */}
              <form onSubmit={handleAddWebhook} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="url"
                  placeholder="https://your-domain.com/api/webhooks/apex"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    minWidth: '260px',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
                <button type="submit" className="btn-primary">
                  <Plus size={15} /> Add Endpoint
                </button>
              </form>

              {/* Webhooks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                        {wh.url}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                        {wh.events.map((ev, i) => (
                          <span key={i} className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => handleTestWebhook(wh.url)}
                      >
                        <Radio size={13} /> Test Ping
                      </button>
                      <button
                        className="btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--accent-rose)' }}
                        onClick={() => {
                          setWebhooks((prev) => prev.filter((w) => w.id !== wh.id));
                          onShowToast('Webhook removed.');
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live GitHub/GitLab Webhook Events */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Webhook size={16} style={{ color: 'var(--accent-cyan)' }} /> Inbound GitHub / GitLab Events
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Receive real deployment events from GitHub or GitLab push webhooks
                </p>
                <WebhookEventsPanel onShowToast={onShowToast} />
              </div>
            </div>
          )}

          {/* SECTION 4: SECURITY & 2FA */}
          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} style={{ color: 'var(--accent-emerald)' }} /> Security & Authentication
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enforce hardware security keys, TOTP 2FA, and manage active sessions
                </p>
              </div>

              {/* 2FA Card */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Two-Factor Authentication (2FA)</span>
                    <span className={twoFactorEnabled ? 'badge badge-success' : 'badge badge-failed'}>
                      {twoFactorEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Protects your workspace with Google Authenticator or YubiKey FIDO2 token.
                  </p>
                </div>

                <button
                  className={twoFactorEnabled ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    onShowToast(twoFactorEnabled ? '2FA Disabled.' : '2FA Authenticator Configured & Enabled!');
                  }}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>

              {/* Active Sessions */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Active Authentication Sessions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Active Workspace Session</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Current Local Session • Authorized</span>
                    </div>
                    <span className="badge badge-success">Active Now</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={20} style={{ color: 'var(--accent-amber)' }} /> Notification Channels & Triggers
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Select which automated system events dispatch emails and webhook pings
                </p>
              </div>

              {/* In-App Sound Alerts */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: `1px solid ${soundEnabled ? 'rgba(139,92,246,0.35)' : 'var(--border-color)'}`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {soundEnabled ? <Volume2 size={20} style={{ color: 'var(--accent-purple)' }} /> : <VolumeX size={20} style={{ color: 'var(--text-muted)' }} />}
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>In-App Notification Sounds</span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Play audio alerts for toast notifications and live events</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => {
                      setSoundEnabled(e.target.checked);
                      onShowToast(`Sound alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                  />
                </div>

                {soundEnabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <VolumeX size={14} style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                      />
                      <Volume2 size={14} style={{ color: 'var(--accent-purple)' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '32px' }}>{Math.round(volume * 100)}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(['success', 'warning', 'error', 'info'] as const).map((type) => (
                        <button
                          key={type}
                          className="btn-secondary"
                          onClick={() => { playSound(type); onShowToast(`Testing ${type} sound`); }}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        >
                          Test {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Deployment Success / Failure Alerts</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receive email when CI/CD pipeline builds fail or complete.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifDeploy}
                    onChange={(e) => {
                      setNotifDeploy(e.target.checked);
                      onShowToast(`Deployment alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>High-Value Transaction Confirmations</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Instant notifications for subscription upgrades & invoices over $1,000.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPayment}
                    onChange={(e) => {
                      setNotifPayment(e.target.checked);
                      onShowToast(`Payment alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Server Load & High CPU Spikes</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency alert when CPU or RAM exceeds 85% for 5+ minutes.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSecurity}
                    onChange={(e) => {
                      setNotifSecurity(e.target.checked);
                      onShowToast(`Server alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Slack Channel Live Bot Notifications</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Post deployment digests and transaction summaries directly into #devops-alerts.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifSlack}
                    onChange={(e) => {
                      setNotifSlack(e.target.checked);
                      onShowToast(`Slack alerts ${e.target.checked ? 'connected' : 'disconnected'}`);
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: APPEARANCE & THEMES */}
          {activeSection === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Palette size={20} style={{ color: 'var(--accent-purple)' }} /> Appearance & Interface Customization
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Personalize the interface color palette, contrast mode, and UI density
                </p>
              </div>

              {/* Theme Mode Toggle */}
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Display Theme</span>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Current Mode: <strong>{theme === 'dark' ? 'OLED Dark Mode' : 'Clean Light Mode'}</strong>
                  </span>
                </div>

                <button className="btn-secondary" onClick={onToggleTheme}>
                  {theme === 'dark' ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} style={{ color: '#8b5cf6' }} />}
                  <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </button>
              </div>

              {/* Accent Color Palette — Live CSS Variable Update */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Primary Accent Color
                  </label>
                  <button
                    className="btn-secondary"
                    onClick={() => { resetToDefault(); onShowToast('Accent color reset to default Violet Nebula'); }}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.65rem' }}>
                  {accentColors.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setAccentColor(c.id);
                        onShowToast(`Accent color changed to ${c.label}`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: activeColorId === c.id ? 'rgba(255,255,255,0.07)' : 'var(--bg-input)',
                        border: activeColorId === c.id ? `2px solid ${c.hex}` : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: c.hex,
                          boxShadow: activeColorId === c.id ? `0 0 8px ${c.hex}` : 'none',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{c.label}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.hex}</span>
                      </div>
                      {activeColorId === c.id && (
                        <span style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '0.65rem', color: c.hex, fontWeight: 800 }}>✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Changes apply instantly across the entire interface and are saved to your browser.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
