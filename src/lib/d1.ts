/**
 * Cloudflare D1 SQL Database Connector & Schema Definitions
 * Manages connections, schema initialization, and helper queries for D1 SQLite
 */

export const CF_WORKER_URL = 'https://hello-world-sparkling-meadow-630c.matchboxdevelopment.workers.dev';

export interface VisitorLog {
  id: string;
  visitorId: string;
  path: string;
  deviceType: string;
  browser: string;
  referrer: string;
  dateStr: string;
  timestamp: string;
}

export interface LifetimeStats {
  id: string;
  archivedVisits: number;
  totalLifetimeVisits: number;
  lastPrunedAt?: string;
  lastPrunedCount?: number;
  updatedAt?: string;
}

export interface D1MetricsSummary {
  totalVisits: number;
  totalLifetimeVisits: number;
  archivedVisits: number;
  totalUniqueVisitors: number;
  uniqueVisitors: number;
  traffic30Min: number;
  traffic1Day: number;
  traffic30Days: number;
  traffic90Days: number;
  topPages: Array<{ path: string; visits: number; percentage: number }>;
  referrers: Record<string, number>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  dailyTrend: Array<{ date: string; visits: number; unique: number }>;
  lastPrunedCount: number;
  lastPrunedAt?: string;
  databaseEngine: string;
}

/**
 * Cloudflare D1 SQL Schema Definitions
 */
export const D1_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS visitor_logs (
  id TEXT PRIMARY KEY,
  visitorId TEXT NOT NULL,
  path TEXT NOT NULL,
  deviceType TEXT DEFAULT 'desktop',
  browser TEXT DEFAULT 'Unknown',
  referrer TEXT DEFAULT 'Direct',
  dateStr TEXT,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lifetime_stats (
  id TEXT PRIMARY KEY,
  archivedVisits INTEGER DEFAULT 0,
  totalLifetimeVisits INTEGER DEFAULT 0,
  lastPrunedAt TEXT,
  lastPrunedCount INTEGER DEFAULT 0,
  updatedAt TEXT
);
`;

/**
 * Helper to safely fetch JSON from Cloudflare Worker URL or fallback local API
 */
async function fetchD1Api<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const urls = [
    `${CF_WORKER_URL}${endpoint}`,
    endpoint
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
    } catch {
      // ignore and try next fallback endpoint
    }
  }
  return null;
}

/**
 * Initialize connection status to Cloudflare D1 Database
 */
export async function initD1Database(): Promise<{ ok: boolean; database: string }> {
  const data = await fetchD1Api<{ status: string; database: string }>('/api/health');
  if (data) {
    return { ok: true, database: data.database || 'Cloudflare Worker D1 SQLite' };
  }
  return { ok: true, database: 'Cloudflare D1 SQLite Database' };
}

/**
 * Log a new visitor pageview entry into Cloudflare D1 SQL database
 */
export async function logVisitorToD1(params: {
  visitorId?: string;
  path: string;
  deviceType?: string;
  browser?: string;
  referrer?: string;
}): Promise<{ ok: boolean; totalVisits?: number }> {
  const data = await fetchD1Api<{ ok: boolean; totalVisits?: number }>('/api/analytics/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: params.visitorId,
      path: params.path || '/',
      deviceType: params.deviceType,
      browser: params.browser,
      referrer: params.referrer || 'Direct',
    }),
  });

  if (data && data.ok) {
    return { ok: true, totalVisits: data.totalVisits };
  }
  return { ok: true };
}

/**
 * Fetch Lifetime Statistics from Cloudflare D1
 */
export async function fetchD1LifetimeStats(): Promise<LifetimeStats> {
  const data = await fetchD1Api<{
    archivedVisits?: number;
    totalLifetimeVisits?: number;
    totalVisits?: number;
    lastPrunedAt?: string;
    lastPrunedCount?: number;
  }>('/api/analytics/metrics');

  if (data) {
    return {
      id: 'lifetime',
      archivedVisits: data.archivedVisits || 0,
      totalLifetimeVisits: data.totalLifetimeVisits || data.totalVisits || 0,
      lastPrunedAt: data.lastPrunedAt,
      lastPrunedCount: data.lastPrunedCount,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: 'lifetime',
    archivedVisits: 0,
    totalLifetimeVisits: 0,
  };
}

/**
 * Fetch Recent Visitor Activity Logs from Cloudflare D1
 */
export async function fetchD1VisitorLogs(limit = 25): Promise<VisitorLog[]> {
  const data = await fetchD1Api<{ ok: boolean; logs?: VisitorLog[] }>(`/api/analytics/recent?limit=${limit}`);
  if (data && data.logs) {
    return data.logs;
  }
  return [];
}

/**
 * Prune visitor_logs older than 10 days in Cloudflare D1 while maintaining lifetime_stats
 */
export async function pruneD1Logs(): Promise<{ deletedCount: number; newTotalLifetimeVisits: number }> {
  const data = await fetchD1Api<{ deletedCount?: number; newTotalLifetimeVisits?: number }>('/api/analytics/prune', { method: 'POST' });
  if (data) {
    return {
      deletedCount: data.deletedCount || 0,
      newTotalLifetimeVisits: data.newTotalLifetimeVisits || 0,
    };
  }
  return { deletedCount: 0, newTotalLifetimeVisits: 0 };
}
