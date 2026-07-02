import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { BLOCKED_APPS, WHITELISTED_APPS } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadApps } from '../../lib/dashboardApi.js';
import SectionPage from './SectionPage.jsx';

function AppList({ title, items, tone }) {
  return (
    <section className="panel">
      <div className="panel__header"><h2>{title}</h2><Chip>{items.length} apps</Chip></div>
      <div className={`app-list app-list--${tone}`}>
        {items.map((item) => <div key={item} className="app-list__item">{item}</div>)}
      </div>
    </section>
  );
}

function AppsPage() {
  useBodyClass('dashboard-page');
  const [whitelistedApps, setWhitelistedApps] = React.useState(WHITELISTED_APPS);
  const [blockedApps, setBlockedApps] = React.useState(BLOCKED_APPS);

  React.useEffect(() => {
    let active = true;
    loadApps().then((payload) => {
      if (!active) return;
      setWhitelistedApps(payload.whitelistedApps);
      setBlockedApps(payload.blockedApps);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Application Control"
      subtitle="Approved and blocked app catalogs remain seeded in Phase 1, with the same route available for a fetch-based data layer in Phase 2."
      chips={[`${WHITELISTED_APPS.length} approved`, `${BLOCKED_APPS.length} blocked`, 'Static data']}
    >
      <div className="overview-grid">
        <AppList title="Approved apps" items={whitelistedApps} tone="approved" />
        <AppList title="Blocked apps" items={blockedApps} tone="blocked" />
      </div>
    </SectionPage>
  );
}

AppsPage.propTypes = {};

export default AppsPage;