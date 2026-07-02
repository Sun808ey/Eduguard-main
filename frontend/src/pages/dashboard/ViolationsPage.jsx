import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { RECENT_VIOLATIONS } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadViolations } from '../../lib/dashboardApi.js';
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

function ViolationsPage() {
  useBodyClass('dashboard-page');
  const [violations, setViolations] = React.useState(RECENT_VIOLATIONS);

  React.useEffect(() => {
    let active = true;
    loadViolations().then((rows) => {
      if (active) setViolations(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Policy Violations"
      subtitle="Seeded violations provide a stable route target now and a direct replacement point for future API-fed incidents later."
      chips={[`${violations.length} incidents`, 'Severity ranked', 'Static data']}
    >
      <section className="panel">
        <div className="panel__header"><h2>Recent incidents</h2><Chip>Latest records</Chip></div>
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
              {violations.map((row) => (
                <tr key={`${row.device}-${row.timestamp}`}>
                  <td>{row.severity}</td>
                  <td>{row.device}</td>
                  <td>{row.violationType}</td>
                  <td>{row.policyViolated}</td>
                  <td>{formatRelativeTime(row.timestamp)}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SectionPage>
  );
}

ViolationsPage.propTypes = {};

export default ViolationsPage;