import { Chip } from '../../components/ui.jsx';
import PropTypes from 'prop-types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

function SectionPage({ title, subtitle, chips = [], actions = null, children }) {
  useDocumentTitle(`EduGuard system — ${title}`);

  return (
    <main className="dashboard-main dashboard-section-page">
      <header className="dashboard-section-page__header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="dashboard-section-page__meta">
          {chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
        </div>
        {actions ? <div className="dashboard-section-page__actions">{actions}</div> : null}
      </header>

      {children}
    </main>
  );
}

SectionPage.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  chips: PropTypes.arrayOf(PropTypes.string),
  actions: PropTypes.node,
  children: PropTypes.node.isRequired,
};

export default SectionPage;