import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { RECENT_AUDIT_LOG } from '../../data/mockData.js';
import { fetchAuditVerification, loadAuditEntries, truncateHash } from '../../lib/auditClient.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import SectionPage from './SectionPage.jsx';

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function AuditLogPage() {
  useBodyClass('dashboard-page');
  const [status, setStatus] = React.useState('Chain status available from seeded data');
  const [rows, setRows] = React.useState(RECENT_AUDIT_LOG);

  React.useEffect(() => {
    let active = true;
    loadAuditEntries().then((entries) => {
      if (active) setRows(entries);
    });
    return () => {
      active = false;
    };
  }, []);

  const verifyChain = async () => {
    const result = await fetchAuditVerification();
    setStatus(result.ok ? `Verified: ${result.message}` : `Broken: ${result.message}`);
  };

  return (
    <SectionPage
      title="Forensic Audit Log"
      subtitle="The route is kept separate so the audit chain can later move from seeded data to API fetches without changing dashboard navigation."
      chips={[`${rows.length} entries`, 'Hash-chained', 'Phase 1 seeded']}
      actions={<button className="btn btn-primary" type="button" onClick={verifyChain}>Verify Chain</button>}
    >
      <section className="panel">
        <div className="panel__header"><h2>Recent audit events</h2><Chip>SHA-256</Chip></div>
        <div className="device-section__message" aria-live="polite">{status}</div>
        <div className="table-scroll">
          <table className="dashboard-table" aria-label="Audit log entries">
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
                  <td><span className="hash-mono">{truncateHash(entry.hash)}</span></td>
                  <td>{formatRelativeTime(entry.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SectionPage>
  );
}

AuditLogPage.propTypes = {};

export default AuditLogPage;