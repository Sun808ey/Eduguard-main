import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import QRCode from 'qrcode';
import { logoUrl } from '../components/ui.jsx';
import { useBodyClass } from '../hooks/useBodyClass.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import '../styles/enrollment.css';

const CLASS_GROUPS = ['S.1 Science', 'S.2 Arts', 'S.3 Commerce', 'S.4 Science', 'S.5 PCM', 'S.6 HGE'];

function randomSegment(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function createSignedToken(group, passcode) {
  const payload = {
    deviceClassGroup: group,
    issuedAt: new Date().toISOString(),
    expiresInSeconds: 60,
    nonce: randomSegment(10),
    signature: `mock-signature-${randomSegment(16)}`,
    adminProof: `***${String(passcode).slice(-2)}`,
  };

  return btoa(JSON.stringify(payload));
}

function EnrollmentPage() {
  useBodyClass('enrollment-page');
  useDocumentTitle('EduGuard system — Enrollment');

  const [classGroup, setClassGroup] = React.useState(CLASS_GROUPS[0]);
  const [adminPasscode, setAdminPasscode] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [token, setToken] = React.useState('');
  const [qrSrc, setQrSrc] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState(0);
  const [countdown, setCountdown] = React.useState(60);
  const [stage, setStage] = React.useState(1);
  const [pending, setPending] = React.useState([]);
  const [toastMessages, setToastMessages] = React.useState([]);
  const [stepActive, setStepActive] = React.useState(1);
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);
  const regenerateRef = React.useRef(null);

  const showToast = (message) => {
    setToastMessages((items) => [...items, { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, message }]);
    window.setTimeout(() => {
      setToastMessages((items) => items.slice(1));
    }, 2500);
  };

  const updateStage = (value) => {
    setStage(value);
    setStepActive(value);
  };

  const generateToken = async (silent = false) => {
    if (!adminPasscode.trim()) {
      setFormError('Enter the admin passcode before generating the QR code.');
      return;
    }

    const nextToken = createSignedToken(classGroup, adminPasscode.trim());
    const nextExpires = Date.now() + 60000;

    setFormError('');
    setToken(nextToken);
    setExpiresAt(nextExpires);
    updateStage(2);

    try {
      const dataUrl = await QRCode.toDataURL(nextToken, {
        width: 240,
        margin: 1,
        color: {
          dark: '#07111A',
          light: '#ffffff',
        },
      });
      setQrSrc(dataUrl);
    } catch {
      setQrSrc('');
    }

    setCountdown(60);

    if (!silent) {
      showToast('QR code generated');
    }
  };

  regenerateRef.current = generateToken;

  React.useEffect(() => {
    if (!token) return undefined;

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        regenerateRef.current?.(true);
      }
    }, 1000);

    timeoutRef.current = window.setTimeout(() => {
      regenerateRef.current?.(true);
    }, 60000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [token, expiresAt]);

  React.useEffect(() => {
    updateStage(1);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (!token) return;
    setStepActive(2);
  }, [token]);

  const finalizeEnrollment = () => {
    if (!token) return;
    setPending((items) => [...items, { group: classGroup, token: `${token.slice(0, 12)}…` }]);
    updateStage(3);
    showToast('Device added to pending list');
  };

  return (
    <>
      <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-slate-950" href="#main-content">Skip to content</a>
      <div className="wizard-toast pointer-events-none fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2" id="toastRoot" aria-live="polite" aria-atomic="true">
        {toastMessages.map((toast) => <div key={toast.id} className="toast pointer-events-auto rounded-2xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 shadow-xl shadow-black/30 backdrop-blur">{toast.message}</div>)}
      </div>

      <main className="enrollment-shell min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(6,214,160,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(35,110,255,0.12),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8" id="main-content">
        <div className="enrollment-topbar mx-auto mb-6 flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link className="enrollment-brand inline-flex items-center gap-3 text-inherit no-underline" to="/" aria-label="EduGuard system home">
            <img className="h-10 w-10 rounded-2xl shadow-lg shadow-black/20 ring-1 ring-white/10" src={logoUrl} alt="EduGuard system" />
            <span className="text-sm text-slate-400">
              <strong className="block text-base font-semibold leading-none text-white">EduGuard</strong>
              <small className="mt-1 block uppercase tracking-[0.18em]">Enrollment wizard</small>
            </span>
          </Link>
          <Link className="btn btn-outline inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10" to="/dashboard">Back to dashboard</Link>
        </div>

        <section className="enrollment-panel mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl" aria-labelledby="enrollmentTitle">
          <div className="enrollment-panel__header px-5 pb-0 pt-5 sm:px-6 lg:px-8">
            <span className="enrollment-eyebrow inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Step 15 · QR Enrollment</span>
            <h1 id="enrollmentTitle" className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">Enroll a device with a single-use QR code.</h1>
            <p className="enrollment-panel__lead mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              The wizard binds a school device class group and admin passcode to a short-lived signed token so the device can appear in the pending list after confirmation.
            </p>
          </div>

          <div className="enrollment-content grid gap-5 p-5 sm:p-6 lg:p-8">
            <div className="wizard-steps grid gap-4 md:grid-cols-3" aria-label="Enrollment steps">
              <article className={`wizard-step rounded-2xl border p-4 shadow-lg shadow-black/20 transition ${stepActive === 1 ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`} data-step-card="1">
                <span className="wizard-step__num mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">1</span>
                <h2 className="text-lg font-semibold text-white">Enter details</h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">Choose the device class group and enter the admin passcode.</p>
              </article>
              <article className={`wizard-step rounded-2xl border p-4 shadow-lg shadow-black/20 transition ${stepActive === 2 ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`} data-step-card="2">
                <span className="wizard-step__num mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">2</span>
                <h2 className="text-lg font-semibold text-white">Scan QR</h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">Generate a signed token and display it as a QR code for the device.</p>
              </article>
              <article className={`wizard-step rounded-2xl border p-4 shadow-lg shadow-black/20 transition ${stepActive === 3 ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/10 bg-white/5'}`} data-step-card="3">
                <span className="wizard-step__num mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">3</span>
                <h2 className="text-lg font-semibold text-white">Confirm</h2>
                <p className="mt-2 text-sm leading-7 text-slate-400">Finish enrollment and add the device to the pending list.</p>
              </article>
            </div>

            <section className="wizard-stage rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-black/20 sm:p-6" id="wizardStage">
              <div className="wizard-stage__title mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 id="stageTitle" className="text-2xl font-semibold tracking-tight text-white">{stage === 1 ? 'Step 1: Device details' : stage === 2 ? 'Step 2: Generated QR code' : 'Step 3: Confirmation'}</h2>
                  <p id="stageCopy" className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                    {stage === 1
                      ? 'Enter the device class group and the admin passcode to generate a QR enrollment token.'
                      : stage === 2
                        ? 'Scan the generated QR code on the device to complete enrollment.'
                        : 'The device is now in the pending list and ready for policy sync.'}
                  </p>
                </div>
                <div className="countdown inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200" id="countdownWrap">Expires in <span className="ml-2 font-semibold text-cyan-200" id="countdownValue">{countdown}s</span></div>
              </div>

              <div className={`wizard-form grid gap-4 ${stage === 1 ? '' : 'hidden'}`} id="stepOneForm">
                <div className="field grid gap-2">
                  <label className="text-sm font-semibold text-slate-200" htmlFor="classGroup">Device class group</label>
                  <select className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400/60 focus:bg-slate-950" id="classGroup" value={classGroup} onChange={(event) => setClassGroup(event.target.value)}>
                    {CLASS_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>
                <div className="field grid gap-2">
                  <label className="text-sm font-semibold text-slate-200" htmlFor="adminPasscode">Admin passcode</label>
                  <input className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-slate-950" id="adminPasscode" type="password" autoComplete="current-password" placeholder="Enter admin passcode" value={adminPasscode} onChange={(event) => setAdminPasscode(event.target.value)} />
                  <div className="field-error min-h-5 text-sm text-rose-300" id="formError">{formError}</div>
                </div>
                <div className="step-actions flex flex-wrap gap-3 pt-1">
                  <button className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" id="generateButton" type="button" onClick={() => generateToken(false)}>Generate QR Code</button>
                </div>
              </div>

              <div className={`qr-wrap grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] ${stage === 2 ? '' : 'hidden'}`} id="qrStep">
                <div className="qr-card rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20">
                  <div className="qr-card__frame grid aspect-square place-items-center overflow-hidden rounded-2xl bg-white p-4" id="qrCode" aria-label="Generated QR code">
                    {qrSrc ? <img src={qrSrc} alt="Generated QR code" /> : <span>QR library failed to load.</span>}
                  </div>
                </div>
                <div className="qr-meta grid gap-3">
                  <div className="note-box rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">This QR code expires in 60 seconds and is single-use.</div>
                  <div className="helper-text text-sm text-slate-400">Signed enrollment token</div>
                  <code className="block break-words rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-slate-100" id="tokenOutput">{token}</code>
                  <div className="step-actions flex flex-wrap gap-3 pt-1">
                    <button className="btn btn-outline inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10" id="regenerateButton" type="button" onClick={() => generateToken(false)}>Regenerate QR</button>
                    <button className="btn btn-primary inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" id="confirmButton" type="button" onClick={finalizeEnrollment}>Mark Device as Pending</button>
                  </div>
                </div>
              </div>

              <div className={stage === 3 ? '' : 'hidden'} id="stepThreeState">
                <div className="note-box note-box--spaced rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">Enrollment confirmed. The device now appears in the pending list below.</div>
                <div className="pending-list mt-4 grid gap-3" id="pendingList">
                  {pending.slice().reverse().map((item) => (
                    <article className="pending-item flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg shadow-black/20" key={`${item.group}-${item.token}`}>
                      <div>
                        <strong className="block text-sm font-semibold text-white">{item.group}</strong>
                        <span className="mt-1 block text-xs text-slate-400">Token used: {item.token}</span>
                      </div>
                      <span className="badge badge--pending inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">Pending approval</span>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

EnrollmentPage.propTypes = {};

export default EnrollmentPage;
