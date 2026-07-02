import { Chip } from '../../components/ui.jsx';
import PropTypes from 'prop-types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

function SectionPage({ title, subtitle, chips = [], actions = null, children }) {
  useDocumentTitle(`EduGuard system — ${title}`);

  return (
    <main className="dashboard-main dashboard-section-page space-y-6">
      <header className="dashboard-section-page__header flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-7 text-slate-400">{subtitle}</p>
        </div>
        <div className="dashboard-section-page__meta flex flex-wrap gap-2">
          {chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
        </div>
        {actions ? <div className="dashboard-section-page__actions flex flex-wrap gap-3">{actions}</div> : null}
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