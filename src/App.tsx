import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  Rocket
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KpiCard } from './components/KpiCard';
import { RevenueChart } from './components/RevenueChart';
import { DistributionChart } from './components/DistributionChart';
import { TransactionsTable } from './components/TransactionsTable';
import { ActivityFeed } from './components/ActivityFeed';
import { QuickActionModal } from './components/QuickActionModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { TransactionModal } from './components/TransactionModal';

// Deployment Tracker Components
import { RepoSelector } from './components/RepoSelector';
import { DoraMetricsGrid } from './components/DoraMetricsGrid';
import { DeploymentList } from './components/DeploymentList';
import { BuildLogsModal } from './components/BuildLogsModal';
import { AddRepoModal } from './components/AddRepoModal';

// Media Downloader Component
import { MediaDownloader } from './components/MediaDownloader';

// New Complete Tab Views
import { MetalsView } from './components/MetalsView';
import { AnalyticsView } from './components/AnalyticsView';
import { TransactionsView } from './components/TransactionsView';
import { TeamView } from './components/TeamView';
import { SystemView } from './components/SystemView';
import { SettingsView } from './components/SettingsView';
import { EmotionDetectionView } from './components/EmotionDetectionView';
import { TaskAssistantView } from './components/TaskAssistantView';

// Hooks
import { useWebSocket } from './hooks/useWebSocket';
import { useThemeColor } from './hooks/useThemeColor';
import { useNotificationSound } from './hooks/useNotificationSound';

import type { TimeRange, Transaction, NotificationItem, Repository, Deployment, Comment, SystemHealth, DoraMetrics, KpiItem } from './types/dashboard';
import { api } from './services/api';

