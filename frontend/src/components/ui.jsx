import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logoUrl from '../../assets/img/logo.svg';

export { logoUrl };

function LogoBrand({ to = '/', compact = false, className = '', ariaLabel = 'EduGuard system home' }) {
  return (
    <Link
      className={`inline-flex items-center gap-3 text-white no-underline transition-transform duration-200 hover:-translate-y-0.5 ${className}`.trim()}
      to={to}
      aria-label={ariaLabel}
    >
      <img src={logoUrl} alt="EduGuard system" className="brand__logo h-11 w-11 rounded-2xl shadow-lg shadow-slate-950/30 ring-1 ring-white/10" />
      <span className="brand__text flex flex-col leading-none">
        <strong className="text-base font-semibold tracking-[0.18em] uppercase">EduGuard</strong>
        {compact ? <small>system</small> : <span>system</span>}
      </span>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="section-heading mx-auto max-w-3xl text-center">
      {eyebrow ? <span className="section-label mb-3 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">{eyebrow}</span> : null}
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {children}
    </div>
  );
}

function Chip({ children, className = '', title }) {
  return (
    <span className={`chip inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 shadow-sm shadow-slate-950/20 backdrop-blur ${className}`.trim()} title={title}>
      {children}
    </span>
  );
}

function Badge({ children, tone = 'default', className = '' }) {
  const toneClass = tone === 'default' ? '' : `badge--${tone}`;
  return <span className={`badge inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass} ${className}`.trim()}>{children}</span>;
}

function ModalShell({ title, titleId, onClose, children, className = '', actions = null }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <section className={`modal w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-slate-100 shadow-2xl shadow-black/40 ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__header mb-6 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-2xl font-semibold tracking-tight">{title}</h2>
          <button className="modal-close inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-100 transition hover:bg-white/10" type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
        </div>
        <div className="modal__body space-y-4">
          {children}
          {actions}
        </div>
      </section>
    </div>
  );
}

LogoBrand.propTypes = {
  to: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
  ariaLabel: PropTypes.string,
};

SectionHeading.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
};

Chip.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.string,
  className: PropTypes.string,
};

ModalShell.propTypes = {
  title: PropTypes.string.isRequired,
  titleId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  actions: PropTypes.node,
};

const UI = { LogoBrand, SectionHeading, Chip, Badge, ModalShell };

export default UI;

export { LogoBrand, SectionHeading, Chip, Badge, ModalShell };
