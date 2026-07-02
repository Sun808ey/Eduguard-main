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
      <div className="overview-stat-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reportSnapshot.overviewStats.map((item) => (
          <article key={item.label} className={`card card--stat stat-card--dashboard rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 ${item.colorClass}`}>
            <div className="stat-card__label text-sm font-medium text-slate-400">{item.label}</div>
            <div className="stat-card__value mt-2 text-3xl font-extrabold tracking-tight text-white">{item.value}</div>
          </article>
        ))}
      </div>

      <section className="panel reports-page__panel mt-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
        <div className="panel__header mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Compliance by class</h2><Chip>Snapshot</Chip></div>
        <div className="table-scroll overflow-x-auto">
          <table className="dashboard-table w-full border-collapse" aria-label="Compliance by class">
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