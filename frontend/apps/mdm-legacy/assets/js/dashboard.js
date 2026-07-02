import { COMPLIANCE_BY_CLASS, DASHBOARD_SUMMARY, OVERVIEW_STATS, RECENT_AUDIT_LOG, RECENT_VIOLATIONS } from './mock-data.js';
import { initDevicesSection } from './devices.js';
import { initPoliciesSection } from './policies.js';
import { initAuditSection } from './audit.js';
import { requestAuthSession, subscribeAuthSession } from './auth-session.js';

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function truncateHash(hash, chars = 12) {
  return `${hash.slice(0, chars)}…`;
}

function renderOverviewStats(container) {
  container.innerHTML = OVERVIEW_STATS.map((item) => `
    <article class="card card--stat stat-card--dashboard ${item.colorClass}">
      <div class="card__left">
        <div class="card__icon" aria-hidden="true">${item.icon === 'devices' ? '📱' : item.icon === 'online' ? '🟢' : item.icon === 'warning' ? '⚠️' : '🔄'}</div>
        <div>
          <div class="stat-card__label">${item.label}</div>
          <div class="stat-card__value">${item.value}</div>
        </div>
      </div>
      <div class="stat-card__footer">
        <span>${item.trend}</span>
        <span class="trend ${item.trendDir === 'down' ? 'trend--down' : item.trendDir === 'up' ? 'trend--up' : ''}">${item.trendDir === 'down' ? '▼' : item.trendDir === 'up' ? '▲' : '•'}</span>
      </div>
    </article>
  `).join('');
}

function renderComplianceChart(container) {
  if (!window.Chart) {
    container.innerHTML = '<p class="muted">Chart.js failed to load from CDN.</p>';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.height = 260;
  container.innerHTML = '';
  container.appendChild(canvas);

  const labels = COMPLIANCE_BY_CLASS.map((item) => item.label);
  const data = COMPLIANCE_BY_CLASS.map((item) => item.value);

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Compliance %',
        data,
        backgroundColor: 'rgba(6, 214, 160, 0.82)',
        borderRadius: 10,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${context.raw}% compliance`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#9fb0bb' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { min: 0, max: 100, ticks: { color: '#9fb0bb' }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

function renderViolationsTable(container) {
  container.innerHTML = `
    <div class="table-scroll">
      <table class="dashboard-table" aria-label="Recent violations">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Device</th>
            <th>Violation</th>
            <th>Policy</th>
            <th>Timestamp</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${RECENT_VIOLATIONS.map((row) => `
            <tr>
              <td><span class="severity-${row.severity.toLowerCase() === 'high' ? 'high' : row.severity.toLowerCase() === 'med' ? 'med' : 'low'}">${row.severity}</span></td>
              <td>${row.device}</td>
              <td>${row.violationType}</td>
              <td>${row.policyViolated}</td>
              <td>${formatRelativeTime(row.timestamp)}</td>
              <td><span class="status-pill status-pill--${row.status.toLowerCase()}">${row.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAuditLog(container) {
  container.innerHTML = `
    <div class="table-scroll">
      <table class="dashboard-table" aria-label="Recent audit log entries">
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
            <th>SHA-256</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${RECENT_AUDIT_LOG.map((entry) => `
            <tr>
              <td><span class="chip">${entry.eventType}</span></td>
              <td>${entry.description}</td>
              <td><span class="hash-mono" title="${entry.hash}">${truncateHash(entry.hash)}</span></td>
              <td>${formatRelativeTime(entry.timestamp)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHeaderMeta(container) {
  container.innerHTML = `
    <span class="chip">${DASHBOARD_SUMMARY.schoolName}</span>
    <span class="chip">${DASHBOARD_SUMMARY.district}</span>
    <span class="badge badge--online">${DASHBOARD_SUMMARY.verifiedChainLabel}</span>
  `;
}

function init() {
  const statsContainer = document.querySelector('[data-overview-stats]');
  const chartContainer = document.querySelector('[data-compliance-chart]');
  const violationsContainer = document.querySelector('[data-recent-violations]');
  const auditContainer = document.querySelector('[data-recent-audit]');
  const headerMeta = document.querySelector('[data-dashboard-meta]');

  if (chartContainer && !window.Chart) {
    window.addEventListener('load', init, { once: true });
    return;
  }

  if (headerMeta) renderHeaderMeta(headerMeta);
  if (statsContainer) renderOverviewStats(statsContainer);
  if (chartContainer) renderComplianceChart(chartContainer);
  if (violationsContainer) renderViolationsTable(violationsContainer);
  if (auditContainer) renderAuditLog(auditContainer);
  initDevicesSection();
  initPoliciesSection();
  initAuditSection();
}

async function initAuthenticatedDashboard() {
  const session = await requestAuthSession();
  if (!session || !session.accessToken || !session.role) {
    window.location.href = 'login.html';
    return;
  }

  subscribeAuthSession((message) => {
    if (message.type === 'session-cleared' || message.type === 'session-invalid') {
      window.location.href = 'login.html';
    }
  });

  init();
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthenticatedDashboard().catch(() => {
    window.location.href = 'login.html';
  });
});
