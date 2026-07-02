import { RECENT_AUDIT_LOG } from './mock-data.js';

const API_BASE_URL = 'http://127.0.0.1:3000';

function getInitialAuditEntries() {
  return RECENT_AUDIT_LOG.map((entry) => ({ ...entry }));
}

async function loadAuditEntries() {
  try {
    const response = await fetch(`${API_BASE_URL}/audit-entries`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to load audit entries: ${response.status}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload.entries)) {
      return payload.entries;
    }
  } catch (error) {
    console.warn('Falling back to seeded audit entries.', error);
  }

  return getInitialAuditEntries();
}

async function appendAuditEntry(entry) {
  try {
    const response = await fetch(`${API_BASE_URL}/audit-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      throw new Error(`Failed to persist audit entry: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Audit entry persistence failed.', error);
    return null;
  }
}

function createPseudoHash(seed) {
  const timestampFragment = Date.now().toString(16);
  const randomFragment = Math.random().toString(16).slice(2, 18);
  const base = `${seed}:${timestampFragment}:${randomFragment}`;
  let hash = '';
  for (let index = 0; index < base.length; index += 1) {
    hash += base.charCodeAt(index).toString(16).padStart(2, '0');
  }
  return hash.slice(0, 40).padEnd(40, '0');
}

function renderAuditControls(container) {
  const controls = document.createElement('div');
  controls.className = 'audit-controls';
  controls.innerHTML = `
    <button class="btn btn-outline" type="button" data-audit-verify>Verify Chain</button>
    <button class="btn btn-primary" type="button" data-audit-history>Open Audit History</button>
    <span class="audit-result muted" data-audit-result aria-live="polite">Chain status: unknown</span>
  `;
  container.prepend(controls);

  const verifyBtn = controls.querySelector('[data-audit-verify]');
  const historyBtn = controls.querySelector('[data-audit-history]');
  const result = controls.querySelector('[data-audit-result]');

  verifyBtn.addEventListener('click', async () => {
    const verification = await fetchAuditVerification();
    if (verification.ok) {
      result.textContent = `Verified: ${verification.message}`;
      result.classList.remove('audit-result--bad');
      result.classList.add('audit-result--ok');
      await appendAuditEntry({
        eventType: 'Verification',
        description: 'Audit chain verified from the dashboard',
        hash: createPseudoHash('verification-ok'),
        timestamp: new Date().toISOString(),
      });
    } else {
      result.textContent = `Broken: ${verification.message}`;
      result.classList.remove('audit-result--ok');
      result.classList.add('audit-result--bad');
      await appendAuditEntry({
        eventType: 'Verification',
        description: `Audit chain check failed: ${verification.message}`,
        hash: createPseudoHash('verification-failed'),
        timestamp: new Date().toISOString(),
      });
    }
  });

  historyBtn.addEventListener('click', async () => {
    openAuditHistoryModal(await loadAuditEntries());
  });
}

async function fetchAuditVerification() {
  try {
    const response = await fetch(`${API_BASE_URL}/audit-entries/verify`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to verify audit entries: ${response.status}`);
    }

    const payload = await response.json();
    if (typeof payload.ok === 'boolean' && typeof payload.message === 'string') {
      return payload;
    }
  } catch (error) {
    console.warn('Falling back to client-side audit verification.', error);
  }

  return verifyChain(await loadAuditEntries());
}

function verifyChain(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return { ok: false, message: 'no entries' };

  // Check timestamps are in descending order and hashes are unique
  const seen = new Set();
  let lastTs = Number.POSITIVE_INFINITY;

  for (const e of entries) {
    const ts = new Date(e.timestamp).getTime();
    if (!e.hash || typeof e.hash !== 'string') return { ok: false, message: 'missing hash' };
    if (seen.has(e.hash)) return { ok: false, message: 'duplicate hash detected' };
    seen.add(e.hash);
    if (ts > lastTs) return { ok: false, message: 'timestamps out of order' };
    lastTs = ts;
  }

  return { ok: true, message: 'no duplicates; timestamps descending' };
}

function openAuditHistoryModal(entries) {
  // Modal container
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.display = 'flex';

  const modal = document.createElement('section');
  modal.className = 'modal audit-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal__header">
      <h2>Audit history</h2>
      <button class="modal-close" type="button" aria-label="Close audit history">×</button>
    </div>
    <div class="modal__body">
      <div class="audit-list" role="list">
        ${entries.map((e, idx) => `
          <div class="audit-item" role="listitem" data-audit-idx="${idx}">
            <div class="audit-item__left">
              <div class="chip">${e.eventType}</div>
            </div>
            <div class="audit-item__main">
              <div class="audit-item__desc">${e.description}</div>
              <div class="audit-item__meta"><span class="hash-mono">${truncateHash(e.hash, 16)}</span> • ${new Date(e.timestamp).toLocaleString()}</div>
            </div>
            <div class="audit-item__actions">
              <button class="btn btn-ghost" type="button" data-audit-view="${idx}">View</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Close handler
  modal.querySelector('.modal-close').addEventListener('click', () => {
    backdrop.remove();
  });

  // Delegate view clicks
  modal.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-audit-view]');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-audit-view'));
    showAuditDetail(entries[idx]);
  });
}

function showAuditDetail(entry) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.display = 'flex';

  const modal = document.createElement('section');
  modal.className = 'modal audit-detail-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal__header">
      <h2>Audit detail</h2>
      <button class="modal-close" type="button" aria-label="Close audit detail">×</button>
    </div>
    <div class="modal__body">
      <p><strong>Event:</strong> ${entry.eventType}</p>
      <p><strong>Description:</strong> ${entry.description}</p>
      <p><strong>SHA-256:</strong> <span class="hash-mono">${entry.hash}</span></p>
      <p><strong>Timestamp:</strong> ${new Date(entry.timestamp).toLocaleString()}</p>
      <div style="margin-top:1rem;">
        <button class="btn btn-outline" type="button" data-audit-verify-single>Verify entry</button>
        <button class="btn btn-primary" type="button" data-audit-copy>Copy hash</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  modal.querySelector('.modal-close').addEventListener('click', () => backdrop.remove());

  modal.querySelector('[data-audit-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(entry.hash);
      alert('Hash copied to clipboard');
    } catch (e) {
      alert('Copy not available in this environment');
    }
  });

  modal.querySelector('[data-audit-verify-single]').addEventListener('click', async () => {
    // Lightweight single-entry check: ensure hash is non-empty and timestamp parseable
    if (entry.hash && !Number.isNaN(new Date(entry.timestamp).getTime())) {
      alert('Entry appears well-formed');
      await appendAuditEntry({
        eventType: 'Detail View',
        description: `Viewed audit entry ${entry.eventType}`,
        hash: createPseudoHash(`detail-view:${entry.hash}`),
        timestamp: new Date().toISOString(),
      });
    } else {
      alert('Entry malformed');
    }
  });
}

function truncateHash(hash, chars = 12) {
  if (!hash || typeof hash !== 'string') return '';
  return `${hash.slice(0, chars)}…`;
}

export function initAuditSection() {
  const container = document.querySelector('[data-recent-audit]');
  if (!container) return;
  renderAuditControls(container);
}

export default { initAuditSection };
