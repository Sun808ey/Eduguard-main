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
  if (compliance === 'Violation') return 'inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-100';
  if (compliance === 'Pending') return 'inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100';
  return 'inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100';
}

function getTrendIcon(direction) {
  if (direction === 'down') return '▼';
  if (direction === 'up') return '▲';
  return '•';
}

function StatCards() {
  return (
    <div className="overview-stat-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {OVERVIEW_STATS.map((item) => (
        <article className={`card card--stat stat-card--dashboard rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur ${item.colorClass}`} key={item.label}>
          <div className="card__left flex items-center gap-4">
            <div className="card__icon flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl" aria-hidden="true">
              {item.icon === 'devices' ? '📱' : item.icon === 'online' ? '🟢' : item.icon === 'warning' ? '⚠️' : '🔄'}
            </div>
            <div>
              <div className="stat-card__label text-sm font-medium text-slate-400">{item.label}</div>
              <div className="stat-card__value text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{item.value}</div>
            </div>
          </div>
          <div className="stat-card__footer mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
            <span>{item.trend}</span>
            <span className={`text-sm font-semibold ${item.trendDir === 'down' ? 'text-rose-300' : item.trendDir === 'up' ? 'text-emerald-300' : 'text-slate-400'}`}>
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
    <div className="chart-wrap min-h-[280px]" aria-label="Class compliance bar chart">
      <canvas ref={canvasRef} height={260} />
    </div>
  );
}

