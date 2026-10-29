/**
 * Cloudflare D1 SQL Client Module (Pure D1 Database Operations)
 */

import { Project } from '../types';

export const CF_WORKER_URL = 'https://hello-world-sparkling-meadow-630c.matchboxdevelopment.workers.dev';

export interface SiteImageSettings {
  heroImage?: string;
  aboutImage?: string;
  zyloImage?: string;
  trufinImage?: string;
  krigstudioImage?: string;
  marqueeImages?: Array<{ src: string; title: string; link?: string }>;
  updatedAt?: string;
}

function getApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined;
  const baseUrl = metaEnv || CF_WORKER_URL;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return fetch(endpoint, options);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Try relative endpoint first (Local Express Server / Reverse Proxy)
  try {
    const relRes = await fetch(cleanEndpoint, options);
    const contentType = relRes.headers.get('content-type') || '';
    if (relRes.ok && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
      return relRes;
    }
  } catch {}

  // 2. Fallback to primary Cloudflare Worker URL
  const targetUrl = getApiUrl(cleanEndpoint);
  try {
    const workerRes = await fetch(targetUrl, options);
    const contentType = workerRes.headers.get('content-type') || '';
    if (workerRes.ok && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
      return workerRes;
    }
  } catch (err) {
    console.debug(`[apiFetch] Primary worker fetch failed for ${targetUrl}:`, err);
  }

  return fetch(targetUrl, options);
}

/**
 * Test D1 Connection on Boot
 */
export async function testConnection(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/health');
    return res.ok;
  } catch {
    return true;
  }
}

if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

/**
 * Fetch Portfolio Projects from Cloudflare D1 SQL DB
 */
export async function fetchProjectsFromFirestore(): Promise<Project[]> {
  try {
    const res = await apiFetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        return data.projects as Project[];
      }
    }
  } catch (error) {
    console.debug('Error fetching projects from D1 SQLite:', error);
  }
  return [];
}

/**
 * Save / Update a Project in Cloudflare D1 SQL DB
 */
export async function saveProjectToFirestore(project: Partial<Project> & { id: string }): Promise<void> {
  try {
    await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
  } catch (err) {
    console.debug('Error saving project to D1 SQLite:', err);
  }
}

/**
 * Delete a Project from Cloudflare D1 SQL DB
 */
export async function deleteProjectFromFirestore(projectId: string): Promise<void> {
  try {
    await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' });
  } catch (err) {
    console.debug('Error deleting project from D1 SQLite:', err);
  }
}

/**
 * Fetch Global Site Settings / Image Overrides from Cloudflare D1 SQL DB
 */
export async function fetchSiteSettings(): Promise<SiteImageSettings | null> {
  try {
    const res = await apiFetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) return data.settings as SiteImageSettings;
    }
  } catch (error) {
    console.debug('Error fetching site settings from D1 SQLite:', error);
  }
  return null;
}

/**
 * Save / Update Global Site Settings / Images in Cloudflare D1 SQL DB
 */
export async function saveSiteSettings(settings: Partial<SiteImageSettings>): Promise<void> {
  try {
    await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch (err) {
    console.debug('Error saving site settings to D1 SQLite:', err);
  }
}
