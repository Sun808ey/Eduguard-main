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
      <div className="policy-grid">
        {policies.map((policy) => (
          <article key={policy.id} className="policy-card policy-card--expanded">
            <div className="policy-card__toggle">
              <div className="policy-card__header">
                <h3>{policy.title}</h3>
                <p>{policy.summary}</p>
              </div>
              <div className="policy-card__meta">
                <Chip>{policy.scope}</Chip>
                <Chip>{policy.type}</Chip>
                <span className="encryption-badge">{policy.encryption}</span>
              </div>
            </div>
            <div className="policy-card__details">
              <ul>
                {policy.details.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="policy-card__footer"><span>Updated {policy.updatedAt}</span><span>{policy.id}</span></div>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}

PoliciesPage.propTypes = {};

export default PoliciesPage;