export const App: React.FC = () => {
  // Theme state (dark default)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Accent color & sound hooks (auto-persist to localStorage)
  useThemeColor(); // Applies saved color on mount
  const { playSound } = useNotificationSound();

  // Filters & Financial Data State
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Deployment Tracker State
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('all');
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDeploymentForLogs, setSelectedDeploymentForLogs] = useState<Deployment | null>(null);

  // System & DORA Telemetry
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    cpuUsage: 18,
    memoryUsage: 42,
    diskSpace: 38,
    apiLatency: 1,
    uptime: '100%',
    status: 'healthy',
  });
  const [doraMetrics, setDoraMetrics] = useState<DoraMetrics>({
    deploymentFrequency: '1 / day',
    changeFailureRate: '0%',
    mttr: '0 mins',
    leadTime: '0 mins',
  });

  // Modals & Drawers State
  const [isQuickModalOpen, setIsQuickModalOpen] = useState<boolean>(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);

  // Load live data from PostgreSQL Backend
  const loadDatabaseData = useCallback(async () => {
    try {
      const [txns, repos, dpls, acts, notifs, cmts, liveKpis, health, dora] = await Promise.allSettled([
        api.getTransactions(),
        api.getRepositories(),
        api.getDeployments(),
        api.getActivities(),
        api.getNotifications(),
        api.getComments(),
        api.getKpis(),
        api.getSystemHealth(),
        api.getDoraMetrics(),
      ]);

      if (txns.status === 'fulfilled') setTransactions(txns.value);
      if (repos.status === 'fulfilled') setRepositories(repos.value);
      if (dpls.status === 'fulfilled') setDeployments(dpls.value);
      if (acts.status === 'fulfilled') setActivities(acts.value);
      if (notifs.status === 'fulfilled') setNotifications(notifs.value);
      if (cmts.status === 'fulfilled') setComments(cmts.value);
      if (liveKpis.status === 'fulfilled' && liveKpis.value.length > 0) setKpis(liveKpis.value);
      if (health.status === 'fulfilled') setSystemHealth(health.value);
      if (dora.status === 'fulfilled') setDoraMetrics(dora.value);
    } catch (err) {
      console.warn('Initial data load notice:', err);
    }
  }, []);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (msg: string, soundType?: 'success' | 'warning' | 'error' | 'info') => {
    setToastMessage(msg);
    playSound(soundType || 'info');
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Comments handler (persisted to PostgreSQL)
  const handleAddComment = useCallback(
    async (entityId: string, entityType: 'transaction' | 'deployment', text: string) => {
      const newComment: Comment = {
        id: `cmt-${Date.now()}`,
        author: 'Mohsin Abbas',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        entityId,
        entityType,
      };
      setComments((prev) => [...prev, newComment]);
      try {
        await api.createComment({ author: 'Mohsin Abbas', text, entityId, entityType });
      } catch (err) {
        console.error('Failed to persist comment to DB:', err);
      }
    },
    []
  );

  // WebSocket handler — live updates from backend
  const handleWsMessage = useCallback(
    (msg: { type: string; payload: any }) => {
      switch (msg.type) {
        case 'new_transaction': {
          const txn = msg.payload as Transaction;
          setTransactions((prev) => [txn, ...prev.filter((t) => t.id !== txn.id)].slice(0, 100));
          setNotifications((prev) => [
            {
              id: `notif-ws-${Date.now()}`,
              title: 'New Transaction',
              message: `${txn.customerName} — $${Number(txn.amount).toLocaleString()}`,
              time: 'Just now',
              unread: true,
              type: 'success' as const,
            },
            ...prev,
          ]);
          playSound('success');
          api.getKpis().then((k) => k.length && setKpis(k)).catch(() => {});
          break;
        }
        case 'deployment_update': {
          const dep = msg.payload as Deployment;
          setDeployments((prev) => [dep, ...prev.filter((d) => d.id !== dep.id)].slice(0, 50));
          if (dep.status === 'failed') playSound('error');
          else if (dep.status === 'success') playSound('success');
          break;
        }
        case 'new_repository': {
          const repo = msg.payload as Repository;
          setRepositories((prev) => [repo, ...prev.filter((r) => r.id !== repo.id)]);
          break;
        }
        case 'notification': {
          setNotifications((prev) => [msg.payload, ...prev]);
          playSound('warning');
          break;
        }
        default:
          break;
      }
    },
    [playSound]
  );

  const { status: wsStatus } = useWebSocket(handleWsMessage);

  const handleAddTransaction = async (newTxn: Transaction) => {
    setTransactions((prev) => [newTxn, ...prev]);
    setActivities((prev) => [
      {
        id: `act-${Date.now()}`,
        user: newTxn.customerName,
        avatar: newTxn.customerAvatar,
        action: 'added new entry for',
        target: `$${Number(newTxn.amount).toLocaleString()} (${newTxn.type})`,
        timestamp: 'Just now',
        type: 'transaction',
      },
      ...prev,
    ]);
    showToast(`Success: Created record ${newTxn.id} for $${Number(newTxn.amount).toLocaleString()}`);
    try {
      await api.createTransaction(newTxn);
      api.getKpis().then((k) => k.length && setKpis(k)).catch(() => {});
    } catch (err: any) {
      console.error('Failed to create transaction on backend:', err);
    }
  };

  const handleAddRepository = async (newRepo: Repository) => {
    setRepositories((prev) => [newRepo, ...prev]);
    showToast(`Started tracking repository: ${newRepo.name}`);
    try {
      const resp = await api.createRepository(newRepo);
      if (resp.deployment) {
        setDeployments((prev) => [resp.deployment, ...prev]);
      }
      setSelectedRepoId(newRepo.id);
    } catch (err: any) {
      console.error('Failed to create repository on backend:', err);
    }
  };

  const handleTriggerDeploy = () => {
    if (repositories.length === 0) {
      showToast('No repositories tracked yet. Please track a repository first.', 'warning');
      setIsAddRepoModalOpen(true);
      return;
    }

    const activeRepoName =
      selectedRepoId === 'all'
        ? repositories[0].name
        : repositories.find((r) => r.id === selectedRepoId)?.name || repositories[0].name;

    const newDep: Deployment = {
      id: `dpl-${Math.floor(9000 + Math.random() * 1000)}`,
      repoName: activeRepoName,
      env: 'production',
      status: 'building',
      commitHash: Math.random().toString(36).substring(2, 9),
      commitMsg: 'manual deploy trigger from dashboard control panel',
      author: 'Mohsin Abbas',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      branch: 'main',
      provider: 'Vercel',
      duration: '8s (running)',
      createdAt: 'Just now',
      steps: [
        {
          name: 'Triggering Webhook',
          status: 'passed',
          duration: '1s',
          logs: ['POST /api/v1/deployments 202 Accepted', 'Build job queued #9042'],
        },
        {
          name: 'Running Container Build',
          status: 'running',
          duration: '7s',
          logs: ['pulling node:20-alpine', 'building application bundle...'],
        },
      ],
    };

    setDeployments((prev) => [newDep, ...prev]);
    showToast(`Build Triggered: Dispatched deployment pipeline for ${activeRepoName}`);
  };

  const handleExportCsv = () => {
    const headers = 'ID,Customer,Email,Type,Amount,Status,Date,Method\n';
    const rows = transactions
      .map(
        (t) =>
          `${t.id},"${t.customerName}",${t.email},"${t.type}",${t.amount},${t.status},${t.date},"${t.method}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-report-${Date.now()}.csv`;
    a.click();
    showToast('Export Complete: Transactions CSV report downloaded!');
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read.');
    try {
      await api.markNotificationsAsRead();
    } catch (e) {
      // ignore
    }
  };

  // Filter deployments by selected repo dropdown
  const filteredDeployments =
    selectedRepoId === 'all'
      ? deployments
      : deployments.filter((d) => {
          const r = repositories.find((repo) => repo.id === selectedRepoId);
          return r ? d.repoName === r.name : true;
        });

  return (
    <div className="app-container" data-theme={theme}>
      {/* Sidebar Navigation */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          showToast(`Switched view to ${tab.toUpperCase()}`);
        }}
        systemHealth={systemHealth}
      />

      {/* Main Content View */}
      <div className="main-content">
        {/* Top Navbar */}
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
          notifications={notifications}
          onOpenNotifications={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
          onOpenQuickModal={() => setIsQuickModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          wsStatus={wsStatus}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            showToast(`Navigated to ${tab.toUpperCase()}`);
          }}
        />

        {/* Toast Alert Banner */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--accent-purple)',
              padding: '0.85rem 1.35rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-glow), var(--shadow-md)',
              zIndex: 200,
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Dashboard Body / Router */}
        <main className="dashboard-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div className="welcome-banner">
                <div className="welcome-text">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      <Zap size={12} /> Live Engine Active
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live PostgreSQL Synced</span>
                  </div>
                  <h1>Enterprise Operations Control Center</h1>
                  <p>
                    Monitoring real-time payments, system health telemetry, and cloud revenue analytics.
                  </p>
                </div>

                <div className="banner-actions">
                  <button className="btn-secondary" onClick={() => { loadDatabaseData(); showToast('Metrics data refreshed from DB!'); }}>
                    <RefreshCw size={15} /> Refresh Metrics
                  </button>
                  <button className="btn-primary" onClick={handleExportCsv}>
                    <Download size={15} /> Download Summary
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards Grid */}
              <section className="kpi-grid">
                {kpis.map((kpi) => (
                  <KpiCard key={kpi.id} kpi={kpi} />
                ))}
              </section>

              {/* Charts Row: Financial Area Chart + Revenue Share Donut */}
              <section className="dashboard-row-charts">
                <RevenueChart
                  timeRange={timeRange}
                  onTimeRangeChange={(range) => {
                    setTimeRange(range);
                    showToast(`Timeframe changed to ${range.toUpperCase()}`);
                  }}
                />
                <DistributionChart />
              </section>

              {/* Data Tables Row: Recent Transactions + Live Activity Audit */}
              <section className="dashboard-row-tables">
                <TransactionsTable
                  transactions={transactions}
                  onSelectTransaction={(txn) => setSelectedTxn(txn)}
                  onExportCsv={handleExportCsv}
                />
                <ActivityFeed activities={activities} />
              </section>
            </div>
          )}

          {/* TAB: AI REAL-TIME EMOTION DETECTION CAMERA */}
          {activeTab === 'emotion-camera' && <EmotionDetectionView onShowToast={showToast} />}
          {activeTab === 'task-assistant' && <TaskAssistantView />}

          {/* TAB: PRECIOUS METALS LIVE RATES (HAMARIWEB SCRAPED) */}
          {activeTab === 'metals' && <MetalsView onShowToast={showToast} />}

          {/* TAB 2: MEDIA DOWNLOADER */}
          {activeTab === 'downloader' && <MediaDownloader />}

          {/* TAB 3: DEPLOYMENT TRACKER */}
          {activeTab === 'deployments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                <div className="welcome-text">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                      <Rocket size={12} /> CI/CD Automation
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-repo sync</span>
                  </div>
                  <h1>Repository Deployment Tracker</h1>
                  <p>
                    Track multi-repo CI/CD build pipelines, environment deployments, commit telemetry, and DORA metrics.
                  </p>
                </div>

                <div className="banner-actions">
                  <button className="btn-secondary" onClick={() => setIsAddRepoModalOpen(true)}>
                    <Plus size={15} /> Track New Repo
                  </button>
                  <button className="btn-primary" onClick={handleTriggerDeploy}>
                    <Rocket size={15} /> Trigger Deployment
                  </button>
                </div>
              </div>

              {/* Repository Switcher Header */}
              <RepoSelector
                repositories={repositories}
                selectedRepoId={selectedRepoId}
                onSelectRepo={(id) => setSelectedRepoId(id)}
                onOpenAddModal={() => setIsAddRepoModalOpen(true)}
              />

              {/* DORA DevOps Telemetry Metrics */}
              <DoraMetricsGrid metrics={doraMetrics} />

              {/* Deployment Stream Table & Terminal Log Launcher */}
              <DeploymentList
                deployments={filteredDeployments}
                selectedRepoId={selectedRepoId}
                onSelectDeploymentForLogs={(dep) => setSelectedDeploymentForLogs(dep)}
                onTriggerDeploy={handleTriggerDeploy}
              />
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && <AnalyticsView onShowToast={showToast} />}

          {/* TAB 5: TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onSelectTransaction={(txn) => setSelectedTxn(txn)}
              onOpenQuickModal={() => setIsQuickModalOpen(true)}
              onExportCsv={handleExportCsv}
              onShowToast={showToast}
            />
          )}

          {/* TAB 6: TEAM MEMBERS */}
          {activeTab === 'team' && <TeamView onShowToast={showToast} />}

          {/* TAB 7: SYSTEM HEALTH */}
          {activeTab === 'system' && (
            <SystemView systemHealth={systemHealth} onShowToast={showToast} />
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsView theme={theme} onToggleTheme={toggleTheme} onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <QuickActionModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllRead}
      />

      <TransactionModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        comments={comments}
        onAddComment={handleAddComment}
      />

      <BuildLogsModal
        deployment={selectedDeploymentForLogs}
        onClose={() => setSelectedDeploymentForLogs(null)}
        comments={comments}
        onAddComment={handleAddComment}
      />

      <AddRepoModal
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
        onAddRepo={handleAddRepository}
      />
    </div>
  );
};

export default App;
