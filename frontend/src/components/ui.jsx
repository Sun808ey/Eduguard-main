import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import logoUrl from '../../assets/img/logo.svg';

export { logoUrl };

function LogoBrand({ to = '/', compact = false, className = '', ariaLabel = 'EduGuard system home' }) {
  return (
    <Link className={className} to={to} aria-label={ariaLabel}>
      <img src={logoUrl} alt="EduGuard system" className="brand__logo" />
      <span className="brand__text">
        <strong>EduGuard</strong>
        {compact ? <small>system</small> : <span>system</span>}
      </span>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="section-heading">
      {eyebrow ? <span className="section-label">{eyebrow}</span> : null}
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Chip({ children, className = '', title }) {
  return (
    <span className={`chip ${className}`.trim()} title={title}>
      {children}
    </span>
  );
}

function Badge({ children, tone = 'default', className = '' }) {
  const toneClass = tone === 'default' ? '' : `badge--${tone}`;
  return <span className={`badge ${toneClass} ${className}`.trim()}>{children}</span>;
}

function ModalShell({ title, titleId, onClose, children, className = '', actions = null }) {
  return (
    <div className="modal-backdrop">
      <section className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__header">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
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