function ViolationsTable() {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="dashboard-table w-full border-collapse text-left" aria-label="Recent violations">
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
              <td><span className={row.severity.toLowerCase() === 'high' ? 'inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-100' : row.severity.toLowerCase() === 'med' ? 'inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100' : 'inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100'}>{row.severity}</span></td>
              <td className="text-slate-200">{row.device}</td>
              <td className="text-slate-200">{row.violationType}</td>
              <td className="text-slate-200">{row.policyViolated}</td>
              <td className="text-slate-300">{formatRelativeTime(row.timestamp)}</td>
              <td><span className={row.status.toLowerCase() === 'open' ? 'inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-100' : row.status.toLowerCase() === 'pending' ? 'inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100' : 'inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100'}>{row.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows }) {
  return (
    <div className="table-scroll overflow-x-auto">
      <table className="dashboard-table w-full border-collapse text-left" aria-label="Recent audit log entries">
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
              <td><span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">{entry.eventType}</span></td>
              <td className="text-slate-200">{entry.description}</td>
              <td><span className="font-mono text-sm text-slate-400" title={entry.hash}>{truncateHash(entry.hash)}</span></td>
              <td className="text-slate-300">{formatRelativeTime(entry.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyCard({ policy, expanded, onToggle }) {
  return (
    <article className={`policy-card rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 ${expanded ? 'policy-card--expanded' : ''}`} data-policy-id={policy.id}>
      <button className="policy-card__toggle w-full text-left" type="button" aria-expanded={expanded ? 'true' : 'false'} onClick={onToggle}>
        <div className="policy-card__header flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{policy.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-400">{policy.summary}</p>
          </div>
          <span className={policy.status.toLowerCase() === 'active' ? 'inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100' : policy.status.toLowerCase() === 'draft' ? 'inline-flex rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1 text-xs font-semibold text-slate-100' : 'inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100'}>{policy.status}</span>
        </div>
        <div className="policy-card__meta mt-4 flex flex-wrap gap-2">
          <Chip>{policy.scope}</Chip>
          <Chip>{policy.type}</Chip>
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">{policy.encryption}</span>
        </div>
      </button>
      <div className="policy-card__details px-5 pb-5" hidden={!expanded}>
        <ul className="mt-4 grid gap-2 text-sm text-slate-300">
          {policy.details.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="policy-card__footer mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
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
    <div className="dashboard-overview space-y-6">
      <header className="dashboard-topbar flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="dashboard-topbar__title space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Overview</h1>
          <p className="text-sm text-slate-400">EduGuard system • Kampala Secondary School</p>
        </div>
        <div className="dashboard-topbar__meta flex flex-wrap items-center gap-2" data-dashboard-meta>
          <Chip>{DASHBOARD_SUMMARY.schoolName}</Chip>
          <Chip>{DASHBOARD_SUMMARY.district}</Chip>
          <Badge tone="online">{DASHBOARD_SUMMARY.verifiedChainLabel}</Badge>
        </div>
      </header>

      <main className="dashboard-main space-y-6">
        <section className="overview-stack space-y-6" aria-label="Dashboard overview">
          <StatCards />

          <div className="overview-grid grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20" aria-labelledby="compliance-heading">
              <div className="panel__header mb-4 flex items-center justify-between gap-3">
                <h2 id="compliance-heading" className="text-lg font-semibold text-white">Class compliance</h2>
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Chart.js</span>
              </div>
              <ComplianceChart />
            </section>

            <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20" aria-labelledby="violations-heading">
              <div className="panel__header mb-4 flex items-center justify-between gap-3">
                <h2 id="violations-heading" className="text-lg font-semibold text-white">Recent violations</h2>
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Last 4</span>
              </div>
              <ViolationsTable />
            </section>
          </div>

          <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20" aria-labelledby="audit-heading">
            <div className="panel__header mb-4 flex items-center justify-between gap-3">
              <h2 id="audit-heading" className="text-lg font-semibold text-white">Recent audit log entries</h2>
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">SHA-256 chain</span>
            </div>

            <div className="audit-controls mb-4 flex flex-wrap items-center gap-3">
              <button className="btn btn-outline inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={verifyAudit}>Verify Chain</button>
              <button className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="button" onClick={openHistory}>Open Audit History</button>
              <span className={`audit-result muted text-sm ${auditTone === 'ok' ? 'audit-result--ok' : auditTone === 'bad' ? 'audit-result--bad' : ''}`}>{auditStatus}</span>
            </div>

            <AuditTable rows={RECENT_AUDIT_LOG} />
          </section>
        </section>

        <section className="panel device-section rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20" aria-labelledby="devices-heading">
          <div className="panel__header device-section__header mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="devices-heading" className="text-lg font-semibold text-white">Device management</h2>
              <p className="device-section__subtitle mt-2 text-sm text-slate-400">Search, filter, sort, paginate, and manage the 47 enrolled devices.</p>
            </div>
            <div className="device-section__actions flex flex-wrap gap-3">
              <Link className="btn btn-outline inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" to="/enrollment">QR Enroll</Link>
              <button className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="button" onClick={exportCsv}>Export CSV</button>
            </div>
          </div>

          <div className="filter-bar mb-4 grid gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(140px,1fr))]" role="search" aria-label="Device filters">
            <label className="grid gap-2">
              <span className="filter-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Search</span>
              <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="search" placeholder="Device model, ID, district" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="grid gap-2">
              <span className="filter-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Class</span>
              <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                {DEVICE_CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="filter-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</span>
              <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {DEVICE_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="filter-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Compliance</span>
              <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value)}>
                {COMPLIANCE_FILTERS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="device-section__message mb-3 min-h-5 text-sm text-slate-400" aria-live="polite">{message}</div>

          <div className="table-scroll device-table-wrap overflow-x-auto" ref={tableBodyRef}>
            <table className="device-table w-full border-collapse" aria-label="Enrolled devices">
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
                      <div className="device-table__model text-sm font-semibold text-white">{device.model}</div>
                      <div className="device-table__sub mt-1 text-xs text-slate-400">{device.id} • {device.district}</div>
                    </td>
                    <td>{device.classGroup}</td>
                    <td><span className={device.status.toLowerCase() === 'offline' ? 'inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-xs font-semibold text-rose-100' : device.status.toLowerCase() === 'syncing' ? 'inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100' : 'inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100'}>{device.status}</span></td>
                    <td><span className={getSeverityClass(device.compliance)}>{device.compliance}</span></td>
                    <td>
                      <div className="battery-meter h-2.5 w-[92px] overflow-hidden rounded-full bg-white/10" aria-label={`${device.battery}% battery`}>
                        <div className={`battery-meter__fill h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 ${device.battery < 30 ? 'battery-meter__fill--low' : ''}`} style={{ width: `${device.battery}%` }} />
                      </div>
                    </td>
                    <td>{formatRelativeTime(device.lastSync)}</td>
                    <td>
                      <div className="device-actions flex flex-wrap gap-2">
                        {['view', 'push', 'lock', 'sync', 'wipe', 'alert'].map((action) => (
                          <button key={action} className={action === 'wipe' ? 'btn btn-danger inline-flex rounded-full bg-rose-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-400' : 'btn btn-ghost inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10'} type="button" onClick={() => handleAction(action, device)}>
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

          <div className="pagination-bar mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="pagination-bar__meta text-sm text-slate-400">
              Showing {Math.min((page - 1) * pageSize + 1, filteredDevices.length)}-{Math.min(page * pageSize, filteredDevices.length)} of {filteredDevices.length} devices
            </div>
            <div className="pagination-controls flex flex-wrap gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                <button key={item} className={`btn btn-ghost inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition ${item === page ? 'border-cyan-400/40 bg-cyan-400 text-slate-950' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`} type="button" aria-current={item === page ? 'page' : undefined} onClick={() => setPage(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel policy-section rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20" aria-labelledby="policies-heading">
          <div className="panel__header policy-section__header mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="policies-heading" className="text-lg font-semibold text-white">Policies</h2>
              <p className="policy-section__subtitle mt-2 text-sm text-slate-400">Six policy profiles with expand-to-review details and a draft policy editor.</p>
            </div>
            <button className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="button" onClick={() => setCreatePolicyOpen(true)}>Create Policy</button>
          </div>

          <div className="policy-grid grid gap-4 xl:grid-cols-2" data-policies-grid>
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
          <div className="device-detail-grid grid gap-3 sm:grid-cols-2">
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
            <div className="modal-actions flex flex-wrap gap-3">
              <button className="btn btn-ghost inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={() => setWipeDevice(null)}>Cancel</button>
              <button className="btn btn-danger inline-flex rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400" type="button" onClick={() => { setMessage(`Wipe queued for ${wipeDevice.model} (${wipeDevice.id}).`); setWipeDevice(null); }}>Wipe device</button>
            </div>
          )}
        >
          <p>Wipe {wipeDevice.model} ({wipeDevice.id}) from the device registry?</p>
        </ModalShell>
      ) : null}

      {createPolicyOpen ? (
        <ModalShell title="Create policy" titleId="policy-create-title" onClose={() => setCreatePolicyOpen(false)} className="device-modal policy-modal">
          <form className="policy-form grid gap-4" onSubmit={submitPolicy}>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              Policy name
              <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="text" name="name" required placeholder="Exam Kiosk - S.4" value={policyForm.name} onChange={(event) => setPolicyForm({ ...policyForm, name: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              Target class
              <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" name="scope" required value={policyForm.scope} onChange={(event) => setPolicyForm({ ...policyForm, scope: event.target.value })}>
                {['All Classes', 'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              Policy type
              <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" name="type" required value={policyForm.type} onChange={(event) => setPolicyForm({ ...policyForm, type: event.target.value })}>
                {POLICY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              App whitelist
              <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="text" name="apps" placeholder="Khan Academy, PDF reader" value={policyForm.apps} onChange={(event) => setPolicyForm({ ...policyForm, apps: event.target.value })} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-200">
              Schedule
              <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="text" name="schedule" placeholder="Mon-Fri 08:00-12:00" value={policyForm.schedule} onChange={(event) => setPolicyForm({ ...policyForm, schedule: event.target.value })} />
            </label>
            <label className="policy-form__toggle flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <span>Encryption</span>
              <strong className="text-cyan-200">AES-256 locked ON</strong>
            </label>
            <div className="policy-form__status-row">
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Status
                <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" name="status" required value={policyForm.status} onChange={(event) => setPolicyForm({ ...policyForm, status: event.target.value })}>
                  {['Active', 'Scheduled', 'Draft', 'Inactive'].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <div className="modal-actions flex flex-wrap gap-3">
              <button className="btn btn-ghost inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={() => setCreatePolicyOpen(false)}>Cancel</button>
              <button className="btn btn-primary inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="submit">Save policy</button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {auditHistoryOpen ? (
        <ModalShell title="Audit history" titleId="audit-history-title" onClose={() => setAuditHistoryOpen(false)} className="audit-modal">
          <div className="audit-list grid gap-3 max-h-[48vh] overflow-auto" role="list">
            {auditHistory.map((entry, index) => (
              <div className="audit-item flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3" role="listitem" key={`${entry.hash}-${entry.timestamp}`} data-audit-idx={index}>
                <div className="audit-item__left">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">{entry.eventType}</div>
                </div>
                <div className="audit-item__main">
                  <div className="audit-item__desc font-semibold text-white">{entry.description}</div>
                  <div className="audit-item__meta mt-1 text-sm text-slate-400"><span className="font-mono">{truncateHash(entry.hash, 16)}</span> • {new Date(entry.timestamp).toLocaleString()}</div>
                </div>
                <div className="audit-item__actions">
                  <button className="btn btn-ghost inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10" type="button" onClick={() => setAuditDetail(entry)}>View</button>
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
          <p><strong>SHA-256:</strong> <span className="font-mono">{auditDetail.hash}</span></p>
          <p><strong>Timestamp:</strong> {new Date(auditDetail.timestamp).toLocaleString()}</p>
          <div className="audit-detail-actions flex flex-wrap gap-3">
            <button className="btn btn-outline inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" type="button" onClick={async () => {
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
            <button className="btn btn-primary audit-detail-actions__button inline-flex rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="button" onClick={async () => {
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
