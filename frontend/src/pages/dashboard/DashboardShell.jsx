import { NavLink, Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { LogoBrand, Chip } from '../../components/ui.jsx';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import useSyncStatus from '../../hooks/useSyncStatus.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/devices', label: 'Devices' },
  { to: '/dashboard/policies', label: 'Policies' },
  { to: '/dashboard/apps', label: 'Apps' },
  { to: '/dashboard/audit-log', label: 'Audit Log' },
  { to: '/dashboard/violations', label: 'Violations' },
  { to: '/dashboard/reports', label: 'Reports' },
  { to: '/dashboard/settings', label: 'Settings' },
];

function DashboardShell() {
  useBodyClass('dashboard-page');
  const syncStatus = useSyncStatus();

  return (
    <div className="dashboard-shell dashboard-shell--router min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="dashboard-nav border-b border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6" aria-label="Dashboard sections">
        <LogoBrand to="/dashboard" className="dashboard-nav__brand brand" compact />
        <p className="dashboard-nav__note mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">Phase 1 uses local seeded data; Phase 2 swaps in API fetches from VITE_API_BASE_URL.</p>

        <nav className="dashboard-nav__links mt-6 flex flex-1 flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `dashboard-nav__link rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-nav__footer mt-6 flex flex-wrap gap-2">
          <Chip>LAN-ready</Chip>
          <Chip>Vercel frontend</Chip>
          <Chip className={`sync-badge sync-badge--${syncStatus.tone}`} aria-label={`Sync status ${syncStatus.label}`}>
            {syncStatus.label}
          </Chip>
        </div>
      </aside>

      <div className="dashboard-shell__content min-w-0 bg-slate-950 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </div>
    </div>
  );
}

DashboardShell.propTypes = {};

export default DashboardShell;