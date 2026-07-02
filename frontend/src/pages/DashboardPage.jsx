import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Chart from 'chart.js/auto';
import {
  COMPLIANCE_BY_CLASS,
  DASHBOARD_SUMMARY,
  DEVICE_CLASS_OPTIONS,
  DEVICE_STATUS_OPTIONS,
  DEVICES,
  OVERVIEW_STATS,
  POLICIES,
  POLICY_TYPES,
  RECENT_AUDIT_LOG,
  RECENT_VIOLATIONS,
} from '../data/mockData.js';
import { appendAuditEntry, createPseudoHash, fetchAuditVerification, loadAuditEntries, truncateHash } from '../lib/auditClient.js';
import { Badge, Chip, ModalShell } from '../components/ui.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const COMPLIANCE_FILTERS = ['All Compliance', 'Compliant', 'Pending', 'Violation'];

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getSeverityClass(compliance) {
  if (compliance === 'Violation') return 'severity-high';
  if (compliance === 'Pending') return 'severity-med';
  return 'severity-low';
}

function getTrendIcon(direction) {
  if (direction === 'down') return '▼';
  if (direction === 'up') return '▲';
  return '•';
}

function StatCards() {
  return (
    <div className="overview-stat-grid">
      {OVERVIEW_STATS.map((item) => (
        <article className={`card card--stat stat-card--dashboard ${item.colorClass}`} key={item.label}>
          <div className="card__left">
            <div className="card__icon" aria-hidden="true">
              {item.icon === 'devices' ? '📱' : item.icon === 'online' ? '🟢' : item.icon === 'warning' ? '⚠️' : '🔄'}
            </div>
            <div>
              <div className="stat-card__label">{item.label}</div>
              <div className="stat-card__value">{item.value}</div>
            </div>
          </div>
          <div className="stat-card__footer">
            <span>{item.trend}</span>
            <span className={`trend ${item.trendDir === 'down' ? 'trend--down' : item.trendDir === 'up' ? 'trend--up' : ''}`}>
              {getTrendIcon(item.trendDir)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function ComplianceChart() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (!canvasRef.current) return undefined;

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: COMPLIANCE_BY_CLASS.map((item) => item.label),
        datasets: [
          {
            label: 'Compliance %',
            data: COMPLIANCE_BY_CLASS.map((item) => item.value),
            backgroundColor: 'rgba(6, 214, 160, 0.82)',
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
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
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: '#9fb0bb' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { min: 0, max: 100, ticks: { color: '#9fb0bb' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    });

    return () => chart.destroy();
  }, []);

  return (
    <div className="chart-wrap" aria-label="Class compliance bar chart">
      <canvas ref={canvasRef} height={260} />
    </div>
  );
}

function ViolationsTable() {
  return (
    <div className="table-scroll">
      <table className="dashboard-table" aria-label="Recent violations">
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
          {RECENT_VIOLATIONS.map((row) => (
            <tr key={`${row.device}-${row.timestamp}`}>
              <td><span className={`severity-${row.severity.toLowerCase() === 'high' ? 'high' : row.severity.toLowerCase() === 'med' ? 'med' : 'low'}`}>{row.severity}</span></td>
              <td>{row.device}</td>
              <td>{row.violationType}</td>
              <td>{row.policyViolated}</td>
              <td>{formatRelativeTime(row.timestamp)}</td>
              <td><span className={`status-pill status-pill--${row.status.toLowerCase()}`}>{row.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows }) {
  return (
    <div className="table-scroll">
      <table className="dashboard-table" aria-label="Recent audit log entries">
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
            <th>SHA-256</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={`${entry.hash}-${entry.timestamp}`}>
              <td><span className="chip">{entry.eventType}</span></td>
              <td>{entry.description}</td>
              <td><span className="hash-mono" title={entry.hash}>{truncateHash(entry.hash)}</span></td>
              <td>{formatRelativeTime(entry.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyCard({ policy, expanded, onToggle }) {
  return (
    <article className={`policy-card ${expanded ? 'policy-card--expanded' : ''}`} data-policy-id={policy.id}>
      <button className="policy-card__toggle" type="button" aria-expanded={expanded ? 'true' : 'false'} onClick={onToggle}>
        <div className="policy-card__header">
          <div>
            <h3>{policy.title}</h3>
            <p>{policy.summary}</p>
          </div>
          <span className={`status-pill status-pill--${policy.status.toLowerCase()}`}>{policy.status}</span>
        </div>
        <div className="policy-card__meta">
          <Chip>{policy.scope}</Chip>
          <Chip>{policy.type}</Chip>
          <span className="encryption-badge">{policy.encryption}</span>
        </div>
      </button>
      <div className="policy-card__details" hidden={!expanded}>
        <ul>
          {policy.details.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="policy-card__footer">
          <span>Updated {policy.updatedAt}</span>
          <span>{policy.id}</span>
        </div>
      </div>
    </article>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / (1024 ** index)).toFixed(1)} ${units[index]}`;
}

function DashboardPage() {
  useBodyClass('dashboard-page');
  useDocumentTitle('EduGuard system — Dashboard Overview');

  const [search, setSearch] = React.useState('');
  const [classFilter, setClassFilter] = React.useState('All Classes');
  const [statusFilter, setStatusFilter] = React.useState('All Statuses');
  const [complianceFilter, setComplianceFilter] = React.useState('All Compliance');
  const [sortKey, setSortKey] = React.useState('lastSync');
  const [sortDir, setSortDir] = React.useState('desc');
  const [page, setPage] = React.useState(1);
  const [message, setMessage] = React.useState('');
  const [selectedDevice, setSelectedDevice] = React.useState(null);
  const [wipeDevice, setWipeDevice] = React.useState(null);
  const [expandedPolicyId, setExpandedPolicyId] = React.useState('POL-001');
  const [policyMessage, setPolicyMessage] = React.useState('');
  const [createPolicyOpen, setCreatePolicyOpen] = React.useState(false);
  const [auditStatus, setAuditStatus] = React.useState('Chain status: unknown');
  const [auditTone, setAuditTone] = React.useState('muted');
  const [auditHistoryOpen, setAuditHistoryOpen] = React.useState(false);
  const [auditDetail, setAuditDetail] = React.useState(null);
  const [auditHistory, setAuditHistory] = React.useState(RECENT_AUDIT_LOG);
  const [policyForm, setPolicyForm] = React.useState({ name: '', scope: 'All Classes', type: 'App Whitelist', apps: '', schedule: '', status: 'Active' });
  const tableBodyRef = React.useRef(null);

  const filteredDevices = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    let rows = [...DEVICES];

    if (searchTerm) {
      rows = rows.filter((device) => {
        return [device.model, device.id, device.classGroup, device.status, device.compliance, device.district, device.policy]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm);
      });
    }

    if (classFilter !== 'All Classes') rows = rows.filter((device) => device.classGroup === classFilter);
    if (statusFilter !== 'All Statuses') rows = rows.filter((device) => device.status === statusFilter);
    if (complianceFilter !== 'All Compliance') rows = rows.filter((device) => device.compliance === complianceFilter);

    rows.sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === 'number' && typeof right === 'number') {
        return sortDir === 'asc' ? left - right : right - left;
      }
      return sortDir === 'asc'
        ? String(left).localeCompare(String(right))
        : String(right).localeCompare(String(left));
    });

    return rows;
  }, [search, classFilter, statusFilter, complianceFilter, sortKey, sortDir]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const visibleDevices = filteredDevices.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  React.useEffect(() => {
    if (tableBodyRef.current) {
      tableBodyRef.current.scrollTop = 0;
    }
  }, [page, search, classFilter, statusFilter, complianceFilter, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'lastSync' || key === 'battery' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const openDevice = (device) => setSelectedDevice(device);
  const confirmWipe = (device) => setWipeDevice(device);

  const handleAction = (action, device) => {
    if (action === 'view') {
      openDevice(device);
      return;
    }

    if (action === 'wipe') {
      confirmWipe(device);
      return;
    }

    const messages = {
      push: `Policy push queued for ${device.model} (${device.id}).`,
      lock: `Lock command sent to ${device.model} (${device.id}).`,
      sync: `Force sync requested for ${device.model} (${device.id}).`,
      alert: `Alert sent for ${device.model} (${device.id}).`,
    };
    setMessage(messages[action] || 'Action completed.');
  };

  const exportCsv = () => {
    const rows = DEVICES.map((device) => [
      device.id,
      device.model,
      device.classGroup,
      device.status,
      device.compliance,
      device.battery,
      device.lastSync,
      device.policy,
      device.enrolledBy,
      device.district,
    ]);
    const csv = [
      ['ID', 'Model', 'Class', 'Status', 'Compliance', 'Battery', 'Last Sync', 'Policy', 'Enrolled By', 'District'].join(','),
      ...rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eduguard-devices.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('CSV export generated successfully.');
  };

  const submitPolicy = (event) => {
    event.preventDefault();
    setPolicyMessage('Policy editor saved locally. The mock policy remains in draft mode for now.');
    setCreatePolicyOpen(false);
    setPolicyForm({ name: '', scope: 'All Classes', type: 'App Whitelist', apps: '', schedule: '', status: 'Active' });
  };

  const verifyAudit = async () => {
    const verification = await fetchAuditVerification();
    if (verification.ok) {
      setAuditStatus(`Verified: ${verification.message}`);
      setAuditTone('ok');
      await appendAuditEntry({
        eventType: 'Verification',
        description: 'Audit chain verified from the dashboard',
        hash: createPseudoHash('verification-ok'),
        timestamp: new Date().toISOString(),
      });
    } else {
      setAuditStatus(`Broken: ${verification.message}`);
      setAuditTone('bad');
      await appendAuditEntry({
        eventType: 'Verification',
        description: `Audit chain check failed: ${verification.message}`,
        hash: createPseudoHash('verification-failed'),
        timestamp: new Date().toISOString(),
      });
    }
  };

  const openHistory = async () => {
    setAuditHistory(await loadAuditEntries());
    setAuditHistoryOpen(true);
  };

  return (
    <div className="dashboard-overview">
      <header className="dashboard-topbar">
        <div className="dashboard-topbar__title">
          <h1>Overview</h1>
          <p>EduGuard system • Kampala Secondary School</p>
        </div>
        <div className="dashboard-topbar__meta" data-dashboard-meta>
          <Chip>{DASHBOARD_SUMMARY.schoolName}</Chip>
          <Chip>{DASHBOARD_SUMMARY.district}</Chip>
          <Badge tone="online">{DASHBOARD_SUMMARY.verifiedChainLabel}</Badge>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="overview-stack" aria-label="Dashboard overview">
          <StatCards />

          <div className="overview-grid">
            <section className="panel" aria-labelledby="compliance-heading">
              <div className="panel__header">
                <h2 id="compliance-heading">Class compliance</h2>
                <span className="chip">Chart.js</span>
              </div>
              <ComplianceChart />
            </section>

            <section className="panel" aria-labelledby="violations-heading">
              <div className="panel__header">
                <h2 id="violations-heading">Recent violations</h2>
                <span className="chip">Last 4</span>
              </div>
              <ViolationsTable />
            </section>
          </div>

          <section className="panel" aria-labelledby="audit-heading">
            <div className="panel__header">
              <h2 id="audit-heading">Recent audit log entries</h2>
              <span className="chip">SHA-256 chain</span>
            </div>

            <div className="audit-controls">
              <button className="btn btn-outline" type="button" onClick={verifyAudit}>Verify Chain</button>
              <button className="btn btn-primary" type="button" onClick={openHistory}>Open Audit History</button>
              <span className={`audit-result muted ${auditTone === 'ok' ? 'audit-result--ok' : auditTone === 'bad' ? 'audit-result--bad' : ''}`}>{auditStatus}</span>
            </div>

            <AuditTable rows={RECENT_AUDIT_LOG} />
          </section>
        </section>

        <section className="panel device-section" aria-labelledby="devices-heading">
          <div className="panel__header device-section__header">
            <div>
              <h2 id="devices-heading">Device management</h2>
              <p className="device-section__subtitle">Search, filter, sort, paginate, and manage the 47 enrolled devices.</p>
            </div>
            <div className="device-section__actions">
              <Link className="btn btn-outline" to="/enrollment">QR Enroll</Link>
              <button className="btn btn-primary" type="button" onClick={exportCsv}>Export CSV</button>
            </div>
          </div>

          <div className="filter-bar" role="search" aria-label="Device filters">
            <label>
              <span className="filter-label">Search</span>
              <input type="search" placeholder="Device model, ID, district" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label>
              <span className="filter-label">Class</span>
              <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                {DEVICE_CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="filter-label">Status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {DEVICE_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span className="filter-label">Compliance</span>
              <select value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)}>
                {COMPLIANCE_FILTERS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="device-section__message" aria-live="polite">{message}</div>

          <div className="table-scroll device-table-wrap" ref={tableBodyRef}>
            <table className="device-table" aria-label="Enrolled devices">
              <thead>
                <tr>
                  <th data-sort-key="model" onClick={() => handleSort('model')}>Device</th>
                  <th data-sort-key="classGroup" onClick={() => handleSort('classGroup')}>Class</th>
                  <th data-sort-key="status" onClick={() => handleSort('status')}>Status</th>
                  <th data-sort-key="compliance" onClick={() => handleSort('compliance')}>Compliance</th>
                  <th data-sort-key="battery" onClick={() => handleSort('battery')}>Battery</th>
                  <th data-sort-key="lastSync" onClick={() => handleSort('lastSync')}>Last Sync</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDevices.map((device) => (
                  <tr key={device.id}>
                    <td>
                      <div className="device-table__model">{device.model}</div>
                      <div className="device-table__sub">{device.id} • {device.district}</div>
                    </td>
                    <td>{device.classGroup}</td>
                    <td><span className={`badge badge--${device.status.toLowerCase() === 'offline' ? 'offline' : device.status.toLowerCase() === 'syncing' ? 'syncing' : 'online'}`}>{device.status}</span></td>
                    <td><span className={getSeverityClass(device.compliance)}>{device.compliance}</span></td>
                    <td>
                      <div className="battery-meter" aria-label={`${device.battery}% battery`}>
                        <div className={`battery-meter__fill ${device.battery < 30 ? 'battery-meter__fill--low' : ''}`} style={{ width: `${device.battery}%` }} />
                      </div>
                    </td>
                    <td>{formatRelativeTime(device.lastSync)}</td>
                    <td>
                      <div className="device-actions">
                        {['view', 'push', 'lock', 'sync', 'wipe', 'alert'].map((action) => (
                          <button key={action} className={action === 'wipe' ? 'btn btn-danger' : 'btn btn-ghost'} type="button" onClick={() => handleAction(action, device)}>
                            {action === 'view' ? 'View' : action === 'push' ? 'Push Policy' : action === 'lock' ? 'Lock' : action === 'sync' ? 'Force Sync' : action === 'wipe' ? 'Wipe' : 'Alert'}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <div className="pagination-bar__meta">
              Showing {Math.min((page - 1) * pageSize + 1, filteredDevices.length)}-{Math.min(page * pageSize, filteredDevices.length)} of {filteredDevices.length} devices
            </div>
            <div className="pagination-controls">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                <button key={item} className="btn btn-ghost" type="button" aria-current={item === page ? 'page' : undefined} onClick={() => setPage(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel policy-section" aria-labelledby="policies-heading">
          <div className="panel__header policy-section__header">
            <div>
              <h2 id="policies-heading">Policies</h2>
              <p className="policy-section__subtitle">Six policy profiles with expand-to-review details and a draft policy editor.</p>
            </div>
            <button className="btn btn-primary" type="button" onClick={() => setCreatePolicyOpen(true)}>Create Policy</button>
          </div>

          <div className="policy-grid" data-policies-grid>
            {POLICIES.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                expanded={expandedPolicyId === policy.id}
                onToggle={() => setExpandedPolicyId(expandedPolicyId === policy.id ? '' : policy.id)}
              />
            ))}
          </div>
          <div className="device-section__message" aria-live="polite">{policyMessage}</div>
        </section>
      </main>

      {selectedDevice ? (
        <ModalShell title="Device detail" titleId="device-modal-title" onClose={() => setSelectedDevice(null)} className="device-modal">
          <div className="device-detail-grid">
            <div className="device-detail-item"><span>Device</span><strong>{selectedDevice.model}</strong></div>
            <div className="device-detail-item"><span>Device ID</span><strong>{selectedDevice.id}</strong></div>
            <div className="device-detail-item"><span>Class</span><strong>{selectedDevice.classGroup}</strong></div>
            <div className="device-detail-item"><span>District</span><strong>{selectedDevice.district}</strong></div>
            <div className="device-detail-item"><span>Status</span><strong>{selectedDevice.status}</strong></div>
            <div className="device-detail-item"><span>Compliance</span><strong>{selectedDevice.compliance}</strong></div>
            <div className="device-detail-item"><span>Battery</span><strong>{selectedDevice.battery}%</strong></div>
            <div className="device-detail-item"><span>Last Sync</span><strong>{formatRelativeTime(selectedDevice.lastSync)}</strong></div>
            <div className="device-detail-item"><span>Policy</span><strong>{selectedDevice.policy}</strong></div>
            <div className="device-detail-item"><span>Enrolled By</span><strong>{selectedDevice.enrolledBy}</strong></div>
          </div>
        </ModalShell>
      ) : null}

      {wipeDevice ? (
        <ModalShell
          title="Confirm wipe"
          titleId="confirm-modal-title"
          onClose={() => setWipeDevice(null)}
          className="device-modal"
          actions={(
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setWipeDevice(null)}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={() => { setMessage(`Wipe queued for ${wipeDevice.model} (${wipeDevice.id}).`); setWipeDevice(null); }}>Wipe device</button>
            </div>
          )}
        >
          <p>Wipe {wipeDevice.model} ({wipeDevice.id}) from the device registry?</p>
        </ModalShell>
      ) : null}

      {createPolicyOpen ? (
        <ModalShell title="Create policy" titleId="policy-create-title" onClose={() => setCreatePolicyOpen(false)} className="device-modal policy-modal">
          <form className="policy-form" onSubmit={submitPolicy}>
            <label>
              Policy name
              <input type="text" name="name" required placeholder="Exam Kiosk - S.4" value={policyForm.name} onChange={(event) => setPolicyForm({ ...policyForm, name: event.target.value })} />
            </label>
            <label>
              Target class
              <select name="scope" required value={policyForm.scope} onChange={(event) => setPolicyForm({ ...policyForm, scope: event.target.value })}>
                {['All Classes', 'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Policy type
              <select name="type" required value={policyForm.type} onChange={(event) => setPolicyForm({ ...policyForm, type: event.target.value })}>
                {POLICY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              App whitelist
              <input type="text" name="apps" placeholder="Khan Academy, PDF reader" value={policyForm.apps} onChange={(event) => setPolicyForm({ ...policyForm, apps: event.target.value })} />
            </label>
            <label>
              Schedule
              <input type="text" name="schedule" placeholder="Mon-Fri 08:00-12:00" value={policyForm.schedule} onChange={(event) => setPolicyForm({ ...policyForm, schedule: event.target.value })} />
            </label>
            <label className="policy-form__toggle">
              <span>Encryption</span>
              <strong>AES-256 locked ON</strong>
            </label>
            <div className="policy-form__status-row">
              <label>
                Status
                <select name="status" required value={policyForm.status} onChange={(event) => setPolicyForm({ ...policyForm, status: event.target.value })}>
                  {['Active', 'Scheduled', 'Draft', 'Inactive'].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" type="button" onClick={() => setCreatePolicyOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save policy</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {auditHistoryOpen ? (
        <ModalShell title="Audit history" titleId="audit-history-title" onClose={() => setAuditHistoryOpen(false)} className="audit-modal">
          <div className="audit-list" role="list">
            {auditHistory.map((entry, index) => (
              <div className="audit-item" role="listitem" key={`${entry.hash}-${entry.timestamp}`} data-audit-idx={index}>
                <div className="audit-item__left">
                  <div className="chip">{entry.eventType}</div>
                </div>
                <div className="audit-item__main">
                  <div className="audit-item__desc">{entry.description}</div>
                  <div className="audit-item__meta"><span className="hash-mono">{truncateHash(entry.hash, 16)}</span> • {new Date(entry.timestamp).toLocaleString()}</div>
                </div>
                <div className="audit-item__actions">
                  <button className="btn btn-ghost" type="button" onClick={() => setAuditDetail(entry)}>View</button>
                </div>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {auditDetail ? (
        <ModalShell title="Audit detail" titleId="audit-detail-title" onClose={() => setAuditDetail(null)} className="audit-detail-modal">
          <p><strong>Event:</strong> {auditDetail.eventType}</p>
          <p><strong>Description:</strong> {auditDetail.description}</p>
          <p><strong>SHA-256:</strong> <span className="hash-mono">{auditDetail.hash}</span></p>
          <p><strong>Timestamp:</strong> {new Date(auditDetail.timestamp).toLocaleString()}</p>
          <div className="audit-detail-actions">
            <button className="btn btn-outline" type="button" onClick={async () => {
              const verification = auditDetail.hash && !Number.isNaN(new Date(auditDetail.timestamp).getTime());
              if (verification) {
                window.alert('Entry appears well-formed');
                await appendAuditEntry({
                  eventType: 'Detail View',
                  description: `Viewed audit entry ${auditDetail.eventType}`,
                  hash: createPseudoHash(`detail-view:${auditDetail.hash}`),
                  timestamp: new Date().toISOString(),
                });
              } else {
                window.alert('Entry malformed');
              }
            }}>Verify entry</button>
            <button className="btn btn-primary audit-detail-actions__button" type="button" onClick={async () => {
              try {
                await navigator.clipboard.writeText(auditDetail.hash);
                window.alert('Hash copied to clipboard');
              } catch {
                window.alert('Copy not available in this environment');
              }
            }}>Copy hash</button>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

DashboardPage.propTypes = {};

export default DashboardPage;
