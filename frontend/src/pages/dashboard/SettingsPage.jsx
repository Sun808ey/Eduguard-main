import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { DASHBOARD_SUMMARY } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadSettingsSnapshot } from '../../lib/dashboardApi.js';
import SectionPage from './SectionPage.jsx';

const SETTINGS = [
  { label: 'LAN server mode', value: 'Enabled' },
  { label: 'API base URL', value: 'VITE_API_BASE_URL' },
  { label: 'Dashboard mode', value: 'Vercel-hosted frontend' },
  { label: 'Audit storage', value: 'Seeded in Phase 1' },
];

function SettingsPage() {
  useBodyClass('dashboard-page');
  const [settings, setSettings] = React.useState([
    { label: 'LAN server mode', value: 'Enabled' },
    { label: 'API base URL', value: 'VITE_API_BASE_URL' },
    { label: 'Dashboard mode', value: 'Vercel-hosted frontend' },
    { label: 'Audit storage', value: 'Seeded in Phase 1' },
  ]);

  React.useEffect(() => {
    let active = true;
    loadSettingsSnapshot().then((rows) => {
      if (active) setSettings(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Settings"
      subtitle="Settings stay intentionally lightweight for the prototype while preserving the route the production backend will eventually drive."
      chips={[DASHBOARD_SUMMARY.schoolName, 'LAN only', 'Configurable env']}
    >
      <div className="overview-grid grid gap-4 lg:grid-cols-2">
        <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <div className="panel__header mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Deployment settings</h2><Chip>Safe defaults</Chip></div>
          <div className="device-detail-grid grid gap-3 sm:grid-cols-2">
            {settings.map((item) => (
              <div key={item.label} className="device-detail-item rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</span>
                <strong className="mt-2 block text-sm text-white">{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
          <div className="panel__header mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Operational notes</h2><Chip>Preserve behaviour</Chip></div>
          <ul className="policy-card__details-list grid gap-3 text-sm text-slate-300">
            <li>Keep the backend on the same LAN for production testing.</li>
            <li>Use HTTPS when the hosted frontend talks to the backend.</li>
            <li>Phase 1 remains local and seeded; Phase 2 replaces reads with fetch calls.</li>
          </ul>
        </section>
      </div>
    </SectionPage>
  );
}

SettingsPage.propTypes = {};

export default SettingsPage;