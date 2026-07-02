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
    <div className="dashboard-shell dashboard-shell--router">
      <aside className="dashboard-nav" aria-label="Dashboard sections">
        <LogoBrand to="/dashboard" className="dashboard-nav__brand brand" compact />
        <p className="dashboard-nav__note">Phase 1 uses local seeded data; Phase 2 swaps in API fetches from VITE_API_BASE_URL.</p>

        <nav className="dashboard-nav__links">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `dashboard-nav__link${isActive ? ' is-active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-nav__footer">
          <Chip>LAN-ready</Chip>
          <Chip>Vercel frontend</Chip>
          <Chip className={`sync-badge sync-badge--${syncStatus.tone}`} aria-label={`Sync status ${syncStatus.label}`}>
            {syncStatus.label}
          </Chip>
        </div>
      </aside>

      <div className="dashboard-shell__content">
        <Outlet />
      </div>
    </div>
  );
}

DashboardShell.propTypes = {};

export default DashboardShell;