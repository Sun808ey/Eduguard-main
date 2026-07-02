import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { DEVICE_CLASS_OPTIONS, DEVICE_STATUS_OPTIONS, DEVICES, OVERVIEW_STATS } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadDevices } from '../../lib/dashboardApi.js';
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

function DevicesPage() {
  useBodyClass('dashboard-page');
  const [devices, setDevices] = React.useState(DEVICES);

  React.useEffect(() => {
    let active = true;
    loadDevices().then((rows) => {
      if (active) setDevices(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Enrolled Devices"
      subtitle="Phase 1 surfaces the seeded registry. Phase 2 upgrades the same route to fetch from VITE_API_BASE_URL while keeping the fallback intact."
      chips={[`Devices: ${devices.length}`, `Classes: ${DEVICE_CLASS_OPTIONS.length - 1}`, `Statuses: ${DEVICE_STATUS_OPTIONS.length - 1}`]}
      actions={<Link className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" to="/enrollment">QR Enroll</Link>}
    >
      <div className="overview-stat-grid dashboard-section-page__stats grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {OVERVIEW_STATS.map((item) => (
          <article key={item.label} className={`card card--stat stat-card--dashboard rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 ${item.colorClass}`}>
            <div className="stat-card__label text-sm font-medium text-slate-400">{item.label}</div>
            <div className="stat-card__value mt-2 text-3xl font-extrabold tracking-tight text-white">{item.value}</div>
            <div className="stat-card__footer mt-3 text-sm text-slate-400"><span>{item.trend}</span></div>
          </article>
        ))}
      </div>

      <section className="panel rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
        <div className="panel__header mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Device registry</h2><Chip>Static mock data</Chip></div>
        <div className="table-scroll overflow-x-auto">
          <table className="dashboard-table w-full border-collapse" aria-label="Enrolled devices">
            <thead>
              <tr>
                <th>Device</th>
                <th>Class</th>
                <th>Status</th>
                <th>Compliance</th>
                <th>Battery</th>
                <th>Last Sync</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>
                      <div className="device-table__model text-sm font-semibold text-white">{device.model}</div>
                      <div className="device-table__sub mt-1 text-xs text-slate-400">{device.id} • {device.district}</div>
                  </td>
                  <td>{device.classGroup}</td>
                  <td>{device.status}</td>
                  <td>{device.compliance}</td>
                  <td>{device.battery}%</td>
                  <td>{formatRelativeTime(device.lastSync)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SectionPage>
  );
}

DevicesPage.propTypes = {};

export default DevicesPage;