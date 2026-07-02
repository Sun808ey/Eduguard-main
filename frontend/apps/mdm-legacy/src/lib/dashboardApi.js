import {
  BLOCKED_APPS,
  COMPLIANCE_BY_CLASS,
  DASHBOARD_SUMMARY,
  DEVICES,
  OVERVIEW_STATS,
  POLICIES,
  RECENT_AUDIT_LOG,
  RECENT_VIOLATIONS,
  WHITELISTED_APPS,
} from '../data/mockData.js';

const DEFAULT_API_BASE_URLS = ['http://127.0.0.1:5000', 'http://127.0.0.1:3000'];

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
}

function getApiBaseUrls() {
  const configuredBaseUrl = normalizeBaseUrl(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : '');
  return [configuredBaseUrl, ...DEFAULT_API_BASE_URLS].filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

async function fetchJsonFromApi(path, init) {
  for (const baseUrl of getApiBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`API request failed for ${baseUrl}${path}.`, error);
    }
  }

  return null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function loadDevices() {
  const payload = await fetchJsonFromApi('/api/devices', { headers: { Accept: 'application/json' } });
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.devices)) return payload.devices;
  return clone(DEVICES);
}

export async function loadPolicies() {
  const payload = await fetchJsonFromApi('/api/policies', { headers: { Accept: 'application/json' } });
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.policies)) return payload.policies;
  return clone(POLICIES);
}

export async function loadApps() {
  const payload = await fetchJsonFromApi('/api/apps', { headers: { Accept: 'application/json' } });
  if (payload && Array.isArray(payload.whitelistedApps) && Array.isArray(payload.blockedApps)) {
    return payload;
  }
  return {
    whitelistedApps: clone(WHITELISTED_APPS),
    blockedApps: clone(BLOCKED_APPS),
  };
}

export async function loadViolations() {
  const payload = await fetchJsonFromApi('/api/violations', { headers: { Accept: 'application/json' } });
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.violations)) return payload.violations;
  return clone(RECENT_VIOLATIONS);
}

export async function loadReportsSnapshot() {
  const payload = await fetchJsonFromApi('/api/reports', { headers: { Accept: 'application/json' } });
  if (payload && Array.isArray(payload.overviewStats) && Array.isArray(payload.complianceByClass)) {
    return payload;
  }

  return {
    overviewStats: clone(OVERVIEW_STATS),
    complianceByClass: clone(COMPLIANCE_BY_CLASS),
    summary: clone(DASHBOARD_SUMMARY),
  };
}

export async function loadSettingsSnapshot() {
  const payload = await fetchJsonFromApi('/api/settings', { headers: { Accept: 'application/json' } });
  if (payload && Array.isArray(payload.settings)) return payload.settings;
  return [
    { label: 'LAN server mode', value: 'Enabled' },
    { label: 'API base URL', value: 'VITE_API_BASE_URL' },
    { label: 'Dashboard mode', value: 'Vercel-hosted frontend' },
    { label: 'Audit storage', value: 'Seeded in Phase 1' },
  ];
}
