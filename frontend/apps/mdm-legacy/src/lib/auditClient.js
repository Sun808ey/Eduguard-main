import { RECENT_AUDIT_LOG } from '../data/mockData.js';

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

export function createPseudoHash(seed) {
  const timestampFragment = Date.now().toString(16);
  const randomFragment = Math.random().toString(16).slice(2, 18);
  const base = `${seed}:${timestampFragment}:${randomFragment}`;
  let hash = '';

  for (let index = 0; index < base.length; index += 1) {
    hash += base.charCodeAt(index).toString(16).padStart(2, '0');
  }

  return hash.slice(0, 40).padEnd(40, '0');
}

export function truncateHash(hash, chars = 12) {
  if (!hash || typeof hash !== 'string') return '';
  return `${hash.slice(0, chars)}…`;
}

function cloneEntries() {
  return RECENT_AUDIT_LOG.map((entry) => ({ ...entry }));
}

export async function loadAuditEntries() {
  try {
    const payload = await fetchJsonFromApi('/audit-entries', {
      headers: { Accept: 'application/json' },
    });

    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.entries)) return payload.entries;
  } catch (error) {
    console.warn('Falling back to seeded audit entries.', error);
  }

  return cloneEntries();
}

export async function appendAuditEntry(entry) {
  try {
    return await fetchJsonFromApi('/audit-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch (error) {
    console.warn('Audit entry persistence failed.', error);
    return null;
  }
}

export async function fetchAuditVerification() {
  try {
    const payload = await fetchJsonFromApi('/audit-entries/verify', {
      headers: { Accept: 'application/json' },
    });

    if (payload && typeof payload.ok === 'boolean' && typeof payload.message === 'string') {
      return payload;
    }
  } catch (error) {
    console.warn('Falling back to client-side audit verification.', error);
  }

  const entries = await loadAuditEntries();
  return verifyChain(entries);
}

export function verifyChain(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, message: 'no entries' };
  }

  const seen = new Set();
  let lastTs = Number.POSITIVE_INFINITY;

  for (const entry of entries) {
    const ts = new Date(entry.timestamp).getTime();
    if (!entry.hash || typeof entry.hash !== 'string') return { ok: false, message: 'missing hash' };
    if (seen.has(entry.hash)) return { ok: false, message: 'duplicate hash detected' };
    seen.add(entry.hash);
    if (ts > lastTs) return { ok: false, message: 'timestamps out of order' };
    lastTs = ts;
  }

  return { ok: true, message: 'no duplicates; timestamps descending' };
}
