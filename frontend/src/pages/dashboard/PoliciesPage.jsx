import React from 'react';
import PropTypes from 'prop-types';
import { Chip } from '../../components/ui.jsx';
import { POLICIES } from '../../data/mockData.js';
import { useBodyClass } from '../../hooks/useBodyClass.js';
import { loadPolicies } from '../../lib/dashboardApi.js';
import SectionPage from './SectionPage.jsx';

function PoliciesPage() {
  useBodyClass('dashboard-page');
  const [policies, setPolicies] = React.useState(POLICIES);

  React.useEffect(() => {
    let active = true;
    loadPolicies().then((rows) => {
      if (active) setPolicies(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <SectionPage
      title="Security Policies"
      subtitle="Policy definitions stay local in Phase 1 and can be upgraded to fetches from VITE_API_BASE_URL without changing the page route."
      chips={[`${policies.length} policies`, 'Review/edit focus', 'Mock seeded data']}
    >
      <div className="policy-grid grid gap-4 xl:grid-cols-2">
        {policies.map((policy) => (
          <article key={policy.id} className="policy-card policy-card--expanded rounded-3xl border border-white/10 bg-white/5 shadow-lg shadow-black/20">
            <div className="policy-card__toggle p-5">
              <div className="policy-card__header">
                <h3 className="text-lg font-semibold text-white">{policy.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{policy.summary}</p>
              </div>
              <div className="policy-card__meta mt-4 flex flex-wrap gap-2">
                <Chip>{policy.scope}</Chip>
                <Chip>{policy.type}</Chip>
                <span className="encryption-badge inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">{policy.encryption}</span>
              </div>
            </div>
            <div className="policy-card__details px-5 pb-5">
              <ul className="grid gap-2 text-sm text-slate-300">
                {policy.details.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="policy-card__footer mt-4 flex items-center justify-between gap-3 text-xs text-slate-400"><span>Updated {policy.updatedAt}</span><span>{policy.id}</span></div>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}

PoliciesPage.propTypes = {};

export default PoliciesPage;