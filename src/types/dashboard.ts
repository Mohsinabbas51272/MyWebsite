export type TimeRange = '7d' | '30d' | '90d' | '1y';

/* --- COMMENT THREAD TYPES --- */
export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
  entityId: string;
  entityType: 'transaction' | 'deployment';
}

export interface KpiItem {
  id: string;
  title: string;
  value: string;
  change: number; // percentage e.g. +12.5 or -3.2
  period: string;
  iconName: 'dollar' | 'users' | 'shopping-cart' | 'activity';
  trend: 'up' | 'down';
  sparklineData: number[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface Transaction {
  id: string;
  customerName: string;
  customerAvatar: string;
  email: string;
  type: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
  method: string;
}

export interface ActivityEvent {
  id: string;
  user: string;
  avatar: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'security' | 'transaction' | 'system' | 'user';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  diskSpace: number;
  apiLatency: number;
  uptime: string;
  status: 'healthy' | 'warning' | 'critical';
}

/* --- DEPLOYMENT TRACKER TYPES --- */

export type EnvironmentType = 'production' | 'staging' | 'preview';
export type DeploymentStatus = 'success' | 'building' | 'failed' | 'queued' | 'canceled';

export interface BuildLogStep {
  name: string;
  status: 'passed' | 'failed' | 'running';
  duration: string;
  logs: string[];
}

export interface Deployment {
  id: string;
  repoName: string;
  env: EnvironmentType;
  status: DeploymentStatus;
  commitHash: string;
  commitMsg: string;
  author: string;
  authorAvatar: string;
  branch: string;
  provider: 'Vercel' | 'AWS ECS' | 'Netlify' | 'GitHub Actions' | 'Docker Hub';
  duration: string;
  createdAt: string;
  previewUrl?: string;
  steps: BuildLogStep[];
}

export interface Repository {
  id: string;
  name: string;
  url: string;
  provider: string;
  defaultBranch: string;
  totalDeployments: number;
  successRate: number;
  lastDeployed: string;
}

export interface DoraMetrics {
  deploymentFrequency: string;
  changeFailureRate: string;
  mttr: string;
  leadTime: string;
}

/* --- MEDIA DOWNLOADER YT-DLP TYPES --- */

export interface PresetFormat {
  formatId: string;
  ext: string;
  resolution: string;
  note: string;
  filesizeFormatted: string;
  isAudioOnly: boolean;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  uploader: string;
  viewCount: string;
  webpageUrl: string;
  extractor: string;
  presets: PresetFormat[];
}

export interface DownloadedMediaRecord {
  id: string;
  title: string;
  thumbnail: string;
  resolution: string;
  type: string;
  date: string;
  url: string;
}

/* --- TEAM TYPES --- */

export type TeamRole = 'Owner' | 'Admin' | 'DevOps Lead' | 'Fullstack Engineer' | 'Product Designer' | 'Security Analyst';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  department: string;
  avatar: string;
  status: 'active' | 'away' | 'offline';
  twoFactorEnabled: boolean;
  lastActive: string;
  joinedDate: string;
}

/* --- SYSTEM & INFRASTRUCTURE TYPES --- */

export interface MicroserviceStatus {
  id: string;
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'outage';
  uptime: string;
  latency: number;
  region: string;
  version: string;
}

/* --- SETTINGS TYPES --- */

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  permissions: 'full' | 'read_only' | 'restricted';
}

export interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'paused';
  createdAt: string;
}

/* --- PRECIOUS METALS TYPES (HAMARIWEB SCRAPING) --- */

export interface GoldKaratRate {
  karat: string;
  tola: number;
  tenGram: number;
  gram: number;
  ounce: number;
  purity: string;
}

export interface GoldHistoryPoint {
  date: string;
  tola24K: number;
  tola22K: number;
}

export interface SilverCityRate {
  city: string;
  tola: number;
  tenGram: number;
  gram: number;
}

export interface SilverHistoryPoint {
  date: string;
  tola: number;
  tenGram: number;
}

export interface MetalsDataResponse {
  status: string;
  lastUpdated: string;
  scrapedAt: string;
  currency: string;
  fromCache?: boolean;
  cacheAgeSeconds?: number;
  gold: {
    title: string;
    current24KTola: number;
    current22KTola: number;
    current24K10Gram: number;
    current24KGram: number;
    ounceUsd: number;
    change24hPkr: number;
    change24hPct: number;
    karats: GoldKaratRate[];
    history: GoldHistoryPoint[];
    sourceUrl: string;
  };
  silver: {
    title: string;
    currentTola: number;
    current10Gram: number;
    currentGram: number;
    currentOunce: number;
    change24hPkr: number;
    change24hPct: number;
    cities: SilverCityRate[];
    history: SilverHistoryPoint[];
    sourceUrl: string;
  };
}

