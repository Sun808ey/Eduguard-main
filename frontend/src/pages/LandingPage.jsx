import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { SectionHeading, logoUrl } from '../components/ui.jsx';
import { OVERVIEW_STATS } from '../data/mockData.js';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useCountUp } from '../hooks/useCountUp.js';

function CountUpStat({ target, label }) {
  const { ref, value } = useCountUp(target);

  return (
    <article className="stat-card">
      <strong ref={ref}>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function LandingHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className={`landing-header${menuOpen ? ' is-open' : ''}`} id="top">
      <div className="container landing-nav" role="navigation" aria-label="Primary">
        <LogoBrand to="/" className="brand" />

        <button
          className="nav-toggle btn btn-ghost"
          type="button"
          aria-label="Open navigation"
          aria-expanded={menuOpen ? 'true' : 'false'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <nav className="landing-menu" data-nav-menu>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#security-features" onClick={() => setMenuOpen(false)}>Security</a>
          <a href="#cia-triad" onClick={() => setMenuOpen(false)}>CIA Triad</a>
          <a href="#why-eduguard" onClick={() => setMenuOpen(false)}>Why EduGuard</a>
          <a href="#demo-request" onClick={() => setMenuOpen(false)}>Demo request</a>
        </nav>

        <div className="landing-actions">
          <Link className="btn btn-outline" to="/login">Admin Login</Link>
          <a className="btn btn-primary" href="#demo-request">Request Demo</a>
        </div>
      </div>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="hero__visual" aria-hidden="true">
      <svg className="sync-diagram" viewBox="0 0 560 420" role="img" aria-label="Policy propagation diagram">
        <defs>
          <linearGradient id="syncGlow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ui-accent)" />
            <stop offset="100%" stopColor="var(--green-600)" />
          </linearGradient>
        </defs>
        <rect x="24" y="24" width="512" height="372" rx="24" className="sync-diagram__frame" />
        <g className="sync-node sync-node--server">
          <rect x="240" y="48" width="80" height="48" rx="12" />
          <text x="280" y="77" textAnchor="middle">School LAN</text>
        </g>
        <g className="sync-node sync-node--device sync-node--left">
          <rect x="72" y="186" width="120" height="78" rx="16" />
          <text x="132" y="221" textAnchor="middle">S.2 tablet</text>
        </g>
        <g className="sync-node sync-node--device sync-node--center">
          <rect x="220" y="236" width="120" height="78" rx="16" />
          <text x="280" y="271" textAnchor="middle">Exam mode</text>
        </g>
        <g className="sync-node sync-node--device sync-node--right">
          <rect x="368" y="186" width="120" height="78" rx="16" />
          <text x="428" y="221" textAnchor="middle">S.4 phone</text>
        </g>
        <path className="sync-path" d="M280 96V148M280 148C280 168 204 168 132 186M280 148C280 168 372 168 428 186M280 148C280 188 300 204 280 236" />
        <circle className="sync-pulse sync-pulse--one" cx="280" cy="118" r="10" />
        <circle className="sync-pulse sync-pulse--two" cx="204" cy="168" r="8" />
        <circle className="sync-pulse sync-pulse--three" cx="372" cy="168" r="8" />
      </svg>
    </div>
  );
}

function LandingPage() {
  useBodyClass('landing-page');
  useDocumentTitle('EduGuard system — Offline-First Android Policy Enforcement');

  const formRef = React.useRef(null);
  const statusRef = React.useRef(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (statusRef.current) {
        statusRef.current.textContent = '';
      }
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = formRef.current;
    const status = statusRef.current;
    if (!form || !status || submitting) return;

    const fields = Array.from(form.elements).filter((element) => {
      return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
    });

    let firstInvalid = null;
    fields.forEach((field) => {
      if (!field.checkValidity()) {
        field.setAttribute('aria-invalid', 'true');
        if (!firstInvalid) firstInvalid = field;
      } else {
        field.removeAttribute('aria-invalid');
      }
    });

    if (firstInvalid) {
      status.textContent = 'Please complete the required fields before submitting.';
      firstInvalid.focus();
      return;
    }

    setSubmitting(true);
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting…';
    }

    status.textContent = 'Request submitted successfully. We will contact you soon.';
    form.reset();

    window.setTimeout(() => {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit request';
      }
      setSubmitting(false);
    }, 1200);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <LandingHeader />

      <main id="main-content">
        <section className="hero section">
          <div className="container hero__grid">
            <div className="hero__copy">
              <span className="section-label">Ugandan secondary schools</span>
              <h1>Offline-first Android policy enforcement for schools that cannot depend on the internet.</h1>
              <p className="hero__lead">
                EduGuard system helps Super Admin, ICT Teacher, and Class Teacher roles enforce school device policy with
                AES-256 encryption, RSA-2048 signatures, SHA-256 hash-chained audit logs, RBAC, and LAN-based sync.
              </p>

              <div className="hero__actions">
                <a className="btn btn-primary btn-lg" href="#demo-request">Request a demo</a>
                <Link className="btn btn-outline btn-lg" to="/dashboard">Open dashboard</Link>
              </div>

              <ul className="hero__meta" aria-label="Project highlights">
                <li><strong>Offline-first</strong><span>0kb internet dependency</span></li>
                <li><strong>LAN sync</strong><span>Local Wi-Fi or USB OTG</span></li>
                <li><strong>Uganda-ready</strong><span>S.1–S.6 and UNEB aligned</span></li>
              </ul>

              <div className="hero__callout">
                <strong>Forensics-ready</strong>
                <p>Every action is logged with a verifiable hash chain for integrity and auditability.</p>
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section className="stats-banner" aria-label="Prototype statistics">
          <div className="container stats-banner__grid">
            <CountUpStat target={500} label="Devices supported" />
            <CountUpStat target={0} label="kb internet needed" />
            <CountUpStat target={10} label="Minute setup window" />
            <CountUpStat target={100} label="% open source stack" />
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="container">
            <SectionHeading eyebrow="How it works" title="Three steps from enrollment to policy enforcement." />
            <div className="steps-grid">
              <article className="step-card">
                <span className="step-card__num">01</span>
                <h3>Enroll devices</h3>
                <p>Scan a single-use QR code to register a school-owned Android device into the trusted device list.</p>
              </article>
              <article className="step-card">
                <span className="step-card__num">02</span>
                <h3>Assign policy</h3>
                <p>Apply app whitelists, session schedules, and exam kiosk controls based on class group and school context.</p>
              </article>
              <article className="step-card">
                <span className="step-card__num">03</span>
                <h3>Sync locally</h3>
                <p>Push policy changes over a local Wi-Fi network or USB OTG when internet access is unavailable.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="security-features">
          <div className="container">
            <SectionHeading eyebrow="Security features" title="Controls designed for confidentiality, integrity, and availability." />
            <div className="feature-grid">
              <article className="feature-card"><h3>RBAC</h3><p>Super Admin, ICT Teacher, and Class Teacher access scopes.</p><span className="chip">Least privilege</span></article>
              <article className="feature-card"><h3>AES-256</h3><p>Protects policy and device data at rest and in transit.</p><span className="chip">Encryption</span></article>
              <article className="feature-card"><h3>RSA-2048</h3><p>Signs policy bundles before they are accepted by devices.</p><span className="chip">Authenticity</span></article>
              <article className="feature-card"><h3>SHA-256 logs</h3><p>Creates a tamper-evident audit chain for forensic review.</p><span className="chip">Integrity</span></article>
              <article className="feature-card"><h3>Offline-first sync</h3><p>Keeps the system usable even when connectivity drops out.</p><span className="chip">Availability</span></article>
              <article className="feature-card"><h3>Policy alerts</h3><p>Flags violations immediately with evidence-ready records.</p><span className="chip">Monitoring</span></article>
            </div>
          </div>
        </section>

        <section className="section section--triad" id="cia-triad">
          <div className="container">
            <SectionHeading eyebrow="CIA triad architecture" title="Hover the pillars to reveal how EduGuard protects data." />
            <div className="triad-grid">
              <article className="triad-card">
                <h3>Confidentiality</h3>
                <p className="triad-card__hidden">AES-256 and role-based access limit who can view policy data.</p>
              </article>
              <article className="triad-card">
                <h3>Integrity</h3>
                <p className="triad-card__hidden">RSA signatures and SHA-256 hash chaining detect tampering.</p>
              </article>
              <article className="triad-card">
                <h3>Availability</h3>
                <p className="triad-card__hidden">Offline-first operation keeps devices managed on a local LAN.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="why-eduguard">
          <div className="container">
            <SectionHeading eyebrow="Why EduGuard" title="A context-based prototype built for Ugandan schools." />
            <div className="why-grid">
              <article className="why-card"><h3>Designed for low-connectivity schools</h3><p>Works on a laptop or desktop as the local server, without relying on cloud access.</p></article>
              <article className="why-card"><h3>Built around school roles</h3><p>Supports Super Admin, ICT Teacher, and Class Teacher permissions in that order.</p></article>
              <article className="why-card"><h3>Aligned with exam realities</h3><p>Supports S.1–S.6 school structures and UNEB-style exam lockdown scenarios.</p></article>
              <article className="why-card"><h3>Forensics-ready</h3><p>Every action is traceable, timestamped, and exportable for review.</p></article>
            </div>
          </div>
        </section>

        <section className="section academic-box">
          <div className="container academic-box__inner">
            <div>
              <span className="section-label">Academic context</span>
              <h2>Final year Computer Security &amp; Forensics proof of concept.</h2>
              <p>EduGuard system demonstrates how Android Device Policy Controller (DPC) workflows can be adapted to Ugandan secondary school constraints.</p>
            </div>
            <div className="tag-cloud" aria-label="Technology stack">
              <span className="chip">HTML5</span>
              <span className="chip">CSS3</span>
              <span className="chip">JavaScript</span>
              <span className="chip">React-ready</span>
              <span className="chip">Vite</span>
              <span className="chip">LAN sync</span>
            </div>
          </div>
        </section>

        <section className="section" id="demo-request">
          <div className="container demo-grid">
            <div>
              <span className="section-label">Demo request</span>
              <h2>Request a prototype walkthrough.</h2>
              <p>Send school, role, and contact details. The form validates locally and shows a success state on submission.</p>
              <ul className="contact-list">
                <li><strong>Location:</strong> Kampala, Uganda</li>
                <li><strong>Email:</strong> demo@eduguard-system.ug</li>
                <li><strong>Support:</strong> GitHub / docs / school LAN setup</li>
              </ul>
            </div>

            <form className="demo-form" ref={formRef} onSubmit={handleSubmit} noValidate>
              <label>
                Full name
                <input type="text" name="fullName" required minLength={3} autoComplete="name" />
              </label>
              <label>
                School email
                <input type="email" name="email" required autoComplete="email" />
              </label>
              <label>
                Role
                <select name="role" required defaultValue="">
                  <option value="">Select role</option>
                  <option>Super Admin</option>
                  <option>ICT Teacher</option>
                  <option>Class Teacher</option>
                </select>
              </label>
              <label>
                School name
                <input type="text" name="school" required minLength={3} />
              </label>
              <label className="demo-form__full">
                Message
                <textarea name="message" rows={4} required minLength={10} placeholder="Tell us your device count and deployment timeline" />
              </label>

              <div className="demo-form__full demo-form__footer">
                <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>Submit request</button>
                <p className="form-status" id="form-status" ref={statusRef} aria-live="polite" />
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container footer-grid">
          <div>
            <img src={logoUrl} alt="EduGuard system" className="footer-logo" />
            <p>Offline-first policy enforcement for educational environments in Uganda.</p>
          </div>
          <div>
            <h3>Product</h3>
            <a href="#how-it-works">How it works</a>
            <a href="#security-features">Security</a>
            <a href="#demo-request">Demo request</a>
          </div>
          <div>
            <h3>Project</h3>
            <a href="#cia-triad">CIA triad</a>
            <a href="#why-eduguard">Why EduGuard</a>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div>
            <h3>Support</h3>
            <Link to="/login">Admin login</Link>
            <Link to="/enrollment">Device enrollment</Link>
            <span className="chip footer-badge">MIT-style academic prototype</span>
          </div>
        </div>
        <div className="container footer-bottom">
          <small>© 2026 EduGuard system. Bachelor of Science in Computer Security and Forensics.</small>
          <small>Uganda context • Offline-first • LAN sync</small>
        </div>
      </footer>
    </>
  );
}

LandingPage.propTypes = {};

export default LandingPage;
