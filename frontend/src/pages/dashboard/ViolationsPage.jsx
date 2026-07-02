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
      <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
        <div className="panel__header mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Recent incidents</h2><Chip>Latest records</Chip></div>
        <div className="table-scroll overflow-x-auto">
          <table className="dashboard-table w-full border-collapse" aria-label="Recent violations">
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
                  <td className="text-slate-200">{row.device}</td>
                  <td className="text-slate-200">{row.violationType}</td>
                  <td className="text-slate-200">{row.policyViolated}</td>
                  <td className="text-slate-300">{formatRelativeTime(row.timestamp)}</td>
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