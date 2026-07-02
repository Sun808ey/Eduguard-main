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
    <article className="stat-card flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center shadow-lg shadow-black/20 backdrop-blur">
      <strong ref={ref} className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{value}</strong>
      <span className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</span>
    </article>
  );
}

function LandingHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className={`landing-header sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl ${menuOpen ? 'is-open' : ''}`} id="top">
      <div className="container mx-auto flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8" role="navigation" aria-label="Primary">
        <LogoBrand to="/" className="brand" />

        <button
          className="nav-toggle btn btn-ghost inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 lg:hidden"
          type="button"
          aria-label="Open navigation"
          aria-expanded={menuOpen ? 'true' : 'false'}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <nav className={`landing-menu ${menuOpen ? 'flex' : 'hidden'} absolute left-0 top-full w-full flex-col gap-2 border-b border-white/10 bg-slate-950 px-4 py-4 lg:static lg:flex lg:w-auto lg:flex-row lg:items-center lg:justify-center lg:flex-1 lg:border-0 lg:bg-transparent lg:p-0`} data-nav-menu>
          <a className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href="#security-features" onClick={() => setMenuOpen(false)}>Security</a>
          <a className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href="#cia-triad" onClick={() => setMenuOpen(false)}>CIA Triad</a>
          <a className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href="#why-eduguard" onClick={() => setMenuOpen(false)}>Why EduGuard</a>
          <a className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white" href="#demo-request" onClick={() => setMenuOpen(false)}>Demo request</a>
        </nav>

        <div className="landing-actions hidden items-center gap-3 lg:flex">
          <Link className="btn btn-outline inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" to="/login">Admin Login</Link>
          <a className="btn btn-primary inline-flex items-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" href="#demo-request">Request Demo</a>
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
      <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-slate-950" href="#main-content">Skip to content</a>
      <LandingHeader />

      <main id="main-content" className="bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_45%),linear-gradient(180deg,#020617_0%,#0b1220_100%)] text-slate-100">
        <section className="hero section px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pt-16">
          <div className="container mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="hero__copy space-y-6">
              <span className="section-label inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Ugandan secondary schools</span>
              <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">Offline-first Android policy enforcement for schools that cannot depend on the internet.</h1>
              <p className="hero__lead max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                EduGuard system helps Super Admin, ICT Teacher, and Class Teacher roles enforce school device policy with
                AES-256 encryption, RSA-2048 signatures, SHA-256 hash-chained audit logs, RBAC, and LAN-based sync.
              </p>

              <div className="hero__actions flex flex-wrap gap-3">
                <a className="btn btn-primary btn-lg inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" href="#demo-request">Request a demo</a>
                <Link className="btn btn-outline btn-lg inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" to="/dashboard">Open dashboard</Link>
              </div>

              <ul className="hero__meta grid gap-3 sm:grid-cols-3" aria-label="Project highlights">
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"><strong className="block text-sm font-semibold text-white">Offline-first</strong><span className="mt-1 block text-sm text-slate-400">0kb internet dependency</span></li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"><strong className="block text-sm font-semibold text-white">LAN sync</strong><span className="mt-1 block text-sm text-slate-400">Local Wi-Fi or USB OTG</span></li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"><strong className="block text-sm font-semibold text-white">Uganda-ready</strong><span className="mt-1 block text-sm text-slate-400">S.1–S.6 and UNEB aligned</span></li>
              </ul>

              <div className="hero__callout rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-lg shadow-cyan-950/10">
                <strong className="block text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Forensics-ready</strong>
                <p className="mt-2 text-sm leading-7 text-slate-300">Every action is logged with a verifiable hash chain for integrity and auditability.</p>
              </div>
            </div>

            <HeroVisual />
          </div>
        </section>

        <section className="stats-banner px-4 pb-6 sm:px-6 lg:px-8" aria-label="Prototype statistics">
          <div className="container stats-banner__grid mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CountUpStat target={500} label="Devices supported" />
            <CountUpStat target={0} label="kb internet needed" />
            <CountUpStat target={10} label="Minute setup window" />
            <CountUpStat target={100} label="% open source stack" />
          </div>
        </section>

        <section className="section px-4 py-12 sm:px-6 lg:px-8" id="how-it-works">
          <div className="container mx-auto max-w-7xl">
            <SectionHeading eyebrow="How it works" title="Three steps from enrollment to policy enforcement." />
            <div className="steps-grid mt-8 grid gap-4 md:grid-cols-3">
              <article className="step-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
                <span className="step-card__num inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-extrabold text-cyan-200">01</span>
                <h3>Enroll devices</h3>
                <p>Scan a single-use QR code to register a school-owned Android device into the trusted device list.</p>
              </article>
              <article className="step-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
                <span className="step-card__num inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-extrabold text-cyan-200">02</span>
                <h3>Assign policy</h3>
                <p>Apply app whitelists, session schedules, and exam kiosk controls based on class group and school context.</p>
              </article>
              <article className="step-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
                <span className="step-card__num inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-sm font-extrabold text-cyan-200">03</span>
                <h3>Sync locally</h3>
                <p>Push policy changes over a local Wi-Fi network or USB OTG when internet access is unavailable.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section px-4 py-12 sm:px-6 lg:px-8" id="security-features">
          <div className="container mx-auto max-w-7xl">
            <SectionHeading eyebrow="Security features" title="Controls designed for confidentiality, integrity, and availability." />
            <div className="feature-grid mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">RBAC</h3><p className="mt-2 text-sm leading-7 text-slate-400">Super Admin, ICT Teacher, and Class Teacher access scopes.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Least privilege</span></article>
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">AES-256</h3><p className="mt-2 text-sm leading-7 text-slate-400">Protects policy and device data at rest and in transit.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Encryption</span></article>
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">RSA-2048</h3><p className="mt-2 text-sm leading-7 text-slate-400">Signs policy bundles before they are accepted by devices.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Authenticity</span></article>
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">SHA-256 logs</h3><p className="mt-2 text-sm leading-7 text-slate-400">Creates a tamper-evident audit chain for forensic review.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Integrity</span></article>
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Offline-first sync</h3><p className="mt-2 text-sm leading-7 text-slate-400">Keeps the system usable even when connectivity drops out.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Availability</span></article>
              <article className="feature-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Policy alerts</h3><p className="mt-2 text-sm leading-7 text-slate-400">Flags violations immediately with evidence-ready records.</p><span className="chip mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Monitoring</span></article>
            </div>
          </div>
        </section>

        <section className="section section--triad px-4 py-12 sm:px-6 lg:px-8" id="cia-triad">
          <div className="container mx-auto max-w-7xl">
            <SectionHeading eyebrow="CIA triad architecture" title="Hover the pillars to reveal how EduGuard protects data." />
            <div className="triad-grid mt-8 grid gap-4 md:grid-cols-3">
              <article className="triad-card group rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-400/30">
                <h3 className="text-lg font-semibold text-white">Confidentiality</h3>
                <p className="triad-card__hidden mt-3 text-sm leading-7 text-slate-400 opacity-0 transition duration-200 group-hover:opacity-100">AES-256 and role-based access limit who can view policy data.</p>
              </article>
              <article className="triad-card group rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-400/30">
                <h3 className="text-lg font-semibold text-white">Integrity</h3>
                <p className="triad-card__hidden mt-3 text-sm leading-7 text-slate-400 opacity-0 transition duration-200 group-hover:opacity-100">RSA signatures and SHA-256 hash chaining detect tampering.</p>
              </article>
              <article className="triad-card group rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-400/30">
                <h3 className="text-lg font-semibold text-white">Availability</h3>
                <p className="triad-card__hidden mt-3 text-sm leading-7 text-slate-400 opacity-0 transition duration-200 group-hover:opacity-100">Offline-first operation keeps devices managed on a local LAN.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section px-4 py-12 sm:px-6 lg:px-8" id="why-eduguard">
          <div className="container mx-auto max-w-7xl">
            <SectionHeading eyebrow="Why EduGuard" title="A context-based prototype built for Ugandan schools." />
            <div className="why-grid mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="why-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Designed for low-connectivity schools</h3><p className="mt-2 text-sm leading-7 text-slate-400">Works on a laptop or desktop as the local server, without relying on cloud access.</p></article>
              <article className="why-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Built around school roles</h3><p className="mt-2 text-sm leading-7 text-slate-400">Supports Super Admin, ICT Teacher, and Class Teacher permissions in that order.</p></article>
              <article className="why-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Aligned with exam realities</h3><p className="mt-2 text-sm leading-7 text-slate-400">Supports S.1–S.6 school structures and UNEB-style exam lockdown scenarios.</p></article>
              <article className="why-card rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"><h3 className="text-lg font-semibold text-white">Forensics-ready</h3><p className="mt-2 text-sm leading-7 text-slate-400">Every action is traceable, timestamped, and exportable for review.</p></article>
            </div>
          </div>
        </section>

        <section className="section academic-box px-4 py-12 sm:px-6 lg:px-8">
          <div className="container academic-box__inner mx-auto grid max-w-7xl gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 via-cyan-400/10 to-emerald-400/10 p-6 shadow-lg shadow-black/20 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div>
              <span className="section-label inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Academic context</span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Final year Computer Security &amp; Forensics proof of concept.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">EduGuard system demonstrates how Android Device Policy Controller (DPC) workflows can be adapted to Ugandan secondary school constraints.</p>
            </div>
            <div className="tag-cloud flex flex-wrap gap-2" aria-label="Technology stack">
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">HTML5</span>
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">CSS3</span>
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">JavaScript</span>
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">React-ready</span>
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Vite</span>
              <span className="chip inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">LAN sync</span>
            </div>
          </div>
        </section>

        <section className="section px-4 py-12 sm:px-6 lg:px-8" id="demo-request">
          <div className="container demo-grid mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="section-label inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Demo request</span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">Request a prototype walkthrough.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Send school, role, and contact details. The form validates locally and shows a success state on submission.</p>
              <ul className="contact-list mt-6 grid gap-2 text-sm text-slate-300">
                <li><strong>Location:</strong> Kampala, Uganda</li>
                <li><strong>Email:</strong> demo@eduguard-system.ug</li>
                <li><strong>Support:</strong> GitHub / docs / school LAN setup</li>
              </ul>
            </div>

            <form className="demo-form grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 md:grid-cols-2" ref={formRef} onSubmit={handleSubmit} noValidate>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Full name
                <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="text" name="fullName" required minLength={3} autoComplete="name" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                School email
                <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="email" name="email" required autoComplete="email" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Role
                <select className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" name="role" required defaultValue="">
                  <option value="">Select role</option>
                  <option>Super Admin</option>
                  <option>ICT Teacher</option>
                  <option>Class Teacher</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                School name
                <input className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" type="text" name="school" required minLength={3} />
              </label>
              <label className="demo-form__full grid gap-2 text-sm font-medium text-slate-200 md:col-span-2">
                Message
                <textarea className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" name="message" rows={4} required minLength={10} placeholder="Tell us your device count and deployment timeline" />
              </label>

              <div className="demo-form__full demo-form__footer flex flex-col gap-4 md:col-span-2 md:flex-row md:items-center">
                <button className="btn btn-primary btn-lg inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70" type="submit" disabled={submitting}>Submit request</button>
                <p className="form-status min-h-5 text-sm text-slate-400" id="form-status" ref={statusRef} aria-live="polite" />
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="landing-footer border-t border-white/10 bg-slate-950/80 px-4 py-10 sm:px-6 lg:px-8">
        <div className="container footer-grid mx-auto grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-[2fr_repeat(3,minmax(0,1fr))]">
          <div>
            <img src={logoUrl} alt="EduGuard system" className="footer-logo h-14 w-14 rounded-2xl shadow-lg shadow-black/20 ring-1 ring-white/10" />
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">Offline-first policy enforcement for educational environments in Uganda.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Product</h3>
            <a className="mt-4 block text-sm text-slate-400 transition hover:text-white" href="#how-it-works">How it works</a>
            <a className="mt-2 block text-sm text-slate-400 transition hover:text-white" href="#security-features">Security</a>
            <a className="mt-2 block text-sm text-slate-400 transition hover:text-white" href="#demo-request">Demo request</a>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Project</h3>
            <a className="mt-4 block text-sm text-slate-400 transition hover:text-white" href="#cia-triad">CIA triad</a>
            <a className="mt-2 block text-sm text-slate-400 transition hover:text-white" href="#why-eduguard">Why EduGuard</a>
            <Link className="mt-2 block text-sm text-slate-400 transition hover:text-white" to="/dashboard">Dashboard</Link>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white">Support</h3>
            <Link className="mt-4 block text-sm text-slate-400 transition hover:text-white" to="/login">Admin login</Link>
            <Link className="mt-2 block text-sm text-slate-400 transition hover:text-white" to="/enrollment">Device enrollment</Link>
            <span className="chip footer-badge mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">MIT-style academic prototype</span>
          </div>
        </div>
        <div className="container footer-bottom mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <small>© 2026 EduGuard system. Bachelor of Science in Computer Security and Forensics.</small>
          <small>Uganda context • Offline-first • LAN sync</small>
        </div>
      </footer>
    </>
  );
}

LandingPage.propTypes = {};

export default LandingPage;
