import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { COMPLIANCE_BY_CLASS, DASHBOARD_SUMMARY, OVERVIEW_STATS } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadReportsSnapshot } from '../../lib/dashboardApi.js';
import SectionPage from './SectionPage.jsx';

function ReportsPage() {
  useBodyClass('dashboard-page');
  const [reportSnapshot, setReportSnapshot] = React.useState({
    overviewStats: OVERVIEW_STATS,
    complianceByClass: COMPLIANCE_BY_CLASS,
    summary: DASHBOARD_SUMMARY,
  });

  React.useEffect(() => {
    let active = true;
    loadReportsSnapshot().then((snapshot) => {
      if (active) setReportSnapshot(snapshot);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Reports"
      subtitle="This page aggregates the same seeded metrics used by the overview, keeping a dedicated route ready for future backend reports."
      chips={[reportSnapshot.summary.schoolName, reportSnapshot.summary.district, 'Phase 1 mock data']}
    >
      <div className="overview-stat-grid">
        {reportSnapshot.overviewStats.map((item) => (
          <article key={item.label} className={`card card--stat stat-card--dashboard ${item.colorClass}`}>
            <div className="stat-card__label">{item.label}</div>
            <div className="stat-card__value">{item.value}</div>
          </article>
        ))}
      </div>

      <section className="panel reports-page__panel">
        <div className="panel__header"><h2>Compliance by class</h2><Chip>Snapshot</Chip></div>
        <div className="table-scroll">
          <table className="dashboard-table" aria-label="Compliance by class">
            <thead>
              <tr>
                <th>Class</th>
                <th>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {reportSnapshot.complianceByClass.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>{item.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SectionPage>
  );
}

ReportsPage.propTypes = {};

export default ReportsPage;