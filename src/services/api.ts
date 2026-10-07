import type {
  Transaction,
  Repository,
  Deployment,
  TeamMember,
  ActivityEvent,
  NotificationItem,
  ApiKeyItem,
  WebhookItem,
  Comment,
  KpiItem,
  VideoMetadata,
  DownloadedMediaRecord,
} from '../types/dashboard';
import type { KanbanTask } from '../components/KanbanBoard';

const API_BASE = '/api';

// Generic Fetch Wrapper
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // --- HEALTH & STATUS ---
  getHealth: () => request<any>('/health'),

  // --- AI SERVICES ---
  getAiStatus: () => request<{
    gemini: { configured: boolean; keyMasked: string | null; supportedModels: string[] };
    ollama: { online: boolean; baseUrl: string; models: string[] };
    defaultProvider: 'gemini' | 'ollama' | 'none';
  }>('/ai/status'),

  aiChat: (payload: {
    prompt?: string;
    messages?: Array<{ role: string; content?: string; text?: string }>;
    provider?: 'gemini' | 'ollama';
    model?: string;
    system?: string;
    apiKey?: string;
  }) => request<{ text: string; model: string; provider: string }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  generateTasks: (text: string, apiKey?: string, provider?: 'gemini' | 'ollama') =>
    request<{ success: boolean; tasks: any[] }>('/ai/generate-tasks', {
      method: 'POST',
      body: JSON.stringify({ text, apiKey, provider }),
    }),

  // --- KANBAN TASKS (PostgreSQL) ---
  getTasks: () => request<KanbanTask[]>('/tasks'),
  createTask: (task: Partial<KanbanTask>) =>
    request<KanbanTask>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  updateTask: (id: string, updates: Partial<KanbanTask>) =>
    request<KanbanTask>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteTask: (id: string) =>
    request<{ success: boolean; id: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  // --- TRANSACTIONS & KPI ANALYTICS (PostgreSQL) ---
  getTransactions: () => request<Transaction[]>('/transactions'),
  createTransaction: (txn: Partial<Transaction>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(txn),
    }),
  deleteTransaction: (id: string) =>
    request<{ success: boolean; id: string }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),
  getKpis: () => request<KpiItem[]>('/analytics/kpi'),
  getRevenueChart: (range: string = '7d') => request<any[]>(`/analytics/revenue?range=${range}`),
  getDistribution: () => request<any[]>('/analytics/distribution'),
  getFunnel: () => request<any[]>('/analytics/funnel'),
  getTraffic: () => request<{ sources: any[]; hourly: any[] }>('/analytics/traffic'),
  getSystemHealth: () => request<any>('/system/health'),
  getMicroservices: () => request<any[]>('/system/services'),
  getDoraMetrics: () => request<any>('/dora-metrics'),

  // --- REPOSITORIES & DEPLOYMENTS (PostgreSQL) ---
  getRepositories: () => request<Repository[]>('/repositories'),
  createRepository: (repo: Partial<Repository>) =>
    request<{ repository: Repository; deployment: Deployment }>('/repositories', {
      method: 'POST',
      body: JSON.stringify(repo),
    }),
  getDeployments: () => request<Deployment[]>('/deployments'),

  // --- TEAM MEMBERS (PostgreSQL) ---
  getTeam: () => request<TeamMember[]>('/team'),
  createTeamMember: (member: Partial<TeamMember>) =>
    request<TeamMember>('/team', {
      method: 'POST',
      body: JSON.stringify(member),
    }),
  deleteTeamMember: (id: string) =>
    request<{ success: boolean; id: string }>(`/team/${id}`, {
      method: 'DELETE',
    }),

  // --- ACTIVITIES & NOTIFICATIONS (PostgreSQL) ---
  getActivities: () => request<ActivityEvent[]>('/activities'),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  markNotificationsAsRead: () =>
    request<{ success: boolean }>('/notifications/read-all', {
      method: 'PATCH',
    }),

  // --- SETTINGS (API Keys & Webhooks) ---
  getApiKeys: () => request<ApiKeyItem[]>('/settings/apikeys'),
  createApiKey: (name: string, permissions: string) =>
    request<ApiKeyItem>('/settings/apikeys', {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    }),
  deleteApiKey: (id: string) =>
    request<{ success: boolean; id: string }>(`/settings/apikeys/${id}`, {
      method: 'DELETE',
    }),

  getWebhooks: () => request<WebhookItem[]>('/settings/webhooks'),
  createWebhook: (url: string, events: string[]) =>
    request<WebhookItem>('/settings/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    }),
  deleteWebhook: (id: string) =>
    request<{ success: boolean; id: string }>(`/settings/webhooks/${id}`, {
      method: 'DELETE',
    }),

  // --- COMMENTS (PostgreSQL) ---
  getComments: (entityId?: string) =>
    request<Comment[]>(`/comments${entityId ? `?entityId=${entityId}` : ''}`),
  createComment: (comment: {
    author?: string;
    text: string;
    entityId: string;
    entityType: 'transaction' | 'deployment';
  }) =>
    request<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    }),

  // --- PRECIOUS METALS & CURRENCY ---
  getMetals: (forceRefresh = false) =>
    request<any>(`/metals${forceRefresh ? '?refresh=true' : ''}`),
  refreshMetals: () =>
    request<any>('/metals/refresh', { method: 'POST' }),
  getCurrencyRates: () => request<{ rates: Record<string, number> }>('/currency/rates'),

  // --- MEDIA DOWNLOADER & CONVERTER ---
  fetchVideoInfo: (url: string) =>
    request<VideoMetadata>('/video-info', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  startMediaDownload: (payload: {
    url: string;
    formatId: string;
    type: string;
    title: string;
    thumbnail?: string;
    resolution?: string;
  }) =>
    request<{ success: boolean; jobId: string; filename: string; status: string }>(
      '/download/start',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getMediaDownloadProgress: (jobId: string) =>
    request<{
      id: string;
      status: 'starting' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';
      progress: number;
      speed: string;
      eta: string;
      downloadedSize: string;
      totalSize: string;
      stage: string;
      error: string | null;
      filename: string;
      fileSizeBytes: number;
      type: 'video' | 'audio';
      downloadUrl: string;
      previewUrl: string;
    }>(`/download/progress/${jobId}`),
  cancelMediaDownload: (jobId: string) =>
    request<{ success: boolean; message?: string }>(`/download/cancel/${jobId}`, {
      method: 'POST',
    }),
  getMediaHistory: () => request<DownloadedMediaRecord[]>('/media/history'),
  saveMediaHistory: (item: Partial<DownloadedMediaRecord>) =>
    request<DownloadedMediaRecord>('/media/history', {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  deleteMediaHistory: (id?: string) =>
    request<{ success: boolean }>(`/media/history${id ? `/${id}` : ''}`, {
      method: 'DELETE',
    }),
};
